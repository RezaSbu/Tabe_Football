import express, { Express, Request, Response } from "express";
import { loadDB } from "../state";
import { updateMatchInDb, saveDB } from "../services/database";
import { requirePermission } from "../middleware/auth";
import { parseMatchFromUrl } from "../utils/matchSourceParser";
import { parseMatchWithGemini } from "../utils/geminiClient";
import { logMessage } from "../utils/logger";
import { resolvePlayerNames, type PlayerLike } from "../utils/nameResolver";

/**
 * Extract all unique player references from parsed match data
 * and resolve them against our DB using 3-tier resolution.
 */
async function resolveAllPlayerRefs(data: any, matchMeta: any): Promise<{
  events: any[];
  scorersList: any[];
  lineups: { home: any[]; away: any[] };
  resolvedCount: number;
  unresolvedCount: number;
}> {
  const currentDB = loadDB();
  const dbPlayers: PlayerLike[] = (currentDB.players || []).map((p: any) => ({
    id: String(p.id),
    name: p.name || "",
    teamId: p.teamId || "",
    teamName: p.teamName || "",
  }));

  const homeTeamName = matchMeta?.host?.name || data.lineups?.home?.[0]?.teamName || "";
  const awayTeamName = matchMeta?.guest?.name || data.lineups?.away?.[0]?.teamName || "";

  // Collect all unique player refs from events
  interface PlayerRef { name: string; id?: string; teamHint?: string; source: string; }
  const refsMap = new Map<string, PlayerRef>();

  const addRef = (name: string, id: string | undefined, teamHint: string, source: string) => {
    if (!name && !id) return;
    const key = `${name}::${id || ""}`;
    if (!refsMap.has(key)) {
      refsMap.set(key, { name: name || "", id, teamHint, source });
    }
  };

  for (const ev of (data.events || [])) {
    const teamHint = ev.team === "home" ? homeTeamName : awayTeamName;
    addRef(ev.playerName, ev.playerId, teamHint, "event");
    addRef(ev.player2Name, ev.player2Id, teamHint, "event");
  }

  for (const sc of (data.scorersList || [])) {
    addRef(sc.scorerName, sc.scorerId, homeTeamName + "|" + awayTeamName, "scorer");
    addRef(sc.assistName, sc.assistId, homeTeamName + "|" + awayTeamName, "scorer");
  }

  for (const p of (data.lineups?.home || [])) {
    addRef(p.name, p.id, homeTeamName, "lineup");
  }
  for (const p of (data.lineups?.away || [])) {
    addRef(p.name, p.id, awayTeamName, "lineup");
  }

  const refs = Array.from(refsMap.values());
  logMessage("info", "sync", `Resolving ${refs.length} unique player references...`);

  const results = await resolvePlayerNames(
    refs.map(r => ({ name: r.name, id: r.id, teamHint: r.teamHint })),
    dbPlayers,
  );

  // Build lookup: original key → resolved DB player
  const resolvedMap = new Map<string, PlayerLike>();
  let resolvedCount = 0;
  let unresolvedCount = 0;

  for (let i = 0; i < refs.length; i++) {
    const r = results[i];
    if (r) {
      const key = `${refs[i].name}::${refs[i].id || ""}`;
      resolvedMap.set(key, r.dbPlayer);
      resolvedCount++;
    } else {
      unresolvedCount++;
    }
  }

  logMessage("info", "sync", `Name resolution: ${resolvedCount} resolved, ${unresolvedCount} unresolved.`);

  // Apply resolved IDs back to events
  const events = (data.events || []).map((ev: any) => {
    const ev2 = { ...ev };
    if (ev2.playerName || ev2.playerId) {
      const key = `${ev2.playerName}::${ev2.playerId || ""}`;
      const db = resolvedMap.get(key);
      if (db) {
        ev2.playerId = db.id;
        ev2.playerName = db.name; // normalize to our DB name
      }
    }
    if (ev2.player2Name || ev2.player2Id) {
      const key = `${ev2.player2Name}::${ev2.player2Id || ""}`;
      const db = resolvedMap.get(key);
      if (db) {
        ev2.player2Id = db.id;
        ev2.player2Name = db.name;
      }
    }
    return ev2;
  });

  // Apply resolved IDs back to scorersList
  const scorersList = (data.scorersList || []).map((sc: any) => {
    const sc2 = { ...sc };
    if (sc2.scorerName || sc2.scorerId) {
      const key = `${sc2.scorerName}::${sc2.scorerId || ""}`;
      const db = resolvedMap.get(key);
      if (db) {
        sc2.scorerId = db.id;
        sc2.scorerName = db.name;
        sc2.name = db.name;
      }
    }
    if (sc2.assistName || sc2.assistId) {
      const key = `${sc2.assistName}::${sc2.assistId || ""}`;
      const db = resolvedMap.get(key);
      if (db) {
        sc2.assistId = db.id;
        sc2.assistName = db.name;
      }
    }
    return sc2;
  });

  return { events, scorersList, lineups: data.lineups, resolvedCount, unresolvedCount };
}

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

    // Step 3: Resolve player names against our DB (3-tier: ID → normalize → Gemini)
    let resolvedEvents = data.events;
    let resolvedScorers = data.scorersList;
    let resolvedLineups = data.lineups;
    try {
      const resolved = await resolveAllPlayerRefs(data, parseResult.raw?.matchMeta);
      resolvedEvents = resolved.events;
      resolvedScorers = resolved.scorersList;
      resolvedLineups = resolved.lineups;
      logMessage("info", "sync", `Player resolution complete: ${resolved.resolvedCount} resolved, ${resolved.unresolvedCount} unresolved.`);
    } catch (resolveErr: any) {
      logMessage("warn", "sync", `Player name resolution failed (continuing with raw names): ${resolveErr.message}`);
    }

    // Apply parsed data to the match
    const updates: any = {
      scoreHome: data.scoreHome,
      scoreAway: data.scoreAway,
      referee: data.referee || currentMatch.referee,
      venue: data.venue || currentMatch.venue,
      events: resolvedEvents,
      scorersList: resolvedScorers,
      lineups: resolvedLineups,
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
