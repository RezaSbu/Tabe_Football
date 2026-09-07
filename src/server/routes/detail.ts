import express, { Express, Request, Response } from "express";
import { loadDB } from "../state";
import { markViewDirty, VIEW_BOT_RE } from "../services/viewTracker";
import { normalizePersianString } from "../utils/persian";
import { VIEW_MULTIPLIER } from "../config";

export function registerDetailRoutes(app: Express) {
  app.post("/api/detail/:type/:id/view", async (req: Request, res: Response) => {
    if (VIEW_BOT_RE.test(req.headers["user-agent"] || "")) {
      return res.json({ success: true, skipped: true });
    }

    const db = loadDB();
    const { type, id } = req.params;
    let item: any = null;

    if (type === "news") {
      item = (db.news || []).find((n: any) => String(n.id) === String(id));
    } else if (type === "team") {
      item = (db.teams || []).find((t: any) => String(t.id) === String(id));
    } else if (type === "player") {
      item = (db.players || []).find((p: any) => String(p.id) === String(id));
    } else if (type === "match") {
      const sports = ["football", "futsal"];
      const stages = ["Feature_Games", "Now_Games", "Finished_Games"];
      for (const sp of sports) {
        for (const st of stages) {
          item = (db[`${sp}_${st}`] || []).find((m: any) => String(m.id) === String(id));
          if (item) break;
        }
        if (item) break;
      }
      if (!item) item = (db.matches || []).find((m: any) => String(m.id) === String(id));
    } else if (type === "coach") {
      item = (db.coaches || []).find((c: any) => String(c.id) === String(id));
    } else if (type === "legionnaire") {
      item = (db.legionnaires || []).find((l: any) => String(l.id) === String(id));
    } else if (type === "transfer") {
      item = (db.transfers || []).find((t: any) => String(t.id) === String(id));
    } else if (type === "image") {
      item = (db.images || []).find((i: any) => String(i.id) === String(id));
    }

    if (item) {
      item.viewCount = (item.viewCount || 0) + VIEW_MULTIPLIER;
      markViewDirty();
      return res.json({ success: true, viewCount: item.viewCount });
    }
    return res.status(404).json({ success: false, message: "یافت نشد." });
  });
  app.get("/api/detail/news/:id", (req: Request, res: Response) => {
    const db = loadDB();
    const rawId = String(req.params.id);

    if (rawId.startsWith("transfer-det-") || rawId.startsWith("transfer-slide-")) {
      const trId = rawId.replace("transfer-det-", "").replace("transfer-slide-", "");
      const item = (db.transfers || []).find((t: any) => String(t.id) === String(trId));
      if (item) {
        return res.json({ success: true, data: {
          id: rawId,
          title: `نقل و انتقال: ${item.playerName} به ${item.toTeam} پیوست`,
          summary: `${item.playerName} از ${item.fromTeam} به ${item.toTeam} منتقل شد.`,
          content: item.description || item.details || "",
          image: item.playerImage || item.player_image || item.image || "",
          category: "transfers",
          createdAt: item.createdAt || item.created_at || new Date().toISOString(),
          viewCount: item.viewCount || 0,
          tags: item.tags || [item.playerName, item.fromTeam, item.toTeam],
          _type: "transfer",
          _transferId: item.id,
        }});
      }
      return res.status(404).json({ success: false, message: "نقل و انتقال یافت نشد." });
    }

    if (rawId.startsWith("legionnaire-det-")) {
      const legId = rawId.replace("legionnaire-det-", "");
      const item = (db.legionnaires || []).find((l: any) => String(l.id) === String(legId));
      if (item) {
        return res.json({ success: true, data: {
          id: rawId,
          title: `لژیونر: ${item.name}`,
          summary: `${item.name} در ${item.team || ""} (${item.league || ""})`,
          content: item.performance || item.description || item.details || "",
          image: item.image || "",
          category: "legionnaires",
          createdAt: item.createdAt || item.created_at || new Date().toISOString(),
          viewCount: item.viewCount || 0,
          tags: item.tags || [item.name, item.team, item.league],
          _type: "legionnaire",
          _legionnaireId: item.id,
        }});
      }
      return res.status(404).json({ success: false, message: "لژیونر یافت نشد." });
    }

    const item = (db.news || []).find((n: any) => String(n.id) === String(rawId));
    if (item) {
      res.json({ success: true, data: item });
    } else {
      res.status(404).json({ success: false, message: "خبر یافت نشد." });
    }
  });

  app.get("/api/detail/team/:id", (req: Request, res: Response) => {
    const db = loadDB();
    const item = (db.teams || []).find((t: any) => String(t.id) === String(req.params.id));
    if (item) {
      const teamPlayers = (db.players || []).filter((p: any) =>
        p.teamId === item.id || (p.teamName && item.name && normalizePersianString(p.teamName) === normalizePersianString(item.name))
      );
      const teamCoaches = (db.coaches || []).filter((c: any) =>
        c.teamId === item.id || (c.teamName && item.name && normalizePersianString(c.teamName) === normalizePersianString(item.name))
      );
      const normTeamName = normalizePersianString(item.name || "");
      const teamNews = (db.news || [])
        .filter((n: any) => {
          if (!n || !item.name) return false;
          const haystack = `${n.title || ""} ${n.summary || ""} ${n.content || ""} ${(n.tags || []).join(" ")}`;
          return normalizePersianString(haystack).includes(normTeamName);
        })
        .sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
        .slice(0, 3);
      res.json({ success: true, data: { ...item, players: teamPlayers, coaches: teamCoaches, news: teamNews } });
    } else {
      res.status(404).json({ success: false, message: "تیم یافت نشد." });
    }
  });

  app.get("/api/detail/player/:id", (req: Request, res: Response) => {
    const db = loadDB();
    const item = (db.players || []).find((p: any) => String(p.id) === String(req.params.id));
    if (item) {
      const normName = normalizePersianString(item.name || "");
      const sameName = (a?: string) => !!a && !!item.name && normalizePersianString(a) === normName;
      const sameId = (a?: any) => !!a && String(a) === String(item.id);

      const playerMatches = (db.matches || []).filter((m: any) => {
        const normTeamName = normalizePersianString(item.teamName || "");
        const teamMatch =
          (item.teamId && (String(m.teamHomeId) === String(item.teamId) || String(m.teamAwayId) === String(item.teamId))) ||
          (normTeamName && (
            normalizePersianString(m.teamHome || "") === normTeamName ||
            normalizePersianString(m.teamAway || "") === normTeamName
          ));
        if (teamMatch) return true;

        const lineups = m.lineups || { home: [], away: [] };
        const inLineup = [...(lineups.home || []), ...(lineups.away || [])].some(
          (lp: any) => lp && (sameId(lp.id) || sameName(lp.name))
        );
        if (inLineup) return true;

        const events = m.events || [];
        const inEvents = events.some(
          (ev: any) => ev && (sameName(ev.playerName) || sameName(ev.player2Name))
        );
        if (inEvents) return true;

        const scorers = m.scorersList || [];
        return scorers.some(
          (sc: any) => sc && (sameId(sc.scorerId) || sameName(sc.scorerName) || sameName(sc.name) || sameName(sc.assistName) || sameName(sc.assist))
        );
      });

      playerMatches.sort((a: any, b: any) => String(b.date || "").localeCompare(String(a.date || "")));
      res.json({ success: true, data: { ...item, relatedMatches: playerMatches.slice(0, 20) } });
    } else {
      res.status(404).json({ success: false, message: "بازیکن یافت نشد." });
    }
  });

  app.get("/api/detail/match/:id", (req: Request, res: Response) => {
    const db = loadDB();
    const sports = ["football", "futsal"];
    const stages = ["Feature_Games", "Now_Games", "Finished_Games"];
    let match = null;

    for (const sp of sports) {
      for (const st of stages) {
        const arrKey = `${sp}_${st}`;
        match = (db[arrKey] || []).find((m: any) => String(m.id) === String(req.params.id));
        if (match) break;
      }
      if (match) break;
    }

    if (!match) {
      match = (db.matches || []).find((m: any) => String(m.id) === String(req.params.id));
    }

    if (match) {
      const players = db.players || [];
      const teams = db.teams || [];
      res.json({ success: true, data: { match, players, teams } });
    } else {
      res.status(404).json({ success: false, message: "مسابقه یافت نشد." });
    }
  });

  app.get("/api/detail/coach/:id", (req: Request, res: Response) => {
    const db = loadDB();
    const item = (db.coaches || []).find((c: any) => String(c.id) === String(req.params.id));
    if (item) {
      res.json({ success: true, data: item });
    } else {
      res.status(404).json({ success: false, message: "مربی یافت نشد." });
    }
  });

  app.get("/api/detail/legionnaire/:id", (req: Request, res: Response) => {
    const db = loadDB();
    const item = (db.legionnaires || []).find((l: any) => String(l.id) === String(req.params.id));
    if (item) {
      res.json({ success: true, data: item });
    } else {
      res.status(404).json({ success: false, message: "لژیونر یافت نشد." });
    }
  });

  app.get("/api/detail/transfer/:id", (req: Request, res: Response) => {
    const db = loadDB();
    const item = (db.transfers || []).find((t: any) => String(t.id) === String(req.params.id));
    if (item) {
      res.json({ success: true, data: item });
    } else {
      res.status(404).json({ success: false, message: "نقل و انتقال یافت نشد." });
    }
  });

  app.get("/api/detail/image/:id", (req: Request, res: Response) => {
    const db = loadDB();
    const item = (db.images || []).find((i: any) => String(i.id) === String(req.params.id));
    if (item) {
      res.json({ success: true, data: item });
    } else {
      res.status(404).json({ success: false, message: "تصویر یافت نشد." });
    }
  });

  // Unified Related News API for Player, Coach, and Team
  app.get("/api/related-news/:type/:id", (req: Request, res: Response) => {
    const db = loadDB();
    const { type, id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    let entityName = "";
    let entityTeamName = "";

    if (type === "player") {
      const player = (db.players || []).find((p: any) => String(p.id) === String(id));
      if (!player) return res.status(404).json({ success: false, message: "بازیکن یافت نشد." });
      entityName = player.name || "";
      entityTeamName = player.teamName || "";
    } else if (type === "coach") {
      const coach = (db.coaches || []).find((c: any) => String(c.id) === String(id));
      if (!coach) return res.status(404).json({ success: false, message: "مربی یافت نشد." });
      entityName = coach.name || "";
      entityTeamName = coach.teamName || "";
    } else if (type === "team") {
      const team = (db.teams || []).find((t: any) => String(t.id) === String(id));
      if (!team) return res.status(404).json({ success: false, message: "تیم یافت نشد." });
      entityName = team.name || "";
    } else {
      return res.status(400).json({ success: false, message: "نوع نامعتبر." });
    }

    if (!entityName) {
      return res.json({ success: true, data: [] });
    }

    const normName = normalizePersianString(entityName);
    const normTeamName = entityTeamName ? normalizePersianString(entityTeamName) : "";

    const matchedNews = (db.news || [])
      .filter((n: any) => {
        if (!n) return false;
        
        // Check name in title + summary + content
        const haystack = normalizePersianString(`${n.title || ""} ${n.summary || ""} ${n.content || ""}`);
        if (haystack.includes(normName)) return true;
        if (normTeamName && haystack.includes(normTeamName)) return true;
        
        // Check name in tags
        const tags = (n.tags || []).map((t: string) => normalizePersianString(t).replace(/^#/, "").replace(/_/g, " "));
        if (tags.some((t: string) => t && (t === normName || t.includes(normName) || normName.includes(t)))) return true;
        if (normTeamName && tags.some((t: string) => t && (t === normTeamName || t.includes(normTeamName) || normTeamName.includes(t)))) return true;
        
        return false;
      })
      .sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = matchedNews.filter((n: any) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });

    res.json({ success: true, data: unique.slice(0, limit) });
  });
}
