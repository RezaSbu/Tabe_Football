import express from "express";
import "express-async-errors";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";

import "./utils/envLoader";

import { setupSecurityMiddleware } from "./middleware/security";
import { centralAuthGuard } from "./middleware/auth";
import { recordHttpRequest, cleanupOldVisits, cleanupOldAuditLogs } from "./services/monitoring";

import { loadDB, setDb } from "./state";
import { dbLock } from "./utils/concurrency";
import { logMessage } from "./utils/logger";
import { fetchAndPopulateMemoryDB, saveDB, migrateConstraints, migrateSummaryColumn, migrateHeroSlidesColumns, migrateAdsSchema, migrateNewsGalleryColumns, migrateMonitoringTables } from "./services/database";
import { recalculateAndSyncDatabase } from "./services/stats";
import { getUploadsDir } from "./db";

import { registerSystemRoutes } from "./routes/system";
import { registerDiagnosticsRoutes } from "./routes/diagnostics";
import { registerArchiveRoutes } from "./routes/archives";
import { registerTeamRoutes } from "./routes/teams";
import { registerMatchRoutes } from "./routes/matches";
import { registerStandingsRoutes } from "./routes/standings";
import { registerMediaRoutes } from "./routes/media";
import { registerMiscRoutes } from "./routes/misc";
import { registerDetailRoutes } from "./routes/detail";

logMessage("info", "general", "پورتال فوتبال ۳۶۰ در حال راه‌اندازی است...");

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
registerArchiveRoutes(app);
registerTeamRoutes(app);
registerMatchRoutes(app);
registerStandingsRoutes(app);
registerMediaRoutes(app);
registerMiscRoutes(app);
registerDetailRoutes(app);

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
  await migrateMonitoringTables();
  await cleanupOldVisits(30);
  await cleanupOldAuditLogs(30);
  setInterval(() => {
    cleanupOldVisits(30);
    cleanupOldAuditLogs(30);
  }, 24 * 60 * 60 * 1000);
  await dbLock.acquire(() => fetchAndPopulateMemoryDB());

  const db = loadDB();
  const standingsLeagues = ["pro-league", "league-1", "league-2-group-a", "league-2-group-b", "futsal"];
  const isAnyStandingEmpty = standingsLeagues.some(key => !db.standings[key] || db.standings[key].length === 0);
  if (isAnyStandingEmpty) {
    console.log("[STARTUP] Standings arrays are empty in PostgreSQL. Computing and syncing...");
    recalculateAndSyncDatabase();
    await saveDB();
  }

  app.use("/uploads", express.static(getUploadsDir()));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
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
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express server] Running stably on http://localhost:${PORT}`);
  });
}

startServer();
