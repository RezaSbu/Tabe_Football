import express from "express";
import "express-async-errors";
import path from "path";
import { createServer as createViteServer } from "vite";

import "./utils/envLoader";

import { setupSecurityMiddleware } from "./middleware/security";
import { centralAuthGuard } from "./middleware/auth";

import { loadDB, setDb } from "./state";
import { dbLock } from "./utils/concurrency";
import { logMessage } from "./utils/logger";
import { fetchAndPopulateMemoryDB, saveDB, migrateConstraints } from "./services/database";
import { recalculateAndSyncDatabase } from "./services/stats";

import { registerSystemRoutes } from "./routes/system";
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
setupSecurityMiddleware(app);
app.use(centralAuthGuard);

registerSystemRoutes(app);
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
  await dbLock.acquire(() => fetchAndPopulateMemoryDB());

  const db = loadDB();
  const standingsLeagues = ["pro-league", "league-1", "league-2-group-a", "league-2-group-b", "futsal"];
  const isAnyStandingEmpty = standingsLeagues.some(key => !db.standings[key] || db.standings[key].length === 0);
  if (isAnyStandingEmpty) {
    console.log("[STARTUP] Standings arrays are empty in PostgreSQL. Computing and syncing...");
    recalculateAndSyncDatabase();
    await saveDB();
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const uploadsPath = path.join(process.cwd(), "uploads");
    app.use("/uploads", express.static(uploadsPath));
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
