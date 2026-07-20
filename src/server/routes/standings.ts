import express, { Express, Request, Response } from "express";
import { loadDB } from "../state";
import { logMessage } from "../utils/logger";
import { normalizePersianString } from "../utils/persian";
import { saveDB } from "../services/database";
import { getPlayerCalculatedStatsFromMatches } from "../services/stats";

export function registerStandingsRoutes(app: Express) {
  app.put("/api/standings/:leagueKey", async (req: Request, res: Response) => {
    const { leagueKey } = req.params;
    const { rows } = req.body;
    const currentDB = loadDB();

    if (Array.isArray(rows)) {
      rows.forEach((row: any) => {
        const teamName = row.team || row.teamName;
        const index = currentDB.teams.findIndex((t: any) =>
          normalizePersianString(t.name) === normalizePersianString(teamName) || t.id === row.id
        );
        if (index !== -1) {
          const team = currentDB.teams[index];
          row.team = team.name;

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

            const normHome = normalizePersianString(match.teamHome || "");
            const normAway = normalizePersianString(match.teamAway || "");
            const normTeam = normalizePersianString(team.name || "");
            const isHome = normHome === normTeam || match.teamHomeId === team.id;
            const isAway = normAway === normTeam || match.teamAwayId === team.id;

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

          const enteredPlayed = parseInt(row.played) || 0;
          const enteredWon = parseInt(row.won) || 0;
          const enteredDrawn = parseInt(row.drawn) || 0;
          const enteredLost = parseInt(row.lost) || 0;
          const enteredPoints = parseInt(row.points) || 0;
          const enteredGoalsFor = parseInt(row.goalsFor) || 0;
          const enteredGoalsAgainst = parseInt(row.goalsAgainst) || 0;

          team.basePlayed = Math.max(0, enteredPlayed - matchPlayed);
          team.baseWon = Math.max(0, enteredWon - matchWon);
          team.baseDrawn = Math.max(0, enteredDrawn - matchDrawn);
          team.baseLost = Math.max(0, enteredLost - matchLost);
          team.basePoints = Math.max(0, enteredPoints - matchPoints);
          team.baseGoalsFor = Math.max(0, enteredGoalsFor - matchGoalsFor);
          team.baseGoalsAgainst = Math.max(0, enteredGoalsAgainst - matchGoalsAgainst);

          team.stats = {
            played: enteredPlayed,
            won: enteredWon,
            drawn: enteredDrawn,
            lost: enteredLost,
            points: enteredPoints,
            goalsFor: enteredGoalsFor,
            goalsAgainst: enteredGoalsAgainst
          };
        }
      });
    }

    currentDB.standings[leagueKey] = rows;
    await saveDB();
    res.json({ success: true });
  });

  app.put("/api/stats/:leagueKey", async (req: Request, res: Response) => {
    const { leagueKey } = req.params;
    const { data } = req.body;
    const currentDB = loadDB();

    const allStagedMatches: any[] = [];
    const sports = ["football", "futsal"];
    const stages = ["Feature_Games", "Now_Games", "Finished_Games"];
    sports.forEach(sport => {
      stages.forEach(stage => {
        const arr = currentDB[`${sport}_${stage}`] || [];
        arr.forEach((m: any) => {
          allStagedMatches.push({ ...m, sport, stage });
        });
      });
    });
    const matchIdMap = new Map<string, any>();
    allStagedMatches.forEach(m => {
      const existing = matchIdMap.get(m.id);
      if (!existing || m.stage !== "Feature_Games") {
        matchIdMap.set(m.id, m);
      }
    });
    const activeMatches = Array.from(matchIdMap.values());

    if (data) {
      if (Array.isArray(data.scorers)) {
        data.scorers.forEach((sc: any) => {
          const player = currentDB.players.find((p: any) =>
            normalizePersianString(p.name) === normalizePersianString(sc.name) &&
            (!sc.team || normalizePersianString(p.teamName || "") === normalizePersianString(sc.team))
          );
          if (player) {
            if (!player.seasonStats) player.seasonStats = {};
            const newGoals = parseInt(sc.goals) || 0;
            const oldGoals = parseInt(player.seasonStats.goals) || 0;
            if (newGoals !== oldGoals) {
              player.seasonStats.goals = newGoals;
              const calculatedGoals = getPlayerCalculatedStatsFromMatches(String(player.id), activeMatches, currentDB.players).goals;
              player.baseGoals = Math.max(0, newGoals - calculatedGoals);
            }
          }
        });
      }

      if (Array.isArray(data.assists)) {
        data.assists.forEach((as: any) => {
          const player = currentDB.players.find((p: any) =>
            normalizePersianString(p.name) === normalizePersianString(as.name) &&
            (!as.team || normalizePersianString(p.teamName || "") === normalizePersianString(as.team))
          );
          if (player) {
            if (!player.seasonStats) player.seasonStats = {};
            const newAssists = parseInt(as.assists) || 0;
            const oldAssists = parseInt(player.seasonStats.assists) || 0;
            if (newAssists !== oldAssists) {
              player.seasonStats.assists = newAssists;
              const calculatedAssists = getPlayerCalculatedStatsFromMatches(String(player.id), activeMatches, currentDB.players).assists;
              player.baseAssists = Math.max(0, newAssists - calculatedAssists);
            }
          }
        });
      }
    }

    currentDB.stats[leagueKey] = data;
    await saveDB();
    res.json({ success: true });
  });
}
