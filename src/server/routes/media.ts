import express, { Express, Request, Response } from "express";
import path from "path";
import { db as pgDb } from "../db";
import { loadDB } from "../state";
import { logMessage } from "../utils/logger";
import { saveDB } from "../services/database";
import { requirePermission } from "../middleware/auth";
import { optimizeImageToWebp } from "../utils/image";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

const MAX_UPLOAD_FILES = 20;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

// [امنیتی] جلوگیری از Path Traversal: دسته‌بندی فقط حروف/اعداد/خط تیره/زیرخط
function sanitizeCategory(category: string): string {
  const cleaned = String(category || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  return cleaned || "general";
}

// پسوند تصادفی برای تضمین یونیک بودن نام فایل حتی در آپلودهای هم‌زمان
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function mimeFromExt(ext: string): string {
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

const MAGIC_BYTES: Record<string, [number, number[]][]> = {
  "image/jpeg": [[0, [0xFF, 0xD8, 0xFF]]],
  "image/png": [[0, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]]],
  "image/gif": [[0, [0x47, 0x49, 0x46, 0x38]]],
  "image/webp": [[0, [0x52, 0x49, 0x46, 0x46]]],
  "image/svg+xml": [[0, [0x3C, 0x73, 0x76, 0x67]], [0, [0x3C, 0x3F, 0x78, 0x6D, 0x6C]]],
};

function detectMimeFromContent(buffer: Buffer): string | null {
  for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const [offset, bytes] of signatures) {
      if (offset + bytes.length > buffer.length) continue;
      const matches = bytes.every((b, i) => buffer[offset + i] === b);
      if (matches) {
        if (mime === "image/webp") {
          if (buffer.length >= 12 && buffer.slice(8, 12).toString() === "WEBP") return mime;
          continue;
        }
        return mime;
      }
    }
  }
  if (buffer.length > 0 && buffer[0] === 0x3C) {
    const str = buffer.slice(0, 500).toString("utf8").toLowerCase();
    if (str.includes("<svg") || str.includes("<?xml") || str.includes("<!doctype")) {
      return "image/svg+xml";
    }
  }
  return null;
}

function validateUploadedFile(fileName: string, buffer: Buffer): string | null {
  const ext = path.extname(fileName).toLowerCase();
  const extMime: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };
  const expectedMime = extMime[ext];
  if (!expectedMime) return "فرمت فایل پشتیبانی نمی‌شود. فقط jpg, png, gif, webp, svg مجاز است.";

  const detectedMime = detectMimeFromContent(buffer);
  if (!detectedMime || detectedMime !== expectedMime) {
    return "محتوای فایل با پسوند آن مطابقت ندارد. فایل معتبر نیست.";
  }
  return null;
}

