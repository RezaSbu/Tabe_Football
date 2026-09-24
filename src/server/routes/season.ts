import express, { Express, Request, Response } from "express";
import { loadDB } from "../state";
import { logMessage } from "../utils/logger";
import { saveDB } from "../services/database";
import { requirePermission } from "../middleware/auth";
import { pool } from "../db";

// Current-season management only. The multi-season archive system was
// removed; there is exactly one active season (1405). This endpoint only
// sets which season tag is current — it never snapshots, zeroes, or
// deletes any data.
export function registerSeasonRoutes(app: Express) {
  // Lists all seasons with the current one marked. Public read.
  app.get("/api/seasons", (req: Request, res: Response) => {
    const currentDB = loadDB();
    const seasons = Array.isArray(currentDB.seasons) ? currentDB.seasons : [];
    const currentSeason = currentDB.currentSeason || "1405";
    res.json({ success: true, seasons, currentSeason });
  });

  // Derived per-season aggregates (recomputed by recalc, served from memory).
  // Slim filterable reads for the Phase-5 season switcher. Public read.
  const matchSeason = (rowSeasonId: any, rowSeason: any, q: any): boolean => {
    if (!q) return true;
    const needle = String(q).trim();
    if (!needle) return true;
    const sid = rowSeasonId ? String(rowSeasonId) : "";
    const tag = rowSeason ? String(rowSeason).replace(/^season-/, "") : "";
    return sid === needle || sid === `season-${needle}` || tag === needle || tag === needle.replace(/^season-/, "");
  };
  app.get("/api/player-season-stats", (req: Request, res: Response) => {
    const currentDB = loadDB();
    const rows = Array.isArray(currentDB.playerSeasonStats) ? currentDB.playerSeasonStats : [];
    const { seasonId, season, playerId } = req.query as Record<string, string>;
    // Phase 5: resolve the display name server-side (rows carry only ids +
    // club names) so leaderboards never need a players-table join client-side.
    const nameById = new Map<string, string>();
    for (const p of currentDB.players || []) {
      if (p && p.id && !nameById.has(String(p.id))) nameById.set(String(p.id), p.name || "");
    }
    const out = rows
      .filter((r: any) =>
        matchSeason(r.seasonId, r.season, seasonId || season) &&
        (!playerId || String(r.playerId) === String(playerId)))
      .map((r: any) => ({ ...r, playerName: nameById.get(String(r.playerId)) || null }));
    res.json({ success: true, count: out.length, rows: out });
  });
  app.get("/api/coach-season-stats", (req: Request, res: Response) => {
    const currentDB = loadDB();
    const rows = Array.isArray(currentDB.coachSeasonStats) ? currentDB.coachSeasonStats : [];
    const { seasonId, season, coachId } = req.query as Record<string, string>;
    const nameById = new Map<string, string>();
    for (const c of currentDB.coaches || []) {
      if (c && c.id && !nameById.has(String(c.id))) nameById.set(String(c.id), c.name || "");
    }
    const out = rows
      .filter((r: any) =>
        matchSeason(r.seasonId, r.season, seasonId || season) &&
        (!coachId || String(r.coachId) === String(coachId)))
      .map((r: any) => ({ ...r, coachName: nameById.get(String(r.coachId)) || null }));
    res.json({ success: true, count: out.length, rows: out });
  });
  app.get("/api/team-season-stats", (req: Request, res: Response) => {
    const currentDB = loadDB();
    const rows = Array.isArray(currentDB.teamSeasonStats) ? currentDB.teamSeasonStats : [];
    const { seasonId, season, teamId } = req.query as Record<string, string>;
    const out = rows.filter((r: any) =>
      matchSeason(r.seasonId, r.season, seasonId || season) &&
      (!teamId || String(r.teamId) === String(teamId)));
    res.json({ success: true, count: out.length, rows: out });
  });

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

  // Creates a new season row (status upcoming, inactive). Never touches any
  // stats, matches, or other data: a fresh season simply has zero rows until
  // its matches are played. Season tags are 4-digit years by convention.
  app.post("/api/seasons", requirePermission("matches"), async (req: Request, res: Response) => {
    const name = String(req.body?.name || "").trim();
    const label = req.body?.label != null ? String(req.body.label).trim() || null : null;
    const startDate = req.body?.startDate != null && String(req.body.startDate).trim() ? String(req.body.startDate).trim() : null;
    const endDate = req.body?.endDate != null && String(req.body.endDate).trim() ? String(req.body.endDate).trim() : null;
    if (!/^\d{4}$/.test(name)) {
      return res.status(400).json({ success: false, message: "تگ فصل باید سال چهاررقمی باشد (مثل 1406)." });
    }
    const id = `season-${name}`;
    try {
      const currentDB = loadDB();
      const existing = (currentDB.seasons || []).find((s: any) => String(s.id) === id || String(s.name) === name);
      if (existing) {
        return res.status(409).json({ success: false, message: "این فصل قبلاً ثبت شده است." });
      }
      const nowIso = new Date().toISOString();
      await pool.query(
        `INSERT INTO seasons (id, name, label, start_date, end_date, is_active, is_archived, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,false,false,'upcoming',$6,$6)`,
        [id, name, label || `${name}-${Number(name) + 1}`, startDate, endDate, nowIso]
      );
      const season = { id, name, label: label || `${name}-${Number(name) + 1}`, startDate, endDate, isActive: false, isArchived: false, status: "upcoming", createdAt: nowIso, updatedAt: nowIso };
      if (!Array.isArray(currentDB.seasons)) currentDB.seasons = [];
      currentDB.seasons.push(season);
      logMessage("info", "api", `فصل جدید ثبت شد: ${name}`);
      return res.status(201).json({ success: true, season });
    } catch (err: any) {
      if (err && (err.code === "23505" || String(err.message || "").includes("uq_seasons_name"))) {
        return res.status(409).json({ success: false, message: "این فصل قبلاً ثبت شده است." });
      }
      logMessage("error", "api", "خطا در ثبت فصل جدید:", err.message || err);
      return res.status(500).json({ success: false, message: "خطا در ثبت فصل." });
    }
  });

  // Switches the active season inside ONE transaction: seasons flag flip +
  // system_info.currentSeason update, or nothing at all. Never snapshots,
  // zeroes, moves, or deletes any stats/matches/news data — historical rows
  // stay exactly where they are; the new current season simply starts empty.
  app.post("/api/seasons/:id/make-current", requirePermission("matches"), async (req: Request, res: Response) => {
    const id = String(req.params.id || "").trim();
    if (!id) {
      return res.status(400).json({ success: false, message: "شناسه فصل الزامی است." });
    }
    const currentDB = loadDB();
    const target = (currentDB.seasons || []).find((s: any) => String(s.id) === id);
    if (!target) {
      return res.status(404).json({ success: false, message: "فصل یافت نشد." });
    }
    if (target.isActive || target.status === "current") {
      return res.json({ success: true, season: target, alreadyCurrent: true });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`UPDATE seasons SET is_active = false, status = 'closed', updated_at = now() WHERE is_active IS TRUE`);
      const upd = await client.query(
        `UPDATE seasons SET is_active = true, status = 'current', updated_at = now() WHERE id = $1 RETURNING id, name`,
        [id]
      );
      if (upd.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "فصل یافت نشد." });
      }
      await client.query(`UPDATE system_info SET value = $1 WHERE key = 'currentSeason'`, [target.name]);
      await client.query("COMMIT");
    } catch (err: any) {
      try { await client.query("ROLLBACK"); } catch {}
      logMessage("error", "api", "خطا در فعال‌سازی فصل:", err.message || err);
      return res.status(500).json({ success: false, message: "خطا در فعال‌سازی فصل." });
    } finally {
      client.release();
    }
    // Memory mirror (seasons table has no saveDB block; the transaction above
    // is the persistence — memory just reflects it for immediate serving).
    for (const s of currentDB.seasons || []) {
      if (String(s.id) === id) {
        s.isActive = true;
        s.status = "current";
      } else if (s.isActive || s.status === "current") {
        s.isActive = false;
        s.status = "closed";
      }
    }
    currentDB.currentSeason = target.name;
    logMessage("info", "api", `فصل جاری به «${target.name}» تغییر یافت (بدون دست‌خوردن داده‌ها).`);
    return res.json({ success: true, season: (currentDB.seasons || []).find((s: any) => String(s.id) === id) });
  });
}
