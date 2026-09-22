import express, { Express, Request, Response } from "express";
import { loadDB } from "../state";
import { logMessage } from "../utils/logger";
import { saveDB } from "../services/database";
import { requirePermission } from "../middleware/auth";

// Current-season management only. The multi-season archive system was
// removed; there is exactly one active season (1405). This endpoint only
// sets which season tag is current — it never snapshots, zeroes, or
// deletes any data.
export function registerSeasonRoutes(app: Express) {
  app.post("/api/current-season", requirePermission("matches"), async (req: Request, res: Response) => {
    const { currentSeason } = req.body;
    if (!currentSeason || !String(currentSeason).trim()) {
      return res.status(400).json({ error: "تگ فصل جاری الزامی است." });
    }

    const cleanSeason = String(currentSeason).trim();
    logMessage("info", "api", `تغییر مستقیم فصل جاری سیستم به: ${cleanSeason}`);

    try {
      const currentDB = loadDB();
      currentDB.currentSeason = cleanSeason;
      await saveDB({ skipRecalc: true, tables: ["systemInfo"] });
      res.json({ success: true, currentSeason: cleanSeason });
    } catch (err: any) {
      console.error("Failed to update current season", err);
      res.status(500).json({ error: "خطا در بروزرسانی فصل جاری." });
    }
  });
}
