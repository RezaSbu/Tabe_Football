import sharp, { type Metadata } from "sharp";
import fs from "fs";
import path from "path";

export const IMAGE_MAX_WIDTH = 1600;
export const WEBP_QUALITY = 90;

// دسته‌هایی که هویت خودشان را دارند و نباید واترمارک شوند
const NO_WATERMARK_CATEGORIES = new Set(["team_logo", "ad_banner"]);
// عکس‌های کوچک‌تر از این عرض واترمارک نمی‌گیرند
const WATERMARK_MIN_WIDTH = 500;

export interface OptimizeOptions {
  maxWidth?: number;
  category?: string;
  watermark?: boolean;
}

export interface OptimizeResult {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  converted: boolean;
  watermarked?: boolean;
}

let fontBase64Cache: string | null | undefined;

// فونت فارسی وزیرمتن برای رندر متن واترمارک؛ در حالت توسعه و پروداکشن از مسیرهای مختلف خوانده می‌شود
function getFontBase64(): string | null {
  if (fontBase64Cache !== undefined) return fontBase64Cache;
  const candidates = [
    path.join(process.cwd(), "src", "server", "assets", "fonts", "Vazirmatn-Bold.ttf"),
    path.join(process.cwd(), "dist", "assets", "fonts", "Vazirmatn-Bold.ttf")
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        fontBase64Cache = fs.readFileSync(p).toString("base64");
        return fontBase64Cache;
      }
    } catch {
      // ادامه بده
    }
  }
  fontBase64Cache = null;
  return null;
}

// ساخت لایه SVG واترمارک: یک علامت مورب کم‌رنگ در مرکز + دو علامت کوچک در گوشه‌های بالا-چپ و پایین-راست
export function buildWatermarkSvg(width: number, height: number, fontBase64: string): Buffer {
  const minDim = Math.min(width, height);
  const mainFontSize = Math.max(28, Math.round(minDim * 0.065));
  const cornerFontSize = Math.max(16, Math.round(minDim * 0.028));
  const cornerMargin = Math.round(minDim * 0.02);
  const cx = width / 2;
  const cy = height / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      @font-face {
        font-family: 'Vazirmatn';
        src: url('data:font/ttf;base64,${fontBase64}') format('truetype');
      }
    </style>
  </defs>
  <text x="${cx}" y="${cy}" font-family="Vazirmatn" font-weight="bold" font-size="${mainFontSize}"
    fill="rgba(255,255,255,0.30)" text-anchor="middle" dominant-baseline="middle"
    transform="rotate(-30 ${cx} ${cy})">تب فوتبال</text>
  <text x="${cornerMargin}" y="${cornerMargin}" font-family="Vazirmatn" font-weight="bold" font-size="${cornerFontSize}"
    fill="rgba(255,255,255,0.40)" text-anchor="start" dominant-baseline="hanging">تب فوتبال</text>
  <text x="${width - cornerMargin}" y="${height - cornerMargin}" font-family="Vazirmatn" font-weight="bold" font-size="${cornerFontSize}"
    fill="rgba(255,255,255,0.40)" text-anchor="end" dominant-baseline="alphabetic">tabefotbal.ir</text>
</svg>`;
  return Buffer.from(svg);
}

async function applyWatermark(buffer: Buffer, width: number, height: number): Promise<Buffer> {
  const fontBase64 = getFontBase64();
  if (!fontBase64) return buffer;
  const svgBuffer = buildWatermarkSvg(width, height, fontBase64);
  return sharp(buffer, { failOn: "none" })
    .composite([{ input: svgBuffer }])
    .webp({ quality: WEBP_QUALITY, alphaQuality: 100 })
    .toBuffer();
}

/**
 * تبدیل تصاویر استاتیک (jpeg/png/webp) به WebP با کیفیت بالا به همراه ریسایز (فقط کوچک‌سازی).
 * فایل‌های SVG و GIF متحرک و فرمت‌های ناشناخته دست‌نخورده برمی‌گردند.
 */
export async function optimizeImageToWebp(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  options?: OptimizeOptions
): Promise<OptimizeResult> {
  const maxWidth = options?.maxWidth || IMAGE_MAX_WIDTH;

  let meta: Metadata;
  try {
    meta = await sharp(buffer, { failOn: "none" }).metadata();
  } catch {
    return { buffer, mimeType, fileName, converted: false };
  }

  const fmt = meta.format;
  if (fmt === "svg") return { buffer, mimeType, fileName, converted: false };
  if (fmt === "gif" && (meta.pages ?? 1) > 1) {
    return { buffer, mimeType, fileName, converted: false };
  }
  if (fmt !== "jpeg" && fmt !== "png" && fmt !== "gif" && fmt !== "webp") {
    return { buffer, mimeType, fileName, converted: false };
  }

  const srcW = meta.width || 0;
  const srcH = meta.height || 0;
  let finalW = srcW;
  let finalH = srcH;
  if (srcW > maxWidth) {
    finalW = maxWidth;
    finalH = Math.round((srcH * maxWidth) / srcW);
  }

  try {
    const resized = await sharp(buffer, { failOn: "none" })
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, alphaQuality: 100 })
      .toBuffer();

    const category = String(options?.category || "").trim().toLowerCase();
    // تصمیم واترمارک: true = همیشه اعمال شود، false = هرگز، undefined = رفتار قدیمی (مستثنی دسته و حداقل عرض)
    const watermarkFlag = options?.watermark;
    let shouldWatermark: boolean;
    if (watermarkFlag === true) {
      shouldWatermark = true;
    } else if (watermarkFlag === false) {
      shouldWatermark = false;
    } else {
      shouldWatermark =
        !NO_WATERMARK_CATEGORIES.has(category) &&
        finalW >= WATERMARK_MIN_WIDTH;
    }

    if (!shouldWatermark) {
      return {
        buffer: resized,
        mimeType: "image/webp",
        fileName: fileName.replace(/\.[^.]+$/, "") + ".webp",
        converted: true
      };
    }

    try {
      const watermarked = await applyWatermark(resized, finalW, finalH);
      return {
        buffer: watermarked,
        mimeType: "image/webp",
        fileName: fileName.replace(/\.[^.]+$/, "") + ".webp",
        converted: true,
        watermarked: true
      };
    } catch {
      return {
        buffer: resized,
        mimeType: "image/webp",
        fileName: fileName.replace(/\.[^.]+$/, "") + ".webp",
        converted: true
      };
    }
  } catch {
    return { buffer, mimeType, fileName, converted: false };
  }
}
