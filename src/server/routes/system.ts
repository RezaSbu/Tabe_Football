import express, { Express, Request, Response } from "express";
import { db as pgDb } from "../db";
import { loadDB, setDb } from "../state";
import { logMessage, SYSTEM_LOGS } from "../utils/logger";
import { dbLock } from "../utils/concurrency";
import { fetchAndPopulateMemoryDB, saveDB } from "../services/database";
import { requirePermission } from "../middleware/auth";

export function registerSystemRoutes(app: Express) {
  app.get("/api/data", async (req: Request, res: Response) => {
    logMessage("info", "api", "درخواست دریافت داده‌های پایه (/api/data) دریافت شد. همگام‌سازی با PostgreSQL...");
    try {
      await dbLock.acquire(() => fetchAndPopulateMemoryDB());
    } catch (err) {
      logMessage("error", "api", "خطا در بازیابی بلادرنگ داده‌های ابری، استفاده از کش محلی", err);
    }
    res.json({ status: "ok", ...loadDB() });
  });

  app.get("/api/logs", (req: Request, res: Response) => {
    res.json({ status: "ok", logs: SYSTEM_LOGS });
  });

  app.get("/api/testdb", async (req: Request, res: Response) => {
    try {
      if (req.query.refresh === "true") {
        logMessage("info", "database", "درخواست به‌روزرسانی دستی همگام‌ساز اطلاعات دریافت شد. درحال دریافت رکوردها...");
        await dbLock.acquire(() => fetchAndPopulateMemoryDB());
      }
      const { data, error } = await pgDb.from('ads').select('id').limit(1).maybeSingle();
      const localDb = loadDB();
      if (error) throw error;

      const memUsage = process.memoryUsage();
      res.json({
        connected: true,
        message: "اتصال مستقیم و امن به پایگاه داده PostgreSQL با موفقیت برقرار شد.",
        config: {
          host: process.env.DB_HOST || "localhost",
          port: process.env.DB_PORT || "5432",
          database: process.env.DB_NAME || "tabe_football",
          user: process.env.DB_USER || "tabe_admin",
          nodeEnv: process.env.NODE_ENV || "development"
        },
        server: {
          uptime: process.uptime(),
          memoryHeapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          memoryHeapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          memoryRss: Math.round(memUsage.rss / 1024 / 1024),
          nodeVersion: process.version,
          platform: process.platform
        },
        tables: {
          news: localDb.news ? localDb.news.length : 0,
          teams: localDb.teams ? localDb.teams.length : 0,
          players: localDb.players ? localDb.players.length : 0,
          coaches: localDb.coaches ? localDb.coaches.length : 0,
          matches: localDb.matches ? localDb.matches.length : 0,
          transfers: localDb.transfers ? localDb.transfers.length : 0,
          legionnaires: localDb.legionnaires ? localDb.legionnaires.length : 0,
          media: localDb.images ? localDb.images.length : 0,
          hero_slides: localDb.heroSlides ? localDb.heroSlides.length : 0,
          contact_messages: localDb.submissions ? localDb.submissions.length : 0,
          standings: Object.keys(localDb.standings || {}).length,
          stats: Object.keys(localDb.stats || {}).length
        }
      });
    } catch (err: any) {
      res.status(500).json({
        connected: false,
        message: "خطا در برقراری ارتباط با PostgreSQL: " + (err.message || err),
        config: {
          host: process.env.DB_HOST || "localhost",
          port: process.env.DB_PORT || "5432",
          database: process.env.DB_NAME || "tabe_football",
          user: process.env.DB_USER || "tabe_admin",
          nodeEnv: process.env.NODE_ENV || "development"
        },
        server: {
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: process.platform
        },
        tables: {}
      });
    }
  });

  app.delete("/api/logs", requirePermission("diagnostics"), (req: Request, res: Response) => {
    SYSTEM_LOGS.length = 0;
    logMessage("info", "general", "صفحه لاگ‌های ذخیره‌شده پاکسازی گردید.");
    res.json({ status: "ok" });
  });

  app.post("/api/sync", requirePermission("centralSync"), async (req: Request, res: Response) => {
    try {
      await saveDB();
      logMessage("info", "general", "همگام‌سازی فلاش هماهنگی فیزیکی دیتابیس تایید گردید: تمام اطلاعات در فایل db.json بازنویسی و ذخیره شد.");
      res.json({ success: true, message: "تمام جداول و مسابقات با موفقیت با فایل اصلی db.json همگام و روی دیسک ذخیره شدند." });
    } catch (err) {
      console.error("Central Sync Fail:", err);
      res.status(500).json({ success: false, message: "خطا در فلاش هماهنگی فیزیکی دیتابیس" });
    }
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
  });
}
