import express, { Express, Request, Response } from "express";
import { loadDB } from "../state";
import { updateMatchInDb, saveDB } from "../services/database";
import { requirePermission } from "../middleware/auth";
import { parseMatchFromUrl } from "../utils/matchSourceParser";
import { parseMatchWithGemini } from "../utils/geminiClient";
import { logMessage } from "../utils/logger";

function findCurrentMatch(id: string): any | null {
  const currentDB = loadDB();
  for (const sp of ["football", "futsal"]) {
    for (const st of ["Feature_Games", "Now_Games", "Finished_Games"]) {
      const list = currentDB[`${sp}_${st}`] || [];
      const found = list.find((m: any) => String(m.id) === String(id));
      if (found) return found;
    }
  }
  return null;
}

export function registerSyncRoutes(app: Express) {
  /**
   * POST /api/match-sync/:id
   * Body: { url: string }
   * 
   * Fetches a varzesh3 match page, parses events/lineups, and saves to DB.
   * Pipeline: deterministic parser → Gemini fallback.
   */
  app.post("/api/match-sync/:id", requirePermission("matches"), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, message: "لینک صفحه بازی الزامی است." });
    }

    // Validate URL format
    if (!url.includes("varzesh3.com") && !url.includes("web-api.varzesh3.com")) {
      return res.status(400).json({ success: false, message: "لینک باید از سایت ورزش۳ باشد." });
    }

    const currentMatch = findCurrentMatch(id);
    if (!currentMatch) {
      return res.status(404).json({ success: false, message: "مسابقه یافت نشد." });
    }

    // Only sync finished matches for now
    if (currentMatch.status !== "finished") {
      return res.status(400).json({ success: false, message: "همگام‌سازی فعلاً فقط برای بازی‌های تمام‌شده پشتیبانی می‌شود." });
    }

    // Mark as syncing
    updateMatchInDb(id, { syncStatus: "syncing", dataUrl: url, updatedAt: new Date().toISOString() });

    logMessage("info", "sync", `Starting sync for match ${id} from ${url}`);

    // Step 1: Try deterministic parser
    let parseResult = await parseMatchFromUrl(url);

    // Step 2: If parser failed, try Gemini fallback
    let usedGemini = false;
    if (!parseResult.success && parseResult.error) {
      logMessage("info", "sync", `Deterministic parser failed: ${parseResult.error}. Trying Gemini fallback...`);
      try {
        // We need the HTML for Gemini too — re-fetch
        const { fetchVarzesh3Page } = await import("../utils/matchSourceParser");
        const html = await fetchVarzesh3Page(url);
        const geminiResult = await parseMatchWithGemini(html, parseResult.error);
        parseResult = { success: true, data: geminiResult };
        usedGemini = true;
        logMessage("info", "sync", "Gemini fallback succeeded.");
      } catch (geminiErr: any) {
        logMessage("error", "sync", `Gemini fallback also failed: ${geminiErr.message}`);
        updateMatchInDb(id, { syncStatus: "error", updatedAt: new Date().toISOString() });
        await saveDB();
        return res.status(500).json({
          success: false,
          message: `خطا در استخراج داده: ${parseResult.error} | Gemini: ${geminiErr.message}`,
        });
      }
    }

    if (!parseResult.success || !parseResult.data) {
      updateMatchInDb(id, { syncStatus: "error", updatedAt: new Date().toISOString() });
      await saveDB();
      return res.status(500).json({
        success: false,
        message: `خطا در پارس داده: ${parseResult.error}`,
      });
    }

    const data = parseResult.data;

    // Apply parsed data to the match
    const updates: any = {
      scoreHome: data.scoreHome,
      scoreAway: data.scoreAway,
      referee: data.referee || currentMatch.referee,
      venue: data.venue || currentMatch.venue,
      events: data.events,
      scorersList: data.scorersList,
      lineups: data.lineups,
      lastDataFetchAt: new Date().toISOString(),
      syncStatus: "idle",
      dataUrl: url,
      updatedAt: new Date().toISOString(),
    };

    // Merge team stats if available
    if (data.stats) {
      updates.teamStats = data.stats;
    }

    const success = updateMatchInDb(id, updates);
    if (!success) {
      return res.status(500).json({ success: false, message: "خطا در بروزرسانی مسابقه." });
    }

    await saveDB();

    const method = usedGemini ? "Gemini" : "parsers قطعی";
    logMessage("info", "sync", `Match ${id} synced successfully via ${method}: ${data.scoreHome}-${data.scoreAway}, ${data.events.length} events.`);

    res.json({
      success: true,
      message: `همگام‌سازی با موفقیت انجام شد (${method}).`,
      data: {
        scoreHome: data.scoreHome,
        scoreAway: data.scoreAway,
        eventsCount: data.events.length,
        scorersCount: data.scorersList.length,
        method,
      },
    });
  });

  /**
   * GET /api/match-sync/:id/status
   * Get sync status for a match.
   */
  app.get("/api/match-sync/:id/status", requirePermission("matches"), (req: Request, res: Response) => {
    const { id } = req.params;
    const match = findCurrentMatch(id);
    if (!match) {
      return res.status(404).json({ success: false, message: "مسابقه یافت نشد." });
    }
    res.json({
      success: true,
      dataUrl: match.dataUrl || null,
      lastDataFetchAt: match.lastDataFetchAt || null,
      syncStatus: match.syncStatus || "idle",
    });
  });
}
