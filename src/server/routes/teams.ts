import express, { Express, Request, Response } from "express";
import { loadDB, snapshotDB, restoreDB } from "../state";
import { logMessage } from "../utils/logger";
import { saveDB, markTablesDirty } from "../services/database";
import { getPlayerCalculatedStatsFromMatches, getCoachCalculatedStatsFromMatches, calcTeamBaseFor } from "../services/stats";
import { recordLifecycleEvent } from "../services/lifecycle";
import { requirePermission } from "../middleware/auth";
import { detectConflict } from "../utils/versioning";
import { auditLog } from "../utils/audit";
import { stripServerManaged } from "../utils/fields";

export function registerTeamRoutes(app: Express) {
  app.post("/api/teams", requirePermission("teams"), async (req: Request, res: Response) => {
    const currentDB = loadDB();
    const cleanBody = stripServerManaged(req.body);
    const idPrefix = cleanBody.sport === "futsal" ? "futsal" : "team";
    const item: any = {
      ...cleanBody,
      id: `${idPrefix}-${Date.now()}`
    };

    const enteredPlayed = parseInt(item.stats?.played) || 0;
    const enteredWon = parseInt(item.stats?.won) || 0;
    const enteredDrawn = parseInt(item.stats?.drawn) || 0;
    const enteredLost = parseInt(item.stats?.lost) || 0;
    const enteredPoints = parseInt(item.stats?.points) || 0;
    const enteredGoalsFor = parseInt(item.stats?.goalsFor) || 0;
    const enteredGoalsAgainst = parseInt(item.stats?.goalsAgainst) || 0;

    // Delta like PUT: base = entered minus what existing matches already
    // explain (matched by name — the id is brand new). Seeding full entered
    // values here double-counts on the first recalc (see Ario Eslamshahr).
    const teamCalc = calcTeamBaseFor(currentDB.matches || [], item.id, item.name);
    item.basePlayed = Math.max(0, enteredPlayed - teamCalc.played);
    item.baseWon = Math.max(0, enteredWon - teamCalc.won);
    item.baseDrawn = Math.max(0, enteredDrawn - teamCalc.drawn);
    item.baseLost = Math.max(0, enteredLost - teamCalc.lost);
    item.basePoints = Math.max(0, enteredPoints - teamCalc.points);
    item.baseGoalsFor = Math.max(0, enteredGoalsFor - teamCalc.goalsFor);
    item.baseGoalsAgainst = Math.max(0, enteredGoalsAgainst - teamCalc.goalsAgainst);

    item.coach = req.body.coach || "";
    item.city = req.body.city || "";
    item.stadium = req.body.stadium || "";
    item.stadiumCapacity = req.body.stadiumCapacity || "";
    item.founded = req.body.founded || "";
    item.coverImage = req.body.coverImage || "";

    item.stats = {
      ...(item.stats || {}),
      played: enteredPlayed,
      won: enteredWon,
      drawn: enteredDrawn,
      lost: enteredLost,
      points: enteredPoints,
      goalsFor: enteredGoalsFor,
      goalsAgainst: enteredGoalsAgainst,
      coach: req.body.coach || "",
      city: req.body.city || "",
      stadium: req.body.stadium || "",
      stadiumCapacity: req.body.stadiumCapacity || "",
      founded: req.body.founded || ""
    };

    currentDB.teams.push(item);
    markTablesDirty("teams");
    await saveDB();
    res.json({ success: true });
  });

  app.put("/api/teams/:id", requirePermission("teams"), async (req: Request, res: Response) => {
    const currentDB = loadDB();
    const index = currentDB.teams.findIndex((t: any) => t.id === req.params.id);
    if (index !== -1) {
      const existingTeam = currentDB.teams[index];
      if (detectConflict(existingTeam, req.body.updatedAt)) {
        return res.status(409).json({ success: false, conflict: true, message: "این تیم پس از باز کردن فرم توسط شخص دیگری ویرایش شده است. لطفاً دوباره بارگذاری کنید.", current: existingTeam });
      }
      const updatedTeam = { ...existingTeam, ...stripServerManaged(req.body), updatedAt: new Date().toISOString() };

      let matchPlayed = 0;
      let matchWon = 0;
      let matchDrawn = 0;
      let matchLost = 0;
      let matchGoalsFor = 0;
      let matchGoalsAgainst = 0;
      let matchPoints = 0;

      const matchesList = currentDB.matches || [];
      matchesList.forEach((match: any) => {
        if (match.status !== "finished" || match.isAutoFinished) return;

        const isHome = match.teamHome === updatedTeam.name || match.teamHomeId === updatedTeam.id;
        const isAway = match.teamAway === updatedTeam.name || match.teamAwayId === updatedTeam.id;

        if (!isHome && !isAway) return;

        matchPlayed += 1;
        const hs = parseInt(String(match.scoreHome), 10) || 0;
        const as = parseInt(String(match.scoreAway), 10) || 0;

        const gf = isHome ? hs : as;
        const ga = isHome ? as : hs;

        matchGoalsFor += gf;
        matchGoalsAgainst += ga;

        if (gf > ga) {
          matchWon += 1;
          matchPoints += 3;
        } else if (gf < ga) {
          matchLost += 1;
        } else {
          matchDrawn += 1;
          matchPoints += 1;
        }
      });

      const enteredPlayed = parseInt(updatedTeam.stats?.played) || 0;
      const enteredWon = parseInt(updatedTeam.stats?.won) || 0;
      const enteredDrawn = parseInt(updatedTeam.stats?.drawn) || 0;
      const enteredLost = parseInt(updatedTeam.stats?.lost) || 0;
      const enteredPoints = parseInt(updatedTeam.stats?.points) || 0;
      const enteredGoalsFor = parseInt(updatedTeam.stats?.goalsFor) || 0;
      const enteredGoalsAgainst = parseInt(updatedTeam.stats?.goalsAgainst) || 0;

      updatedTeam.basePlayed = Math.max(0, enteredPlayed - matchPlayed);
      updatedTeam.baseWon = Math.max(0, enteredWon - matchWon);
      updatedTeam.baseDrawn = Math.max(0, enteredDrawn - matchDrawn);
      updatedTeam.baseLost = Math.max(0, enteredLost - matchLost);
      updatedTeam.basePoints = Math.max(0, enteredPoints - matchPoints);
      updatedTeam.baseGoalsFor = Math.max(0, enteredGoalsFor - matchGoalsFor);
      updatedTeam.baseGoalsAgainst = Math.max(0, enteredGoalsAgainst - matchGoalsAgainst);

      updatedTeam.coach = req.body.coach !== undefined ? req.body.coach : updatedTeam.coach || "";
      updatedTeam.city = req.body.city !== undefined ? req.body.city : updatedTeam.city || "";
      updatedTeam.stadium = req.body.stadium !== undefined ? req.body.stadium : updatedTeam.stadium || "";
      updatedTeam.stadiumCapacity = req.body.stadiumCapacity !== undefined ? req.body.stadiumCapacity : updatedTeam.stadiumCapacity || "";
      updatedTeam.founded = req.body.founded !== undefined ? req.body.founded : updatedTeam.founded || "";
      updatedTeam.coverImage = req.body.coverImage !== undefined ? req.body.coverImage : updatedTeam.coverImage || "";

      updatedTeam.stats = {
        ...(updatedTeam.stats || {}),
        played: enteredPlayed,
        won: enteredWon,
        drawn: enteredDrawn,
        lost: enteredLost,
        points: enteredPoints,
        goalsFor: enteredGoalsFor,
        goalsAgainst: enteredGoalsAgainst,
        coach: updatedTeam.coach,
        city: updatedTeam.city,
        stadium: updatedTeam.stadium,
        stadiumCapacity: updatedTeam.stadiumCapacity,
        founded: updatedTeam.founded
      };

      // Propagate name/logo changes to existing match snapshots and roster refs
      // so team cards and player profiles stay consistent after an edit.
      const prevName = existingTeam.name;
      const prevLogo = existingTeam.logo;
      if (updatedTeam.name !== prevName || updatedTeam.logo !== prevLogo) {
        (currentDB.matches || []).forEach((match: any) => {
          const isHome = match.teamHomeId === updatedTeam.id || (match.teamHome && match.teamHome === prevName);
          const isAway = match.teamAwayId === updatedTeam.id || (match.teamAway && match.teamAway === prevName);
          if (isHome) {
            if (updatedTeam.name !== prevName) match.teamHome = updatedTeam.name;
            if (updatedTeam.logo !== prevLogo) match.teamHomeLogo = updatedTeam.logo;
          }
          if (isAway) {
            if (updatedTeam.name !== prevName) match.teamAway = updatedTeam.name;
            if (updatedTeam.logo !== prevLogo) match.teamAwayLogo = updatedTeam.logo;
          }
        });
        if (updatedTeam.name !== prevName) {
          (currentDB.players || []).forEach((p: any) => {
            if (p.teamId === updatedTeam.id || (p.teamName && p.teamName === prevName)) p.teamName = updatedTeam.name;
          });
          (currentDB.coaches || []).forEach((c: any) => {
            if (c.teamId === updatedTeam.id || (c.teamName && c.teamName === prevName)) c.teamName = updatedTeam.name;
          });
        }
      }

      currentDB.teams[index] = updatedTeam;
      markTablesDirty("teams", "matches", "players", "coaches");
      await saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "تیم مورد نظر یافت نشد." });
    }
  });

  app.delete("/api/teams/:id", requirePermission("teams"), async (req: Request, res: Response) => {
    const currentDB = loadDB();
    currentDB.teams = currentDB.teams.filter((t: any) => t.id !== req.params.id);
    markTablesDirty("teams");
    await saveDB();
    res.json({ success: true });
  });

  app.post("/api/players", requirePermission("players"), async (req: Request, res: Response) => {
    const snapshot = snapshotDB();
    const currentDB = loadDB();
    const cleanBody = stripServerManaged(req.body);
    const item: any = {
      ...cleanBody,
      id: `player-${Date.now()}`
    };

    const enteredMatches = parseInt(item.seasonStats?.matches) || 0;
    const enteredGoals = parseInt(item.seasonStats?.goals) || 0;
    const enteredAssists = parseInt(item.seasonStats?.assists) || 0;
    const enteredCleanSheets = parseInt(item.seasonStats?.cleanSheets) || 0;
    const enteredYellow = parseInt(item.seasonStats?.yellowCards) || 0;
    const enteredRed = parseInt(item.seasonStats?.redCards) || 0;

    // Delta like PUT: a same-named player may already have event rows in
    // finished matches; seeding full entered values would double-count them.
    const playerCalc = getPlayerCalculatedStatsFromMatches(String(item.id), currentDB.matches || [], [...(currentDB.players || []), item]);
    item.baseMatches = Math.max(0, enteredMatches - playerCalc.matches);
    item.baseGoals = Math.max(0, enteredGoals - playerCalc.goals);
    item.baseAssists = Math.max(0, enteredAssists - playerCalc.assists);
    item.baseCleanSheets = Math.max(0, enteredCleanSheets - playerCalc.cleanSheets);
    item.baseYellowCards = Math.max(0, enteredYellow - playerCalc.yellowCards);
    item.baseRedCards = Math.max(0, enteredRed - playerCalc.redCards);

    // Shirt numbers were removed from the data model: never persist them,
    // even if a stale client still sends the legacy fields.
    delete (item as any).number;
    delete (item as any).shirt_number;

    item.seasonStats = {
      matches: enteredMatches,
      goals: enteredGoals,
      assists: enteredAssists,
      cleanSheets: enteredCleanSheets,
      yellowCards: enteredYellow,
      redCards: enteredRed
    };

    currentDB.players.push(item);
    // Create-bound ledger: a player born with a club gets a from-NULL
    // movement row, so tenure/career never fork (PUT path already guards).
    if (item.teamId != null && String(item.teamId) !== "") {
      const targetTeam = (currentDB.teams || []).find((t: any) => String(t.id) === String(item.teamId));
      if (!targetTeam) {
        restoreDB(snapshot);
        return res.status(404).json({ success: false, message: "تیم یافت نشد." });
      }
      item.teamName = targetTeam.name;
      const bodySeason = (req.body || {}).seasonId != null && String((req.body || {}).seasonId).trim() !== ""
        ? (currentDB.seasons || []).find((s: any) => String(s.id) === String((req.body || {}).seasonId).trim())
        : null;
      const activeSeason = (currentDB.seasons || []).find((s: any) => s.isActive || s.status === "current");
      const nowIso2 = new Date().toISOString();
      if (!Array.isArray(currentDB.playerMovements)) currentDB.playerMovements = [];
      currentDB.playerMovements.unshift({
        id: `pcm-${Date.now()}`,
        playerId: item.id,
        fromTeamId: null,
        toTeamId: String(item.teamId),
        seasonId: bodySeason ? String(bodySeason.id) : activeSeason ? String(activeSeason.id) : null,
        movementDate: nowIso2.slice(0, 10),
        note: "create",
        createdAt: nowIso2,
        updatedAt: nowIso2,
      });
    }
    try {
      markTablesDirty("players", "playerMovements");
      await saveDB();
      res.json({ success: true });
    } catch (err: any) {
      console.error("[PLAYER CREATE ERROR]", err?.message || err);
      restoreDB(snapshot);
      res.status(500).json({ success: false, message: "خطا در ذخیره‌سازی بازیکن.", detail: err?.message });
    }
  });

  app.put("/api/players/:id", requirePermission("players"), async (req: Request, res: Response) => {
    const snapshot = snapshotDB();
    const currentDB = loadDB();
    const index = currentDB.players.findIndex((p: any) => p.id === req.params.id);
    if (index !== -1) {
      const existingPlayer = currentDB.players[index];
      // Resolver heal context is audit-only: never persist it into the record.
      const { _heal, ...rest } = (req.body || {}) as any;
      const body = stripServerManaged(rest);
      if (detectConflict(existingPlayer, body.updatedAt)) {
        return res.status(409).json({ success: false, conflict: true, message: "این بازیکن پس از باز کردن فرم توسط شخص دیگری ویرایش شده است. لطفاً دوباره بارگذاری کنید.", current: existingPlayer });
      }
      const updatedPlayer = { ...existingPlayer, ...body, updatedAt: new Date().toISOString() };

      // Lifecycle guard: team changes must flow through the movement API
      // (ledger + atomicity). Direct teamId edits would fork the ledger.
      if (body.teamId !== undefined && String(body.teamId || "") !== String(existingPlayer.teamId || "")) {
        return res.status(409).json({
          success: false,
          bypass: true,
          message: "تغییر تیم باید از مسیر انتقال باشگاهی ثبت شود تا تاریخچه حفظ شود.",
        });
      }

      const matchesList = currentDB.matches || [];
      const matchStats = getPlayerCalculatedStatsFromMatches(String(updatedPlayer.id), matchesList, currentDB.players);

      const enteredMatches = parseInt(updatedPlayer.seasonStats?.matches) || 0;
      const enteredGoals = parseInt(updatedPlayer.seasonStats?.goals) || 0;
      const enteredAssists = parseInt(updatedPlayer.seasonStats?.assists) || 0;
      const enteredCleanSheets = parseInt(updatedPlayer.seasonStats?.cleanSheets) || 0;
      const enteredYellow = parseInt(updatedPlayer.seasonStats?.yellowCards) || 0;
      const enteredRed = parseInt(updatedPlayer.seasonStats?.redCards) || 0;

      updatedPlayer.baseMatches = Math.max(0, enteredMatches - matchStats.matches);
      updatedPlayer.baseGoals = Math.max(0, enteredGoals - matchStats.goals);
      updatedPlayer.baseAssists = Math.max(0, enteredAssists - matchStats.assists);
      updatedPlayer.baseCleanSheets = Math.max(0, enteredCleanSheets - matchStats.cleanSheets);
      updatedPlayer.baseYellowCards = Math.max(0, enteredYellow - matchStats.yellowCards);
      updatedPlayer.baseRedCards = Math.max(0, enteredRed - matchStats.redCards);

      // Shirt numbers were removed from the data model: never persist them,
      // even if a stale client still sends the legacy fields.
      delete (updatedPlayer as any).number;
      delete (updatedPlayer as any).shirt_number;

      updatedPlayer.seasonStats = {
        matches: enteredMatches,
        goals: enteredGoals,
        assists: enteredAssists,
        cleanSheets: enteredCleanSheets,
        yellowCards: enteredYellow,
        redCards: enteredRed
      };

      currentDB.players[index] = updatedPlayer;
      try {
        markTablesDirty("players");
        await saveDB();
        if (_heal) {
          try {
            auditLog({
              username: ((req as any).user || {}).username || "admin",
              role: ((req as any).user || {}).role,
              action: "resolver.heal.player",
              method: "PUT",
              path: `/api/players/${req.params.id}`,
              details: {
                playerId: req.params.id,
                heal: _heal,
                old: { seasonStats: existingPlayer.seasonStats, baseMatches: existingPlayer.baseMatches, baseGoals: existingPlayer.baseGoals, baseAssists: existingPlayer.baseAssists },
                new: { seasonStats: updatedPlayer.seasonStats, baseMatches: updatedPlayer.baseMatches, baseGoals: updatedPlayer.baseGoals, baseAssists: updatedPlayer.baseAssists },
              },
            });
          } catch { /* audit is fire-and-forget */ }
        }
        res.json({ success: true });
      } catch (err: any) {
        restoreDB(snapshot);
        res.status(500).json({ success: false, message: "خطا در بروزرسانی بازیکن." });
      }
    } else {
      res.status(404).json({ success: false, message: "بازیکن مورد نظر یافت نشد." });
    }
  });

  app.delete("/api/players/:id", requirePermission("players"), async (req: Request, res: Response) => {
    const currentDB = loadDB();
    currentDB.players = currentDB.players.filter((p: any) => p.id !== req.params.id);
    // Mirror ON DELETE CASCADE: movement ledger is append-only in saveDB, so
    // drop this player's rows from memory or the FK would reject the save.
    if (Array.isArray(currentDB.playerMovements)) {
      currentDB.playerMovements = currentDB.playerMovements.filter((m: any) => String(m.playerId) !== String(req.params.id));
    }
    markTablesDirty("players", "playerMovements");
    await saveDB();
    res.json({ success: true });
  });

  app.post("/api/coaches", requirePermission("coaches"), async (req: Request, res: Response) => {
    const snapshot = snapshotDB();
    const currentDB = loadDB();
    const cleanBody = stripServerManaged(req.body);
    const item: any = {
      ...cleanBody,
      id: `coach-${Date.now()}`
    };

    const enteredMatches = parseInt(item.seasonStats?.matches) || 0;
    const enteredWins = parseInt(item.seasonStats?.wins) || 0;
    const enteredDraws = parseInt(item.seasonStats?.draws) || 0;
    const enteredLosses = parseInt(item.seasonStats?.losses) || 0;

    // Delta like PUT: seeding full entered values double-counts on the first
    // recalc whenever tenure matches already exist for this name.
    const coachCalc = getCoachCalculatedStatsFromMatches(item, currentDB.matches || [], {
      coaches: [...(currentDB.coaches || []), item],
      movements: currentDB.coachMovements || [],
      teams: currentDB.teams || [],
      appointments: currentDB.coachAppointments || [],
    });
    item.baseMatches = Math.max(0, enteredMatches - coachCalc.matches);
    item.baseWins = Math.max(0, enteredWins - coachCalc.wins);
    item.baseDraws = Math.max(0, enteredDraws - coachCalc.draws);
    item.baseLosses = Math.max(0, enteredLosses - coachCalc.losses);

    item.seasonStats = {
      matches: enteredMatches,
      wins: enteredWins,
      draws: enteredDraws,
      losses: enteredLosses,
      winRate: enteredMatches > 0 ? parseFloat(((enteredWins / enteredMatches) * 100).toFixed(1)) : 0,
      goalsFor: item.seasonStats?.goalsFor || 0,
      goalsAgainst: item.seasonStats?.goalsAgainst || 0
    };

    if (item.teamId) {
      const team = currentDB.teams.find((t: any) => t.id === item.teamId);
      if (team) {
        if (!team.stats) team.stats = {};
        team.stats.coach = item.name;
        team.coach = item.name;
      }
    }

    // Create-bound ledger + occupancy (single-coach-path): a coach born with
    // a club goes through the lifecycle APPOINTMENT (validates occupancy and
    // writes events + appointment row). An occupied dugout 409s here instead
    // of violating the unique index at save time.
    if (item.teamId != null && String(item.teamId) !== "") {
      const targetTeam = (currentDB.teams || []).find((t: any) => String(t.id) === String(item.teamId));
      if (!targetTeam) {
        restoreDB(snapshot);
        return res.status(404).json({ success: false, message: "تیم یافت نشد." });
      }
      const incumbent = (currentDB.coaches || []).find(
        (c: any) => String(c.id) !== String(item.id) && c.teamId != null && String(c.teamId) === String(item.teamId)
      );
      if (incumbent) {
        restoreDB(snapshot);
        return res.status(409).json({ success: false, occupied: true, message: `این تیم هم‌اکنون مربی دارد (${incumbent.name}).` });
      }
      item.teamName = targetTeam.name;
    }

    currentDB.coaches.push(item);
    if (item.teamId != null && String(item.teamId) !== "") {
      const bodySeason = (req.body || {}).seasonId != null && String((req.body || {}).seasonId).trim() !== ""
        ? (currentDB.seasons || []).find((s: any) => String(s.id) === String((req.body || {}).seasonId).trim())
        : null;
      const activeSeason = (currentDB.seasons || []).find((s: any) => s.isActive || s.status === "current");
      const me = (req as any).user || {};
      const result = await recordLifecycleEvent(
        {
          personKind: "coach",
          personId: String(item.id),
          eventKind: "APPOINTMENT",
          teamId: String(item.teamId),
          seasonId: bodySeason ? String(bodySeason.id) : activeSeason ? String(activeSeason.id) : null,
          eventDate: new Date().toISOString().slice(0, 10),
        },
        { actor: me.username || "admin", path: "/api/coaches" }
      );
      if (!result.ok) {
        restoreDB(snapshot);
        return res.status(result.status).json(result.payload);
      }
      markTablesDirty("coaches", "teams");
      return res.status(201).json({ success: true });
    }
    try {
      markTablesDirty("coaches");
      await saveDB();
      res.json({ success: true });
    } catch (err: any) {
      restoreDB(snapshot);
      res.status(500).json({ success: false, message: "خطا در ذخیره‌سازی مربی." });
    }
  });

  app.put("/api/coaches/:id", requirePermission("coaches"), async (req: Request, res: Response) => {
    const snapshot = snapshotDB();
    const currentDB = loadDB();
    const index = currentDB.coaches.findIndex((c: any) => c.id === req.params.id);
    if (index !== -1) {
      const prevCoach = currentDB.coaches[index];
      if (detectConflict(prevCoach, req.body.updatedAt)) {
        return res.status(409).json({ success: false, conflict: true, message: "این مربی پس از باز کردن فرم توسط شخص دیگری ویرایش شده است. لطفاً دوباره بارگذاری کنید.", current: prevCoach });
      }
      const updatedCoach = { ...currentDB.coaches[index], ...stripServerManaged(req.body), updatedAt: new Date().toISOString() };

      // Lifecycle guard: team changes must flow through the movement API
      // (ledger + atomicity + occupancy). Direct teamId edits would fork
      // the ledger and bypass the unique-dugout rule.
      if (req.body.teamId !== undefined && String(req.body.teamId || "") !== String(prevCoach.teamId || "")) {
        return res.status(409).json({
          success: false,
          bypass: true,
          message: "تغییر تیم مربی باید از مسیر انتقال/انتصاب ثبت شود تا تاریخچه حفظ شود.",
        });
      }

      const enteredMatches = parseInt(updatedCoach.seasonStats?.matches) || 0;
      const enteredWins = parseInt(updatedCoach.seasonStats?.wins) || 0;
      const enteredDraws = parseInt(updatedCoach.seasonStats?.draws) || 0;
      const enteredLosses = parseInt(updatedCoach.seasonStats?.losses) || 0;

      const coachCalc = getCoachCalculatedStatsFromMatches(updatedCoach, currentDB.matches || [], {
        coaches: currentDB.coaches || [],
        movements: currentDB.coachMovements || [],
        teams: currentDB.teams || [],
      });
      updatedCoach.baseMatches = Math.max(0, enteredMatches - coachCalc.matches);
      updatedCoach.baseWins = Math.max(0, enteredWins - coachCalc.wins);
      updatedCoach.baseDraws = Math.max(0, enteredDraws - coachCalc.draws);
      updatedCoach.baseLosses = Math.max(0, enteredLosses - coachCalc.losses);

      updatedCoach.seasonStats = {
        matches: enteredMatches,
        wins: enteredWins,
        draws: enteredDraws,
        losses: enteredLosses,
        winRate: enteredMatches > 0 ? parseFloat(((enteredWins / enteredMatches) * 100).toFixed(1)) : 0,
        goalsFor: updatedCoach.seasonStats?.goalsFor || 0,
        goalsAgainst: updatedCoach.seasonStats?.goalsAgainst || 0
      };

      if (prevCoach.teamId && prevCoach.teamId !== updatedCoach.teamId) {
        const prevTeam = currentDB.teams.find((t: any) => t.id === prevCoach.teamId);
        if (prevTeam) {
          const stillAssigned = currentDB.coaches.some((c: any) => c.id !== updatedCoach.id && c.teamId === prevCoach.teamId);
          if (!stillAssigned) {
            if (prevTeam.stats) prevTeam.stats.coach = "";
            prevTeam.coach = "";
          }
        }
      }

      if (updatedCoach.teamId) {
        const team = currentDB.teams.find((t: any) => t.id === updatedCoach.teamId);
        if (team) {
          if (!team.stats) team.stats = {};
          team.stats.coach = updatedCoach.name;
          team.coach = updatedCoach.name;
        }
      } else if (updatedCoach.teamName) {
        const team = currentDB.teams.find((t: any) => t.name === updatedCoach.teamName);
        if (team) {
          if (!team.stats) team.stats = {};
          team.stats.coach = updatedCoach.name;
          team.coach = updatedCoach.name;
        }
      }

      currentDB.coaches[index] = updatedCoach;
      try {
        markTablesDirty("coaches", "teams");
        await saveDB();
        res.json({ success: true });
      } catch (err: any) {
        restoreDB(snapshot);
        res.status(500).json({ success: false, message: "خطا در بروزرسانی مربی." });
      }
    } else {
      res.status(404).json({ success: false, message: "مربی مورد نظر یافت نشد." });
    }
  });

  app.delete("/api/coaches/:id", requirePermission("coaches"), async (req: Request, res: Response) => {
    const currentDB = loadDB();
    const deletedCoach = currentDB.coaches.find((c: any) => c.id === req.params.id);
    if (deletedCoach && deletedCoach.teamId) {
      const team = currentDB.teams.find((t: any) => t.id === deletedCoach.teamId);
      if (team) {
        if (team.stats) team.stats.coach = "";
        team.coach = "";
      }
    }
    currentDB.coaches = currentDB.coaches.filter((c: any) => c.id !== req.params.id);
    // Mirror ON DELETE CASCADE (see player delete above).
    if (Array.isArray(currentDB.coachMovements)) {
      currentDB.coachMovements = currentDB.coachMovements.filter((m: any) => String(m.coachId) !== String(req.params.id));
    }
    markTablesDirty("coaches", "teams", "coachMovements");
    await saveDB();
    res.json({ success: true });
  });
}
