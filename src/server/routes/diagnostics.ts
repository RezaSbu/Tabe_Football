import express, { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { spawn } from "child_process";
import { pool } from "../db";
import { logMessage } from "../utils/logger";
import { auditLog } from "../utils/audit";
import { requirePermission } from "../middleware/auth";
import { saveDB } from "../services/database";
import {
  getSystemMetrics,
  getPostgresMetrics,
  getMediaStats,
  getVisitorStats,
  getAuditStats,
  getHttpStats,
  getRunningVersion,
  getCacheHealth
} from "../services/monitoring";

// ============================================
// مسیرهای سامانه نظارت، بازدید و عملیات
// ============================================

const BACKUPS_DIR = path.join(process.cwd(), "backups");
const BOT_RE = /bot|crawl|spider|slurp|curl|wget|python|node|headless|axios|php|java|postman|monitoring/i;

function getClientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "";
}

function ensureBackupsDir(): void {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

function listBackups(): { file: string; size: number; createdAt: string }[] {
  ensureBackupsDir();
  try {
    const files = fs
      .readdirSync(BACKUPS_DIR)
      .filter((f: string) => /^backup_.*\.sql(\.gz)?$/.test(f))
      .map((f: string) => {
        const st = fs.statSync(path.join(BACKUPS_DIR, f));
        return { file: f, size: st.size, createdAt: st.mtime.toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return files;
  } catch {
    return [];
  }
}

// ---------- پشتیبان‌گیری با pg_dump ----------
function runPgDump(outputFile: string): Promise<{ ok: boolean; error?: string }> {
  return new Promise(resolve => {
    const args = [
      "-h", process.env.DB_HOST || "localhost",
      "-p", process.env.DB_PORT || "5432",
      "-U", process.env.DB_USER || "tabe_admin",
      "-d", process.env.DB_NAME || "tabe_football",
      "--no-owner", "--no-privileges"
    ];
    const proc = spawn("pg_dump", args, {
      env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || "" }
    });
    const out = fs.createWriteStream(outputFile);
    let errOutput = "";
    proc.stdout.pipe(out);
    proc.stderr.on("data", (d: Buffer) => {
      errOutput += String(d);
    });
    proc.on("error", (err: any) => resolve({ ok: false, error: `pg_dump اجرا نشد: ${err.message}` }));
    proc.on("close", code => {
      out.close();
      if (code === 0) {
        resolve({ ok: true });
      } else {
        fs.unlink(outputFile, () => {});
        resolve({ ok: false, error: errOutput.slice(0, 600) });
      }
    });
  });
}

// ---------- پشتیبان‌گیری جایگزین (بدون pg_dump) ----------
async function fallbackSqlDump(outputFile: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const tablesRes = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    const tables: string[] = tablesRes.rows.map((r: any) => r.table_name).filter((t: string) => t !== "spatial_ref_sys");
    const lines: string[] = [];
    lines.push("-- Tabe Football Fallback SQL Dump");
    lines.push("SET client_encoding = 'UTF8';");
    lines.push("SET standard_conforming_strings = on;");
    lines.push("BEGIN;");
    lines.push("");

    const sqlLiteral = (val: any): string => {
      if (val === null || val === undefined) return "NULL";
      if (typeof val === "number") return String(val);
      if (typeof val === "boolean") return val ? "true" : "false";
      if (typeof val === "object") return "'" + JSON.stringify(val).replace(/'/g, "''") + "'";
      return "'" + String(val).replace(/'/g, "''") + "'";
    };

    for (const table of tables) {
      const q = `SELECT * FROM public."${table}"`;
      try {
        const res = await pool.query(q);
        if (res.rows.length === 0) continue;
        const cols = Object.keys(res.rows[0]);
        const colStr = cols.map((c: string) => `"${c}"`).join(", ");
        for (const row of res.rows) {
          const vals = cols.map(c => sqlLiteral(row[c])).join(", ");
          lines.push(`INSERT INTO public."${table}" (${colStr}) VALUES (${vals});`);
        }
        lines.push("");
      } catch {
        // جدول قابل خواندن نیست؛ رد شو
      }
    }

    lines.push("COMMIT;");
    fs.writeFileSync(outputFile, lines.join("\n"), "utf8");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

function gzipFile(file: string): string {
  const gz = `${file}.gz`;
  try {
    const data = fs.readFileSync(file);
    fs.writeFileSync(gz, zlib.gzipSync(data, { level: 9 }));
    fs.unlinkSync(file);
    return gz;
  } catch {
    return file;
  }
}

function pruneBackups(keep = 30): void {
  try {
    const files = listBackups();
    files.slice(keep).forEach(f => {
      fs.unlinkSync(path.join(BACKUPS_DIR, f.file));
    });
  } catch {
    // ignore
  }
}

export function registerDiagnosticsRoutes(app: Express) {
  // ---------- دریافت همه اطلاعات مانیتورینگ به صورت یکجا ----------
  app.get("/api/diagnostics", requirePermission("diagnostics"), async (req: Request, res: Response) => {
    try {
      if (req.query.refresh === "true") {
        await saveDB();
      }
      const [postgres, visitors, audit, media, system, http, version, cache] = await Promise.all([
        getPostgresMetrics(),
        getVisitorStats(),
        getAuditStats(),
        Promise.resolve(getMediaStats()),
        Promise.resolve(getSystemMetrics()),
        Promise.resolve(getHttpStats()),
        Promise.resolve(getRunningVersion()),
        Promise.resolve(getCacheHealth())
      ]);

      const { getStorageStats } = await import("./system");
      const storage = await getStorageStats();
      const backups = listBackups();

      res.json({
        success: true,
        config: {
          host: process.env.DB_HOST || "localhost",
          port: process.env.DB_PORT || "5432",
          database: process.env.DB_NAME || "tabe_football",
          user: process.env.DB_USER || "tabe_admin",
          nodeEnv: process.env.NODE_ENV || "development"
        },
        system,
        postgres,
        media,
        visitors,
        audit,
        http,
        version,
        cache,
        storage,
        backups
      });
    } catch (err: any) {
      logMessage("error", "api", "خطا در دریافت اطلاعات مانیتورینگ", err?.message || err);
      res.status(500).json({ success: false, message: "خطا در دریافت اطلاعات مانیتورینگ" });
    }
  });

  // ---------- ایجاد بکاپ ----------
  app.post("/api/diagnostics/backup", requirePermission("diagnostics"), async (req: Request, res: Response) => {
    ensureBackupsDir();
    const user = (req as any).user;
    const ts = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    const rawFile = path.join(BACKUPS_DIR, `backup_${ts}.sql`);

    logMessage("info", "api", "آغاز پشتیبان‌گیری از دیتابیس (pg_dump)");
    auditLog({ username: user?.username || "unknown", role: user?.role, action: "backup", method: "POST", path: "/api/diagnostics/backup", ip: getClientIp(req) });

    let result = await runPgDump(rawFile);
    if (!result.ok) {
      // اگر pg_dump در دسترس نبود، از دامپ جایگزین استفاده کن
      logMessage("warn", "api", `pg_dump در دسترس نیست؛ استفاده از دامپ جایگزین. (${result.error})`);
      result = await fallbackSqlDump(rawFile);
    }

    if (!result.ok) {
      logMessage("error", "api", "خطا در پشتیبان‌گیری", result.error);
      return res.status(500).json({ success: false, message: `خطا در پشتیبان‌گیری: ${result.error}` });
    }

    const finalFile = gzipFile(rawFile);
    pruneBackups();
    const size = fs.statSync(finalFile).size;
    logMessage("info", "api", `پشتیبان‌گیری با موفقیت انجام شد: ${path.basename(finalFile)} (${Math.round(size / 1024)} KB)`);
    res.json({ success: true, message: "پشتیبان‌گیری با موفقیت انجام شد.", file: path.basename(finalFile), size });
  });

  // ---------- لیست بکاپ‌ها ----------
  app.get("/api/diagnostics/backups", requirePermission("diagnostics"), (_req: Request, res: Response) => {
    res.json({ success: true, backups: listBackups() });
  });

  // ---------- دانلود بکاپ ----------
  app.get("/api/diagnostics/backup/:file", requirePermission("diagnostics"), (req: Request, res: Response) => {
    const fileName = String(req.params.file || "").replace(/[^a-zA-Z0-9._-]/g, "");
    if (!/^backup_.*\.sql(\.gz)?$/.test(fileName)) {
      return res.status(400).json({ success: false, message: "نام فایل نامعتبر است." });
    }
    const fullPath = path.join(BACKUPS_DIR, fileName);
    if (!fs.existsSync(fullPath) || !fullPath.startsWith(BACKUPS_DIR)) {
      return res.status(404).json({ success: false, message: "فایل یافت نشد." });
    }
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    fs.createReadStream(fullPath).pipe(res);
  });

  // ---------- VACUUM / ANALYZE ----------
  app.post("/api/diagnostics/vacuum", requirePermission("diagnostics"), async (req: Request, res: Response) => {
    const user = (req as any).user;
    auditLog({ username: user?.username || "unknown", role: user?.role, action: "vacuum", method: "POST", path: "/api/diagnostics/vacuum", ip: getClientIp(req) });
    try {
      logMessage("info", "database", "شروع بهینه‌سازی دیتابیس: VACUUM (ANALYZE)");
      await pool.query("VACUUM (ANALYZE)");
      logMessage("info", "database", "بهینه‌سازی VACUUM (ANALYZE) با موفقیت انجام شد.");
      res.json({ success: true, message: "بهینه‌سازی VACUUM (ANALYZE) با موفقیت انجام شد." });
    } catch (e: any) {
      logMessage("warn", "database", "خطا در VACUUM", e?.message || e);
      res.status(500).json({ success: false, message: `خطا در اجرای VACUUM: ${e?.message || e}` });
    }
  });

  // ---------- ثبت بازدید صفحه (عمومی) ----------
  app.post("/api/visit", async (req: Request, res: Response) => {
    try {
      const { visitorId, page, referrer } = req.body || {};
      const userAgent = req.headers["user-agent"] || "";
      const cleanPage = String(page || "").slice(0, 300);
      const isBot = BOT_RE.test(userAgent) || !visitorId;

      await pool.query(
        `INSERT INTO public.visits (visitor_id, ip, user_agent, page, referrer, is_bot)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [
          String(visitorId || "").slice(0, 64) || null,
          getClientIp(req).slice(0, 64),
          String(userAgent).slice(0, 300),
          cleanPage,
          String(referrer || "").slice(0, 300) || null,
          isBot
        ]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e?.message || "خطا در ثبت بازدید" });
    }
  });
}
