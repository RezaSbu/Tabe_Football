import express, { Express, Request, Response } from "express";
import { loadDB, snapshotDB, restoreDB } from "../state";
import { logMessage } from "../utils/logger";
import { saveDB } from "../services/database";
import { getPlayerCalculatedStatsFromMatches } from "../services/stats";

export function registerTeamRoutes(app: Express) {
  app.post("/api/teams", async (req: Request, res: Response) => {
    const currentDB = loadDB();
    const idPrefix = req.body.sport === "futsal" ? "futsal" : "team";
    const item = {
      ...req.body,
      id: `${idPrefix}-${Date.now()}`
    };

    const enteredPlayed = parseInt(item.stats?.played) || 0;
    const enteredWon = parseInt(item.stats?.won) || 0;
    const enteredDrawn = parseInt(item.stats?.drawn) || 0;
    const enteredLost = parseInt(item.stats?.lost) || 0;
    const enteredPoints = parseInt(item.stats?.points) || 0;
    const enteredGoalsFor = parseInt(item.stats?.goalsFor) || 0;
    const enteredGoalsAgainst = parseInt(item.stats?.goalsAgainst) || 0;

    item.basePlayed = enteredPlayed;
    item.baseWon = enteredWon;
    item.baseDrawn = enteredDrawn;
    item.baseLost = enteredLost;
    item.basePoints = enteredPoints;
    item.baseGoalsFor = enteredGoalsFor;
    item.baseGoalsAgainst = enteredGoalsAgainst;

    item.coach = req.body.coach || "";
    item.city = req.body.city || "";
    item.stadium = req.body.stadium || "";
    item.stadiumCapacity = req.body.stadiumCapacity || "";
    item.founded = req.body.founded || "";

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
    await saveDB();
    res.json({ success: true });
  });

  app.put("/api/teams/:id", async (req: Request, res: Response) => {
    const currentDB = loadDB();
    const index = currentDB.teams.findIndex((t: any) => t.id === req.params.id);
    if (index !== -1) {
      const updatedTeam = { ...currentDB.teams[index], ...req.body };

      let matchPlayed = 0;
      let matchWon = 0;
      let matchDrawn = 0;
      let matchLost = 0;
      let matchGoalsFor = 0;
      let matchGoalsAgainst = 0;
      let matchPoints = 0;

      const matchesList = currentDB.matches || [];
      matchesList.forEach((match: any) => {
        if (match.status !== "finished") return;

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

      currentDB.teams[index] = updatedTeam;
      await saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "تیم مورد نظر یافت نشد." });
    }
  });

  app.delete("/api/teams/:id", async (req: Request, res: Response) => {
    const currentDB = loadDB();
    currentDB.teams = currentDB.teams.filter((t: any) => t.id !== req.params.id);
    await saveDB();
    res.json({ success: true });
  });

  app.post("/api/players", async (req: Request, res: Response) => {
    const snapshot = snapshotDB();
    const currentDB = loadDB();
    const item = {
      ...req.body,
      id: `player-${Date.now()}`
    };

    const enteredMatches = parseInt(item.seasonStats?.matches) || 0;
    const enteredGoals = parseInt(item.seasonStats?.goals) || 0;
    const enteredAssists = parseInt(item.seasonStats?.assists) || 0;
    const enteredCleanSheets = parseInt(item.seasonStats?.cleanSheets) || 0;
    const enteredYellow = parseInt(item.seasonStats?.yellowCards) || 0;
    const enteredRed = parseInt(item.seasonStats?.redCards) || 0;

    item.baseMatches = enteredMatches;
    item.baseGoals = enteredGoals;
    item.baseAssists = enteredAssists;
    item.baseCleanSheets = enteredCleanSheets;
    item.baseYellowCards = enteredYellow;
    item.baseRedCards = enteredRed;

    const resolvedShirtNumber = req.body.number !== undefined && req.body.number !== "" ? req.body.number : (req.body.shirt_number || null);
    item.shirt_number = resolvedShirtNumber;
    item.number = resolvedShirtNumber;

    item.seasonStats = {
      matches: enteredMatches,
      goals: enteredGoals,
      assists: enteredAssists,
      cleanSheets: enteredCleanSheets,
      yellowCards: enteredYellow,
      redCards: enteredRed
    };

    currentDB.players.push(item);
    try {
      await saveDB();
      res.json({ success: true });
    } catch (err: any) {
      console.error("[PLAYER CREATE ERROR]", err?.message || err);
      restoreDB(snapshot);
      res.status(500).json({ success: false, message: "خطا در ذخیره‌سازی بازیکن.", detail: err?.message });
    }
  });

  app.put("/api/players/:id", async (req: Request, res: Response) => {
    const snapshot = snapshotDB();
    const currentDB = loadDB();
    const index = currentDB.players.findIndex((p: any) => p.id === req.params.id);
    if (index !== -1) {
      const updatedPlayer = { ...currentDB.players[index], ...req.body };

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

      const resolvedShirtNumber = req.body.number !== undefined && req.body.number !== "" ? req.body.number : (req.body.shirt_number || null);
      updatedPlayer.shirt_number = resolvedShirtNumber;
      updatedPlayer.number = resolvedShirtNumber;

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
        await saveDB();
        res.json({ success: true });
      } catch (err: any) {
        restoreDB(snapshot);
        res.status(500).json({ success: false, message: "خطا در بروزرسانی بازیکن." });
      }
    } else {
      res.status(404).json({ success: false, message: "بازیکن مورد نظر یافت نشد." });
    }
  });

  app.delete("/api/players/:id", async (req: Request, res: Response) => {
    const currentDB = loadDB();
    currentDB.players = currentDB.players.filter((p: any) => p.id !== req.params.id);
    await saveDB();
    res.json({ success: true });
  });

  app.post("/api/coaches", async (req: Request, res: Response) => {
    const snapshot = snapshotDB();
    const currentDB = loadDB();
    const item = {
      ...req.body,
      id: `coach-${Date.now()}`
    };

    const enteredMatches = parseInt(item.seasonStats?.matches) || 0;
    const enteredWins = parseInt(item.seasonStats?.wins) || 0;
    const enteredDraws = parseInt(item.seasonStats?.draws) || 0;
    const enteredLosses = parseInt(item.seasonStats?.losses) || 0;

    item.baseMatches = enteredMatches;
    item.baseWins = enteredWins;
    item.baseDraws = enteredDraws;
    item.baseLosses = enteredLosses;

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

    currentDB.coaches.push(item);
    try {
      await saveDB();
      res.json({ success: true });
    } catch (err: any) {
      restoreDB(snapshot);
      res.status(500).json({ success: false, message: "خطا در ذخیره‌سازی مربی." });
    }
  });

  app.put("/api/coaches/:id", async (req: Request, res: Response) => {
    const snapshot = snapshotDB();
    const currentDB = loadDB();
    const index = currentDB.coaches.findIndex((c: any) => c.id === req.params.id);
    if (index !== -1) {
      const updatedCoach = { ...currentDB.coaches[index], ...req.body };

      const enteredMatches = parseInt(updatedCoach.seasonStats?.matches) || 0;
      const enteredWins = parseInt(updatedCoach.seasonStats?.wins) || 0;
      const enteredDraws = parseInt(updatedCoach.seasonStats?.draws) || 0;
      const enteredLosses = parseInt(updatedCoach.seasonStats?.losses) || 0;

      updatedCoach.baseMatches = enteredMatches;
      updatedCoach.baseWins = enteredWins;
      updatedCoach.baseDraws = enteredDraws;
      updatedCoach.baseLosses = enteredLosses;

      updatedCoach.seasonStats = {
        matches: enteredMatches,
        wins: enteredWins,
        draws: enteredDraws,
        losses: enteredLosses,
        winRate: enteredMatches > 0 ? parseFloat(((enteredWins / enteredMatches) * 100).toFixed(1)) : 0,
        goalsFor: updatedCoach.seasonStats?.goalsFor || 0,
        goalsAgainst: updatedCoach.seasonStats?.goalsAgainst || 0
      };

      if (updatedCoach.teamId) {
        const team = currentDB.teams.find((t: any) => t.id === updatedCoach.teamId);
        if (team) {
          if (!team.stats) team.stats = {};
          team.stats.coach = updatedCoach.name;
          team.coach = updatedCoach.name;
        }
      }

      currentDB.coaches[index] = updatedCoach;
      try {
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

  app.delete("/api/coaches/:id", async (req: Request, res: Response) => {
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
    await saveDB();
    res.json({ success: true });
  });
}
