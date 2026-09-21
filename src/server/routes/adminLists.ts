import express, { Express, Request, Response } from "express";
import { loadDB } from "../state";
import { normalizePersianString } from "../utils/persian";
import { requirePermission } from "../middleware/auth";

// Phase-3 perf: server-side paginated + filtered admin list endpoints.
// The admin UI previously downloaded the whole 9.5MB /api/data payload and
// filtered in React. These endpoints return only the requested page.

// Week bucket helper: same-week grouping for the match filters.
function weekBucket(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(String(dateStr).slice(0, 10) + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  const day = (d.getDay() + 6) % 7; // Monday-first
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function thisWeekBucket(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function addWeeks(bucket: string, delta: number): string {
  const d = new Date(bucket + "T00:00:00");
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().slice(0, 10);
}

function paginate<T>(rows: T[], page: number, limit: number) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  return {
    items: rows.slice((safePage - 1) * limit, safePage * limit),
    total,
    totalPages,
    page: safePage,
    limit,
  };
}

// Slim match row for admin lists: no lineups/events/scorers payloads.
function slimMatch(m: any) {
  return {
    id: m.id,
    sport: m.sport,
    stage: m.stage,
    status: m.status,
    league: m.league,
    season: m.season,
    week: m.week,
    teamHome: m.teamHome,
    teamAway: m.teamAway,
    teamHomeId: m.teamHomeId,
    teamAwayId: m.teamAwayId,
    teamHomeLogo: m.teamHomeLogo,
    teamAwayLogo: m.teamAwayLogo,
    scoreHome: m.scoreHome,
    scoreAway: m.scoreAway,
    date: m.date,
    time: m.time,
    venue: m.venue,
    referee: m.referee,
    minutes: m.minutes,
    period: m.period,
    updatedAt: m.updatedAt,
  };
}

export function registerAdminListRoutes(app: Express) {
  app.get("/api/admin/matches", requirePermission("matches"), (req: Request, res: Response) => {
    const db = loadDB();
    const page = Math.max(parseInt(String(req.query.page)) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 20, 1), 100);
    const sport = String(req.query.sport || "all");
    const status = String(req.query.status || "all");
    const league = String(req.query.league || "all");
    const season = String(req.query.season || "all");
    const team = String(req.query.team || "").trim().toLowerCase();
    const q = String(req.query.q || "").trim().toLowerCase();
    const week = String(req.query.week || "all"); // this | prev | next | all | YYYY-MM-DD
    const sort = String(req.query.sort || "date_desc");

    const norm = (s: any) => normalizePersianString(String(s || ""));
    const thisWeek = thisWeekBucket();

    const rows = (db.matches || []).filter((m: any) => {
      if (!m) return false;
      if (sport !== "all" && String(m.sport) !== sport) return false;
      if (status !== "all" && String(m.status) !== status) return false;
      if (league !== "all" && String(m.league) !== league) return false;
      if (season !== "all" && String(m.season) !== season) return false;
      if (team && !(norm(m.teamHomeId) === team || norm(m.teamAwayId) === team ||
        norm(m.teamHome) === team || norm(m.teamAway) === team)) return false;
      if (week !== "all") {
        const b = weekBucket(m.date || "");
        const want = week === "this" ? thisWeek : week === "prev" ? addWeeks(thisWeek, -1) : week === "next" ? addWeeks(thisWeek, 1) : week;
        if (b !== want) return false;
      }
      if (q) {
        const hay = `${m.teamHome || ""} ${m.teamAway || ""} ${m.venue || ""} ${m.referee || ""} ${m.league || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    rows.sort((a: any, b: any) => {
      const da = String(a.date || ""), dbb = String(b.date || "");
      const ta = String(a.time || ""), tb = String(b.time || "");
      if (sort === "date_asc") return (da + ta).localeCompare(dbb + tb) || String(a.id).localeCompare(String(b.id));
      return (dbb + tb).localeCompare(da + ta) || String(b.id).localeCompare(String(a.id));
    });

    const result = paginate(rows.map(slimMatch), page, limit);
    res.setHeader("Cache-Control", "no-cache");
    res.json({ success: true, ...result, weekBucket: thisWeek });
  });

  // Slim lookup lists for admin forms/consoles (no stats histories).
  function slimPlayer(p: any) {
    return { id: p.id, name: p.name, teamId: p.teamId, teamName: p.teamName, position: p.position, image: p.image };
  }
  function slimCoach(c: any) {
    return { id: c.id, name: c.name, teamId: c.teamId, teamName: c.teamName, image: c.image };
  }
  function slimTeam(t: any) {
    return { id: t.id, name: t.name, logo: t.logo, city: t.city };
  }

  app.get("/api/admin/players", requirePermission("players"), (req: Request, res: Response) => {
    const db = loadDB();
    const page = Math.max(parseInt(String(req.query.page)) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 20, 1), 100);
    const q = String(req.query.q || "").trim().toLowerCase();
    const team = String(req.query.team || "").trim().toLowerCase();
    const slim = String(req.query.slim || "") === "1";

    const rows = (db.players || []).filter((p: any) => {
      if (!p) return false;
      if (team && String(p.teamId || "").toLowerCase() !== team &&
        normalizePersianString(p.teamName || "") !== normalizePersianString(team)) return false;
      if (q && !(`${p.name || ""} ${p.teamName || ""}`.toLowerCase().includes(q))) return false;
      return true;
    });
    rows.sort((a: any, b: any) => normalizePersianString(a.name || "").localeCompare(normalizePersianString(b.name || "")));
    const result = paginate(slim ? rows.map(slimPlayer) : rows, page, limit);
    res.setHeader("Cache-Control", "no-cache");
    res.json({ success: true, ...result });
  });

  app.get("/api/admin/coaches", requirePermission("coaches"), (req: Request, res: Response) => {
    const db = loadDB();
    const page = Math.max(parseInt(String(req.query.page)) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 20, 1), 100);
    const q = String(req.query.q || "").trim().toLowerCase();
    const slim = String(req.query.slim || "") === "1";

    const rows = (db.coaches || []).filter((c: any) => {
      if (!c) return false;
      if (q && !(`${c.name || ""} ${c.teamName || ""}`.toLowerCase().includes(q))) return false;
      return true;
    });
    rows.sort((a: any, b: any) => normalizePersianString(a.name || "").localeCompare(normalizePersianString(b.name || "")));
    const result = paginate(slim ? rows.map(slimCoach) : rows, page, limit);
    res.setHeader("Cache-Control", "no-cache");
    res.json({ success: true, ...result });
  });

  app.get("/api/admin/teams", requirePermission("teams"), (req: Request, res: Response) => {
    const db = loadDB();
    const page = Math.max(parseInt(String(req.query.page)) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 20, 1), 100);
    const q = String(req.query.q || "").trim().toLowerCase();
    const slim = String(req.query.slim || "") === "1";

    const rows = (db.teams || []).filter((t: any) => {
      if (!t) return false;
      if (q && !(`${t.name || ""} ${t.city || ""}`.toLowerCase().includes(q))) return false;
      return true;
    });
    rows.sort((a: any, b: any) => normalizePersianString(a.name || "").localeCompare(normalizePersianString(b.name || "")));
    const result = paginate(slim ? rows.map(slimTeam) : rows, page, limit);
    res.setHeader("Cache-Control", "no-cache");
    res.json({ success: true, ...result });
  });
}
