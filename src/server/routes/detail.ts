import express, { Express, Request, Response } from "express";
import { loadDB } from "../state";
import { markViewDirty, VIEW_BOT_RE } from "../services/viewTracker";

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
      item.viewCount = (item.viewCount || 0) + 7;
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
        p.teamName && item.name && p.teamName.includes(item.name)
      );
      const teamCoaches = (db.coaches || []).filter((c: any) =>
        c.teamId === item.id || (c.teamName && item.name && c.teamName.includes(item.name))
      );
      res.json({ success: true, data: { ...item, players: teamPlayers, coaches: teamCoaches } });
    } else {
      res.status(404).json({ success: false, message: "تیم یافت نشد." });
    }
  });

  app.get("/api/detail/player/:id", (req: Request, res: Response) => {
    const db = loadDB();
    const item = (db.players || []).find((p: any) => String(p.id) === String(req.params.id));
    if (item) {
      const playerMatches = (db.matches || []).filter((m: any) =>
        (m.teamHome && item.teamName && m.teamHome.includes(item.teamName)) ||
        (m.teamAway && item.teamName && m.teamAway.includes(item.teamName))
      );
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
}