export function registerMediaRoutes(app: Express) {
  app.get("/api/media", (req, res) => {
    try {
      const currentDB = loadDB();
      if (!currentDB.media_files) currentDB.media_files = [];

      let list = [...currentDB.media_files];

      const { category, q, page = 1, limit = 10 } = req.query;
      if (category && typeof category === "string" && category !== "all" && category !== "") {
        list = list.filter(item => item.category === category);
      }

      if (q && typeof q === "string" && q.trim() !== "") {
        const query = q.toLowerCase().trim();
        list = list.filter(item =>
          (item.title && item.title.toLowerCase().includes(query)) ||
          (item.file_name && item.file_name.toLowerCase().includes(query))
        );
      }

      const totalCount = list.length;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;
      const offset = (pageNum - 1) * limitNum;
      const paginatedList = list.slice(offset, offset + limitNum);

      res.json({
        success: true,
        data: paginatedList,
        totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      });
    } catch (error: any) {
      console.error("Error in GET /api/media:", error);
      res.status(500).json({ success: false, message: "خطا در دریافت لیست رسانه‌ها" });
    }
  });

  app.post("/api/media/upload", requirePermission("media"), async (req, res) => {
    try {
      const { title, fileName, fileData, category } = req.body;
      if (!fileName || !fileData) {
        return res.status(400).json({ success: false, message: "فایل و نام فایل الزامی است." });
      }

      const buffer = Buffer.from(fileData, "base64");
      const originalSize = buffer.length;

      if (originalSize > MAX_FILE_BYTES) {
        return res.status(400).json({ success: false, message: "حجم فایل بیش از حد مجاز است (حداکثر ۸ مگابایت)." });
      }

      const validationError = validateUploadedFile(fileName, buffer);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const optimized = await optimizeImageToWebp(buffer, fileName, mimeFromExt(path.extname(fileName).toLowerCase()), { category });
      const uploadBuffer = optimized.buffer;
      const mimeType = optimized.mimeType;
      const fileSize = uploadBuffer.length;
      if (optimized.converted) {
        logMessage("info", "general", `تبدیل خودکار تصویر به WebP انجام شد (${fileName} -> ${optimized.fileName}).`);
      }
      if (optimized.watermarked) {
        logMessage("info", "general", `واترمارک تب فوتبال روی تصویر اعمال شد (${optimized.fileName}).`);
      }

      const cleanFileName = optimized.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const safeCategory = sanitizeCategory(category);
      const uniquePath = `${safeCategory}/${Date.now()}_${randomSuffix()}_${cleanFileName}`;

      logMessage("info", "general", `در حال آپلود فایل به فضای محلی: ${uniquePath}`);

      const { data: uploadData, error: uploadError } = await pgDb.storage
        .from("media_assets")
        .upload(uniquePath, uploadBuffer, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadError) {
        logMessage("error", "general", `خطای آپلود در استوریج: ${uploadError.message}`);
        return res.status(500).json({ success: false, message: `خطا در آپلود استوریج: ${uploadError.message}` });
      }

      const { data: { publicUrl } } = pgDb.storage
        .from("media_assets")
        .getPublicUrl(uniquePath);

      const currentDB = loadDB();
      if (!currentDB.media_files) currentDB.media_files = [];

      const newRecord = {
        id: `media-${Date.now()}-${randomSuffix()}`,
        title: title || cleanFileName,
        file_name: cleanFileName,
        file_path: uniquePath,
        image_url: publicUrl,
        file_size: fileSize,
        mime_type: mimeType,
        category: safeCategory,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      currentDB.media_files.unshift(newRecord);
      await saveDB();

      res.json({ success: true, file: newRecord });
    } catch (error: any) {
      console.error("Error in POST /api/media/upload:", error);
      res.status(500).json({ success: false, message: "خطا در آپلود رسانه" });
    }
  });

  app.post("/api/media/upload-multiple", requirePermission("media"), async (req, res) => {
    try {
      const { title, category, files } = req.body;
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ success: false, message: "حداقل یک فایل برای آپلود انتخاب کنید." });
      }
      if (files.length > MAX_UPLOAD_FILES) {
        return res.status(400).json({ success: false, message: `حداکثر ${MAX_UPLOAD_FILES} فایل در هر بار آپلود مجاز است.` });
      }

      const safeCategory = sanitizeCategory(category);
      const currentDB = loadDB();
      if (!currentDB.media_files) currentDB.media_files = [];

      const uploadedFiles: any[] = [];
      const errors: { fileName: string; error: string }[] = [];
      let index = 0;

      for (const f of files) {
        const { fileName, fileData } = f || {};
        if (!fileName || !fileData) {
          errors.push({ fileName: fileName || "نامشخص", error: "فایل و نام فایل الزامی است." });
          continue;
        }

        const buffer = Buffer.from(fileData, "base64");
        const originalSize = buffer.length;

        if (originalSize > MAX_FILE_BYTES) {
          errors.push({ fileName, error: "حجم فایل بیش از حد مجاز است (حداکثر ۸ مگابایت)." });
          continue;
        }

        const validationError = validateUploadedFile(fileName, buffer);
        if (validationError) {
          errors.push({ fileName, error: validationError });
          continue;
        }

        const optimized = await optimizeImageToWebp(buffer, fileName, mimeFromExt(path.extname(fileName).toLowerCase()), { category });
        const uploadBuffer = optimized.buffer;
        const mimeType = optimized.mimeType;
        const fileSize = uploadBuffer.length;

        const cleanFileName = optimized.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const uniquePath = `${safeCategory}/${Date.now()}_${randomSuffix()}_${cleanFileName}`;

        const { data: uploadData, error: uploadError } = await pgDb.storage
          .from("media_assets")
          .upload(uniquePath, uploadBuffer, {
            contentType: mimeType,
            upsert: true
          });

        if (uploadError) {
          errors.push({ fileName, error: `خطا در آپلود استوریج: ${uploadError.message}` });
          continue;
        }

        const { data: { publicUrl } } = pgDb.storage
          .from("media_assets")
          .getPublicUrl(uniquePath);

        const newRecord = {
          id: `media-${Date.now()}-${index}-${randomSuffix()}`,
          title: title || cleanFileName,
          file_name: cleanFileName,
          file_path: uniquePath,
          image_url: publicUrl,
          file_size: fileSize,
          mime_type: mimeType,
          category: safeCategory,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        currentDB.media_files.unshift(newRecord);
        uploadedFiles.push(newRecord);
        index++;
      }

      if (uploadedFiles.length > 0) {
        await saveDB();
      }

      res.json({
        success: uploadedFiles.length > 0,
        files: uploadedFiles,
        errors,
        message: `آپلود انجام شد: ${uploadedFiles.length} فایل موفق${errors.length > 0 ? `، ${errors.length} فایل ناموفق` : ""}.`
      });
    } catch (error: any) {
      console.error("Error in POST /api/media/upload-multiple:", error);
      res.status(500).json({ success: false, message: "خطا در آپلود چندگانه رسانه" });
    }
  });

  app.put("/api/media/:id", requirePermission("media"), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, category } = req.body;
      const currentDB = loadDB();
      if (!currentDB.media_files) currentDB.media_files = [];

      const index = currentDB.media_files.findIndex((item: any) => item.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: "فایل رسانه‌ای یافت نشد." });
      }

      currentDB.media_files[index] = {
        ...currentDB.media_files[index],
        title: title || currentDB.media_files[index].title,
        category: category || currentDB.media_files[index].category,
        updated_at: new Date().toISOString()
      };

      await saveDB();
      res.json({ success: true, file: currentDB.media_files[index] });
    } catch (error: any) {
      console.error("Error in PUT /api/media/:id:", error);
      res.status(500).json({ success: false, message: "خطا در بروزرسانی رسانه" });
    }
  });

  app.delete("/api/media/:id", requirePermission("media"), async (req, res) => {
    try {
      const { id } = req.params;
      const currentDB = loadDB();
      if (!currentDB.media_files) currentDB.media_files = [];

      const item = currentDB.media_files.find((item: any) => item.id === id);
      if (!item) {
        return res.status(404).json({ success: false, message: "فایل رسانه‌ای یافت نشد." });
      }

      logMessage("info", "general", `حذف فایل از فضای محلی: ${item.file_path}`);

      const { error: deleteStorageError } = await pgDb.storage
        .from("media_assets")
        .remove([item.file_path]);

      if (deleteStorageError) {
        logMessage("warn", "general", `هشدار: خطای حذف از استوریج: ${deleteStorageError.message}`);
      }

      currentDB.media_files = currentDB.media_files.filter((item: any) => item.id !== id);
      await saveDB();

      res.json({ success: true, message: "فایل و رکورد با موفقیت حذف شدند." });
    } catch (error: any) {
      console.error("Error in DELETE /api/media/:id:", error);
      res.status(500).json({ success: false, message: "خطا در حذف رسانه" });
    }
  });

  app.post("/api/media/replace/:id", requirePermission("media"), async (req, res) => {
    try {
      const { id } = req.params;
      const { fileData, fileName } = req.body;
      if (!fileData || !fileName) {
        return res.status(400).json({ success: false, message: "فایل الزامی است." });
      }

      const currentDB = loadDB();
      if (!currentDB.media_files) currentDB.media_files = [];

      const index = currentDB.media_files.findIndex((item: any) => item.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: "رکورد رسانه یافت نشد." });
      }

      const item = currentDB.media_files[index];

      const buffer = Buffer.from(fileData, "base64");

      const validationError = validateUploadedFile(fileName, buffer);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const optimized = await optimizeImageToWebp(buffer, fileName, mimeFromExt(path.extname(fileName).toLowerCase()), { category: item.category });
      const uploadBuffer = optimized.buffer;
      const mimeType = optimized.mimeType;
      const fileSize = uploadBuffer.length;

      const oldPath = item.file_path;
      const oldExt = path.extname(oldPath).toLowerCase();
      const basePath = oldExt ? oldPath.slice(0, -oldExt.length) : oldPath;
      const newPath = mimeType === "image/webp" ? `${basePath}.webp` : oldPath;

      logMessage("info", "general", `در حال جایگزینی تصویر در استوریج: ${newPath}`);

      const { error: uploadError } = await pgDb.storage
        .from("media_assets")
        .upload(newPath, uploadBuffer, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadError) {
        logMessage("error", "general", `خطا در جایگزینی فایل در استوریج: ${uploadError.message}`);
        return res.status(500).json({ success: false, message: `خطا در آپلود استوریج: ${uploadError.message}` });
      }

      if (newPath !== oldPath) {
        const { error: removeError } = await pgDb.storage.from("media_assets").remove([oldPath]);
        if (removeError) {
          logMessage("warn", "general", `هشدار: حذف فایل قبلی ناموفق: ${removeError.message}`);
        }
      }

      const { data: { publicUrl } } = pgDb.storage
        .from("media_assets")
        .getPublicUrl(newPath);

      currentDB.media_files[index] = {
        ...item,
        file_name: optimized.fileName,
        file_path: newPath,
        image_url: publicUrl,
        file_size: fileSize,
        mime_type: mimeType,
        updated_at: new Date().toISOString()
      };

      await saveDB();
      res.json({ success: true, file: currentDB.media_files[index] });
    } catch (error: any) {
      console.error("Error in Replace POST /api/media/replace/:id:", error);
      res.status(500).json({ success: false, message: "خطا در جایگزینی تصویر" });
    }
  });

  app.post("/api/media/migrate", requirePermission("media"), async (req, res) => {
    try {
      const currentDB = loadDB();
      if (!currentDB.media_files) currentDB.media_files = [];

      logMessage("info", "general", "آغاز مهاجرت عمومی تصاویر خارجی به فضای محلی...");

      const migrations: { originalUrl: string; category: string; title: string; updateRefs: (newUrl: string) => void }[] = [];

      const isMigratableUrl = (url?: string): boolean => {
        if (!url) return false;
        const clean = url.trim().toLowerCase();
        if (!clean.startsWith("http")) return false;
        if (clean.includes("localhost") || clean.includes("127.0.0.1") || clean.includes("0.0.0.0")) return false;
        return true;
      };

      if (currentDB.news) {
        currentDB.news.forEach((item: any) => {
          if (isMigratableUrl(item.image)) {
            migrations.push({
              originalUrl: item.image,
              category: "news_image",
              title: item.title || "عکس خبر",
              updateRefs: (newUrl) => { item.image = newUrl; }
            });
          }
        });
      }

      if (currentDB.teams) {
        currentDB.teams.forEach((item: any) => {
          if (isMigratableUrl(item.logo)) {
            migrations.push({
              originalUrl: item.logo,
              category: "team_logo",
              title: `لوگوی ${item.name}`,
              updateRefs: (newUrl) => { item.logo = newUrl; }
            });
          }
          if (item.stats && isMigratableUrl(item.stats.logo)) {
            migrations.push({
              originalUrl: item.stats.logo,
              category: "team_logo",
              title: `لوگوی ${item.name}`,
              updateRefs: (newUrl) => { item.stats.logo = newUrl; }
            });
          }
        });
      }

      if (currentDB.players) {
        currentDB.players.forEach((item: any) => {
          if (isMigratableUrl(item.image)) {
            migrations.push({
              originalUrl: item.image,
              category: "player_photo",
              title: `عکس ${item.name}`,
              updateRefs: (newUrl) => { item.image = newUrl; }
            });
          }
        });
      }

      if (currentDB.transfers) {
        currentDB.transfers.forEach((item: any) => {
          if (isMigratableUrl(item.playerImage)) {
            migrations.push({
              originalUrl: item.playerImage,
              category: "player_photo",
              title: `عکس بازیکن انتقال ${item.playerName}`,
              updateRefs: (newUrl) => { item.playerImage = newUrl; }
            });
          }
          if (isMigratableUrl(item.fromTeamLogo)) {
            migrations.push({
              originalUrl: item.fromTeamLogo,
              category: "team_logo",
              title: `لوگوی تیم سابق ${item.fromTeam}`,
              updateRefs: (newUrl) => { item.fromTeamLogo = newUrl; }
            });
          }
          if (isMigratableUrl(item.toTeamLogo)) {
            migrations.push({
              originalUrl: item.toTeamLogo,
              category: "team_logo",
              title: `لوگوی تیم جدید ${item.toTeam}`,
              updateRefs: (newUrl) => { item.toTeamLogo = newUrl; }
            });
          }
        });
      }

      if (currentDB.legionnaires) {
        currentDB.legionnaires.forEach((item: any) => {
          if (isMigratableUrl(item.image)) {
            migrations.push({
              originalUrl: item.image,
              category: "player_photo",
              title: `عکس لژیونر ${item.name}`,
              updateRefs: (newUrl) => { item.image = newUrl; }
            });
          }
          if (isMigratableUrl(item.teamLogo)) {
            migrations.push({
              originalUrl: item.teamLogo,
              category: "team_logo",
              title: `لوگوی تیم لژیونر ${item.team}`,
              updateRefs: (newUrl) => { item.teamLogo = newUrl; }
            });
          }
          if (isMigratableUrl(item.logo)) {
            migrations.push({
              originalUrl: item.logo,
              category: "team_logo",
              title: `لوگوی لژیونر ${item.team}`,
              updateRefs: (newUrl) => { item.logo = newUrl; }
            });
          }
        });
      }

      if (currentDB.heroSlides) {
        currentDB.heroSlides.forEach((item: any) => {
          if (isMigratableUrl(item.image)) {
            migrations.push({
              originalUrl: item.image,
              category: "news_image",
              title: `عکس اسلاید هیرو ${item.title || ""}`,
              updateRefs: (newUrl) => { item.image = newUrl; }
            });
          }
        });
      }

      if (Array.isArray(currentDB.ads)) {
        currentDB.ads.forEach((ad: any) => {
          if (ad.type === "banner" && isMigratableUrl(ad.imageUrl)) {
            migrations.push({
              originalUrl: ad.imageUrl,
              category: "ad_banner",
              title: "بنر تبلیغاتی اختصاصی",
              updateRefs: (newUrl) => { ad.imageUrl = newUrl; }
            });
          }
        });
      }

      const groupedUrlMap = new Map<string, { category: string; title: string; runners: ((newUrl: string) => void)[] }>();
      migrations.forEach(m => {
        const existing = groupedUrlMap.get(m.originalUrl);
        if (existing) {
          existing.runners.push(m.updateRefs);
        } else {
          groupedUrlMap.set(m.originalUrl, {
            category: m.category,
            title: m.title,
            runners: [m.updateRefs]
          });
        }
      });

      logMessage("info", "general", `یافتن ${groupedUrlMap.size} آدرس تصویر خارجی منحصر به فرد جهت انتقال.`);

      let successfulCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const logs: string[] = [];

      for (const [url, info] of groupedUrlMap.entries()) {
        try {
          const existingMediaRecord = currentDB.media_files.find((item: any) => item.old_url === url);
          if (existingMediaRecord) {
            info.runners.forEach(run => run(existingMediaRecord.image_url));
            skippedCount++;
            successfulCount++;
            continue;
          }

          logMessage("info", "general", `در حال دانلود تصویر: ${url}`);
          const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (!response.ok) {
            throw new Error(`خطای دانلود با کد وضعیت ${response.status}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          let ext = path.extname(pathname).toLowerCase();
          if (!ext) ext = ".jpg";

          let file_name = path.basename(pathname);
          if (!file_name || file_name.length < 3) {
            file_name = `migrated_image_${Date.now()}${ext}`;
          }
          if (!path.extname(file_name)) {
            file_name += ext;
          }

          const optimized = await optimizeImageToWebp(buffer, file_name, response.headers.get("content-type") || "image/jpeg", { category: info.category });
          const uploadBuffer = optimized.buffer;
          const mimeType = optimized.mimeType;
          const fileSize = uploadBuffer.length;

          const cleanFileName = optimized.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
          const uniquePath = `migrated/${info.category}/${Date.now()}_${cleanFileName}`;

          logMessage("info", "general", `در حال آپلود مجدد تصویر مهاجرت یافته به استوریج: ${uniquePath}`);

          const { error: uploadError } = await pgDb.storage
            .from("media_assets")
            .upload(uniquePath, uploadBuffer, { contentType: mimeType, upsert: true });

          if (uploadError) {
            throw new Error(`آپلود استوریج ناموفق بود: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = pgDb.storage
            .from("media_assets")
            .getPublicUrl(uniquePath);

          const newRecord = {
            id: `media-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            title: info.title,
            file_name: cleanFileName,
            file_path: uniquePath,
            image_url: publicUrl,
            file_size: fileSize,
            mime_type: mimeType,
            category: info.category,
            old_url: url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          currentDB.media_files.push(newRecord);

          info.runners.forEach(run => run(publicUrl));

          successfulCount++;
          logs.push(`انتقال موفقیت‌آمیز: ${info.title} (${cleanFileName})`);
        } catch (err: any) {
          logMessage("error", "general", `خطا در انتقال تصویر ${url}: ${err.message || err}`);
          failedCount++;
          logs.push(`خطا در انتقال آدرس ${url}: ${err.message || err}`);
        }
      }

      if (successfulCount > 0) {
        await saveDB();
      }

      res.json({
        success: true,
        message: `مهاجرت با موفقیت تکمیل شد. موفق: ${successfulCount}، ناموفق: ${failedCount}، از قبل مهاجرت یافته: ${skippedCount}`,
        logs
      });
    } catch (error: any) {
      console.error("Error in POST /api/media/migrate:", error);
      res.status(500).json({ success: false, message: "خطای سیستمی مهاجرت تصاویر" });
    }
  });

  app.get("/api/image-proxy", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).send("Missing target image URL");
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).send("Invalid URL format");
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).send("Only HTTP/HTTPS URLs are allowed");
    }
    const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "[::1]", "metadata.google.internal"];
    if (blockedHosts.includes(parsedUrl.hostname)) {
      return res.status(403).send("Access to internal/private addresses is forbidden");
    }
    try {
      const fetchResponse = await fetch(parsedUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://www.varzesh3.com/"
        }
      });
      if (!fetchResponse.ok) {
        return res.status(fetchResponse.status).send("Failed to retrieve image through proxy connection.");
      }
      const contentType = fetchResponse.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      const arrayBuffer = await fetchResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (err) {
      console.error("Error image-proxy fetch connection:", err);
      res.status(500).send("Internal image retrieval error.");
    }
  });
}
