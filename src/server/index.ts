import express from "express";
import "express-async-errors";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";

import "./utils/envLoader";

import { setupSecurityMiddleware } from "./middleware/security";
import { centralAuthGuard } from "./middleware/auth";
import { recordHttpRequest, cleanupOldVisits, cleanupOldAuditLogs, isDataSynced } from "./services/monitoring";

import { loadDB, setDb } from "./state";
import { dbLock } from "./utils/concurrency";
import { logMessage } from "./utils/logger";
import { fetchAndPopulateMemoryDB, saveDB, migrateConstraints, migrateSummaryColumn, migrateHeroSlidesColumns, migrateAdsSchema, migrateNewsGalleryColumns, migrateNewsArchiveIndexes, migrateDropShirtNumberColumn, migratePlayerProfileColumns, migrateDropArchiveTable, migrateSeasonsFull, migrateClubMovements, migrateSeasonStatsTables, migrateCoachMatchColumns, migrateMatchGroupColumn, migrateMatchMvpColumn, migrateCoachUniqueTeam, migrateLifecycleSchema, migrateReadMoreContent2, migrateMonitoringTables, migrateRatingDefaults, migrateMissingIndexes, migratePlayerMarketBase, migratePlayerMarketCurrencyToman } from "./services/database";
import { recalculateAndSyncDatabase } from "./services/stats";
import { renderSeoPage } from "./services/seoMeta";
import { getUploadsDir } from "./db";

import { registerSystemRoutes } from "./routes/system";
import { registerDiagnosticsRoutes } from "./routes/diagnostics";
import { registerTeamRoutes } from "./routes/teams";
import { registerMatchRoutes } from "./routes/matches";
import { registerStandingsRoutes } from "./routes/standings";
import { registerMediaRoutes } from "./routes/media";
import { registerMiscRoutes } from "./routes/misc";
import { registerDetailRoutes } from "./routes/detail";
import { registerSeasonRoutes } from "./routes/season";
import { registerAdminListRoutes } from "./routes/adminLists";
import { registerMovementRoutes } from "./routes/movements";
import { registerLifecycleRoutes } from "./routes/lifecycle";

logMessage("info", "general", "پورتال فوتبال 360 در حال راه‌اندازی است...");

const app = express();
const PORT = 3000;

app.set("trust proxy", 1);
app.use(cookieParser());
setupSecurityMiddleware(app);
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api/")) {
      recordHttpRequest({ at: start, method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start });
    }
  });
  next();
});
app.use(centralAuthGuard);

registerSystemRoutes(app);
registerDiagnosticsRoutes(app);
registerSeasonRoutes(app);
registerTeamRoutes(app);
registerMatchRoutes(app);
registerStandingsRoutes(app);
registerMediaRoutes(app);
registerMiscRoutes(app);
registerDetailRoutes(app);
registerAdminListRoutes(app);
registerMovementRoutes(app);
registerLifecycleRoutes(app);

// SEO (faza1): archived tab URLs are permanently gone. Answer 410 here — before the
// SPA fallback — instead of serving index.html and JS-bouncing to / (soft-404).
const GONE_PATHS = ["/futsal", "/legionnaires", "/predictions"];
for (const gonePath of GONE_PATHS) {
  app.get(gonePath, (_req, res) => {
    res
      .status(410)
      .type("html")
      .send(
        '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="UTF-8" />' +
          "<title>صفحه حذف شده | تب فوتبال</title>" +
          '<meta name="robots" content="noindex, nofollow" /></head>' +
          '<body style="font-family:sans-serif;text-align:center;padding:4rem 1rem">' +
          "<h1>این صفحه حذف شده است</h1>" +
          '<p><a href="/">بازگشت به تب فوتبال</a></p></body></html>'
      );
  });
}

// SEO (faza1): never let crawlers index the admin shell served by the SPA fallback.
app.use((req, res, next) => {
  if (req.path === "/admin" || req.path.startsWith("/admin/")) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
  next();
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logMessage("error", "general", "Unhandled route error:", err.message || err);
  res.status(500).json({ success: false, message: "خطای سرور داخلی." });
});

async function startServer() {
  await migrateConstraints();
  await migrateSummaryColumn();
  await migrateHeroSlidesColumns();
  await migrateAdsSchema();
  await migrateNewsGalleryColumns();
  await migrateNewsArchiveIndexes();
  await migrateDropShirtNumberColumn();
  await migratePlayerProfileColumns();
  await migrateDropArchiveTable();
  await migrateSeasonsFull();
  await migrateClubMovements();
  await migrateSeasonStatsTables();
  await migrateCoachMatchColumns();
  await migrateMatchGroupColumn();
  await migrateMatchMvpColumn();
  await migrateCoachUniqueTeam();
  await migrateLifecycleSchema();
  await migrateReadMoreContent2();
  await migrateMonitoringTables();
  await migrateRatingDefaults();
  await migrateMissingIndexes();
  await migratePlayerMarketBase();
  await migratePlayerMarketCurrencyToman();
  await cleanupOldVisits(30);
  await cleanupOldAuditLogs(30);
  setInterval(() => {
    cleanupOldVisits(30);
    cleanupOldAuditLogs(30);
  }, 24 * 60 * 60 * 1000);
  await dbLock.acquire(() => fetchAndPopulateMemoryDB());

  if (!isDataSynced()) {
    logMessage("error", "general", "بوت متوقف شد: خوانش اولیه دیتابیس ناموفق بود. برای جلوگیری از پاک‌سازی جداول، سرور بالا نمی‌آید.");
    process.exit(1);
  }

  recalculateAndSyncDatabase();
  await saveDB();

  app.use("/uploads", express.static(getUploadsDir()));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Never serve sourcemaps or the raw server bundle: they expose backend
    // source. (Build no longer emits server.cjs.map; this guards stale files.)
    app.use((req, res, next) => {
      if (req.path.endsWith(".map") || req.path.endsWith("server.cjs")) {
        return res.status(404).end();
      }
      next();
    });
    // NOTE: index:false — "/" must fall through to the SPA fallback below so
    // the SEO meta injection runs for the homepage too (otherwise
    // express.static serves the raw shell for exactly this one path).
    app.use(express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".js")) {
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        } else if (filePath.endsWith(".css")) {
          res.setHeader("Content-Type", "text/css; charset=utf-8");
        } else if (filePath.endsWith(".html")) {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
        }
      }
    }));
    app.get("*", (req, res) => {
      // SEO faza2: non-HTML clients (asset probes, bots with odd Accept
      // headers) keep the byte-identical shell; browsers and crawlers get
      // the same shell with per-URL head meta injected.
      const accept = String(req.headers.accept || "");
      if (accept && !accept.includes("text/html") && !accept.includes("*/*")) {
        return res.sendFile(path.join(distPath, "index.html"));
      }
      try {
        res.set("Cache-Control", "public, max-age=300");
        return res.type("html").send(renderSeoPage(req.path, distPath, loadDB()));
      } catch (err) {
        logMessage("error", "general", "SEO meta injection failed, serving shell:", (err as Error).message || err);
        return res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express server] Running stably on http://localhost:${PORT}`);
  });
  // Never hold a socket longer than the edge will wait: nginx proxies with
  // 60s timeouts, so Node's 300s requestTimeout default would pile up dead
  // work after nginx already gave up. headersTimeout pinned above
  // keepAliveTimeout per Node semantics.
  server.requestTimeout = 60_000;
  server.headersTimeout = 65_000;
  server.keepAliveTimeout = 5_000;
}

startServer();
