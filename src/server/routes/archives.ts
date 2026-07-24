import express, { Express, Request, Response } from "express";
import { loadDB } from "../state";
import { logMessage } from "../utils/logger";
import { normalizePersianString } from "../utils/persian";
import { saveDB } from "../services/database";
import { recalculateAndSyncDatabase } from "../services/stats";

function getTeamLeague(teams: any[], teamId: string, teamName?: string): string {
  const teamObj = teams.find((t: any) =>
    (teamId && t.id === teamId) ||
    (teamName && normalizePersianString(t.name) === normalizePersianString(teamName))
  );
  if (teamObj && teamObj.divisionKey) {
    return teamObj.divisionKey;
  }

  const id = (teamId || "").toLowerCase();
  const name = (teamName || "").toLowerCase();
  if (id.includes("sungun") || id.includes("giti") || name.includes("فوتسال") || name.includes("سونگون") || name.includes("گیتی")) {
    return "futsal";
  }
  if (id.includes("mesrafsanjan") || id.includes("nassaji") || id.includes("zobahan") || name.includes("نساجی") || name.includes("رفسنجان") || name.includes("ذوب") || id.includes("golgohar") || name.includes("گل‌گهر") || name.includes("گل گهر")) {
    return "league-1";
  }
  const league2Keywords = [
    "foolad", "فولاد", "نوشهر", "کویر مقوا", "نیروی زمینی", "بعثت", "پاس همدان", "سپیدرود", "چوکا",
    "داماش", "شاهین بوشهر", "شهرداری بم", "مس نوین", "اترک", "اسپاد", "آریو بهمن", "بابلسر"
  ];
  if (league2Keywords.some(keyword => id.includes(keyword) || name.includes(keyword))) {
    return "league-2";
  }
  return "pro-league";
}

export function registerArchiveRoutes(app: Express) {
  app.get("/api/archives", (req: Request, res: Response) => {
    const currentDB = loadDB();
    res.json({ status: "ok", archives: currentDB.archives || [] });
  });

  app.post("/api/current-season", async (req: Request, res: Response) => {
    const { currentSeason } = req.body;
    if (!currentSeason || !String(currentSeason).trim()) {
      return res.status(400).json({ error: "تگ فصل جاری الزامی است." });
    }

    const cleanSeason = String(currentSeason).trim();
    logMessage("info", "api", `تغییر مستقیم فصل جاری سیستم به: ${cleanSeason}`);

    try {
      const currentDB = loadDB();
      currentDB.currentSeason = cleanSeason;
      await saveDB();
      res.json({ success: true, currentSeason: cleanSeason });
    } catch (err: any) {
      console.error("Failed to update current season", err);
      res.status(500).json({ error: "خطا در بروزرسانی فصل جاری." });
    }
  });

  app.post("/api/archives", async (req: Request, res: Response) => {
    const { type, season_tag, new_current_season } = req.body;
    if (!type || !season_tag) {
      return res.status(400).json({ error: "نوع آرشیو و تگ فصل الزامی می‌باشند." });
    }

    logMessage("info", "api", `درخواست ایجاد آرشیو از نوع ${type} با تگ فصل: ${season_tag} و تگ فصل جاری جدید: ${new_current_season || "بدون تغییر"}`);

    try {
      const currentDB = loadDB();
      if (!currentDB.archives) {
        currentDB.archives = [];
      }

      if (new_current_season && new_current_season.trim()) {
        currentDB.currentSeason = new_current_season.trim();
      }

      if (Array.isArray(currentDB.players)) {
        currentDB.players.forEach((p: any) => {
          if (!p.careerHistory) p.careerHistory = [];

          const sStats = p.seasonStats || {};
          const matches = sStats.matches || 0;
          const goals = sStats.goals || 0;
          const assists = sStats.assists || 0;

          if (matches > 0 || goals > 0 || assists > 0 || (p.teamName && p.teamName !== "بازیکن آزاد")) {
            const existingIdx = p.careerHistory.findIndex((h: any) => h.season === season_tag);
            const historyEntry = {
              season: season_tag,
              club: p.teamName || "بدون باشگاه",
              apps: parseInt(matches) || 0,
              goals: parseInt(goals) || 0,
              assists: parseInt(assists) || 0,
              cleanSheets: parseInt(sStats.cleanSheets) || 0,
              yellowCards: parseInt(sStats.yellowCards) || 0,
              redCards: parseInt(sStats.redCards) || 0,
              averageRating: parseFloat(sStats.averageRating || p.averageRating) || 7.0
            };

            if (existingIdx >= 0) {
              const existing = p.careerHistory[existingIdx];
              if (historyEntry.apps > 0 || (existing.apps || 0) === 0) {
                p.careerHistory[existingIdx] = {
                  ...existing,
                  ...historyEntry
                };
              }
            } else {
              p.careerHistory.push(historyEntry);
            }
          }
        });
      }

      if (Array.isArray(currentDB.coaches)) {
        currentDB.coaches.forEach((c: any) => {
          if (!c.careerHistory) c.careerHistory = [];
          const stats = c.seasonStats || {};
          const matches = stats.matches || 0;
          const wins = stats.wins || 0;
          const draws = stats.draws || 0;
          const losses = stats.losses || 0;
          const winRate = stats.winRate || (matches > 0 ? parseFloat(((wins / matches) * 100).toFixed(1)) : 0);
          const goalsFor = stats.goalsFor || 0;
          const goalsAgainst = stats.goalsAgainst || 0;

          if (matches > 0 || (c.teamName && c.teamName !== "بدون باشگاه")) {
            const existingIdx = c.careerHistory.findIndex((h: any) => h.season === season_tag);
            const historyEntry = {
              season: season_tag,
              club: c.teamName || "بدون باشگاه",
              apps: parseInt(matches) || 0,
              wins: parseInt(wins) || 0,
              draws: parseInt(draws) || 0,
              losses: parseInt(losses) || 0,
              goalsFor: parseInt(goalsFor) || 0,
              goalsAgainst: parseInt(goalsAgainst) || 0,
              winRate: parseFloat(winRate) || 0
            };

            if (existingIdx >= 0) {
              const existing = c.careerHistory[existingIdx];
              if (historyEntry.apps > 0 || (existing.apps || 0) === 0) {
                c.careerHistory[existingIdx] = {
                  ...existing,
                  ...historyEntry
                };
              }
            } else {
              c.careerHistory.push(historyEntry);
            }

            if (!c.teamHistory) c.teamHistory = [];
            const years = season_tag.split("-");
            const hasTeamHistory = c.teamHistory.some((th: any) => th.teamName === c.teamName && (th.startYear === years[0] || th.endYear === years[1]));
            if (!hasTeamHistory && c.teamName) {
              c.teamHistory.push({
                teamId: c.teamId || "",
                teamName: c.teamName,
                startYear: years[0] || "",
                endYear: years[1] || "",
                role: "سرمربی"
              });
            }
          }
        });
      }

      if (!currentDB.archives) currentDB.archives = [];

      const upsertArchive = (arcType: string, data: any) => {
        const dupIdx = currentDB.archives.findIndex((a: any) => a.type === arcType && a.season_tag === season_tag);
        const id = dupIdx >= 0 ? currentDB.archives[dupIdx].id : `arc-${arcType}-${season_tag}-${Date.now()}`;

        let finalData = data;
        if (arcType === "matches" && dupIdx >= 0) {
          const existingMatches = currentDB.archives[dupIdx].data || [];
          const newMatches = data || [];
          const mergedMap = new Map<string, any>();
          existingMatches.forEach((m: any) => {
            if (m && m.id) mergedMap.set(String(m.id), m);
          });
          newMatches.forEach((m: any) => {
            if (m && m.id) mergedMap.set(String(m.id), m);
          });
          finalData = Array.from(mergedMap.values());
        }

        const newArc = {
          id,
          season_tag,
          type: arcType,
          data: finalData,
          createdAt: new Date().toISOString()
        };
        if (dupIdx >= 0) {
          currentDB.archives[dupIdx] = newArc;
        } else {
          currentDB.archives.unshift(newArc);
        }

        const sameTypeArchives = currentDB.archives.filter((a: any) => a.type === arcType);
        if (sameTypeArchives.length > 5) {
          sameTypeArchives.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const keepers = sameTypeArchives.slice(0, 5);
          const keeperIds = new Set(keepers.map((k: any) => k.id));
          currentDB.archives = currentDB.archives.filter((a: any) => a.type !== arcType || keeperIds.has(a.id));
          logMessage("info", "database", `بیش از ۵ آرشیو برای نوع ${arcType} یافت شد. قدیمی‌ترین آرشیو حذف گردید.`);
        }
      };

      if (type === "stats") {
        const statsLeagues = ["pro-league", "league-1", "league-2", "hazfi-cup", "futsal"];
        if (!currentDB.stats) currentDB.stats = {};

        statsLeagues.forEach((leagueKey) => {
          let eligiblePlayers: any[];

          if (leagueKey === "hazfi-cup") {
            eligiblePlayers = currentDB.players.filter((p: any) => {
              const cStats = p.cupStats || {};
              return (cStats.goals > 0 || cStats.assists > 0 || cStats.cleanSheets > 0);
            });
          } else {
            eligiblePlayers = currentDB.players.filter((p: any) => getTeamLeague(currentDB.teams, p.teamId, p.teamName) === leagueKey);
          }

          const scorers = [...eligiblePlayers]
            .map((p: any) => {
              const goals = leagueKey === "hazfi-cup" ? (p.cupStats?.goals || 0) : (p.leagueStats?.goals || 0);
              return { p, goals };
            })
            .filter((item: any) => item.goals > 0)
            .sort((a: any, b: any) => b.goals - a.goals)
            .slice(0, 10)
            .map((item: any, idx: number) => ({
              rank: idx + 1,
              name: item.p.name,
              team: item.p.teamName,
              goals: item.goals,
              penalties: 0
            }));

          const assists = [...eligiblePlayers]
            .map((p: any) => {
              const assists = leagueKey === "hazfi-cup" ? (p.cupStats?.assists || 0) : (p.leagueStats?.assists || 0);
              return { p, assists };
            })
            .filter((item: any) => item.assists > 0)
            .sort((a: any, b: any) => b.assists - a.assists)
            .slice(0, 10)
            .map((item: any, idx: number) => ({
              rank: idx + 1,
              name: item.p.name,
              team: item.p.teamName,
              assists: item.assists
            }));

          const cleansheets = [...eligiblePlayers]
            .map((p: any) => {
              const cleanSheets = leagueKey === "hazfi-cup" ? (p.cupStats?.cleanSheets || 0) : (p.leagueStats?.cleanSheets || 0);
              return { p, cleanSheets };
            })
            .filter((item: any) => item.p.position?.includes("دروازه") && item.cleanSheets > 0)
            .sort((a: any, b: any) => b.cleanSheets - a.cleanSheets)
            .slice(0, 10)
            .map((item: any, idx: number) => ({
              rank: idx + 1,
              name: item.p.name,
              team: item.p.teamName,
              cleanSheets: item.cleanSheets
            }));

          const ratings = [...eligiblePlayers]
            .map((p: any) => {
              const rating = leagueKey === "hazfi-cup" ? (p.cupStats?.averageRating || p.averageRating || 0) : (p.leagueStats?.averageRating || p.averageRating || 0);
              return { p, rating };
            })
            .filter((item: any) => item.rating > 0)
            .sort((a: any, b: any) => b.rating - a.rating)
            .slice(0, 10)
            .map((item: any, idx: number) => ({
              rank: idx + 1,
              name: item.p.name,
              team: item.p.teamName,
              rating: item.rating
            }));

          currentDB.stats[leagueKey] = { scorers, assists, cleansheets, ratings };
        });

        upsertArchive("stats", JSON.parse(JSON.stringify(currentDB.stats)));
        upsertArchive("players", JSON.parse(JSON.stringify(currentDB.players || [])));
        upsertArchive("coaches", JSON.parse(JSON.stringify(currentDB.coaches || [])));
        const activeMatches = (currentDB.matches || []).filter((m: any) => m.status !== "archived");
        upsertArchive("matches", JSON.parse(JSON.stringify(activeMatches)));

      } else if (type === "standings") {
        const standingsLeagues = ["pro-league", "league-1", "league-2-group-a", "league-2-group-b", "futsal"];
        if (!currentDB.standings) currentDB.standings = {};

        standingsLeagues.forEach((lKey) => {
          const existingList = Array.isArray(currentDB.standings[lKey]) ? currentDB.standings[lKey] : [];
          const activeTeamsForLeague = currentDB.teams.filter((t: any) => {
            const teamAssignedLeague = getTeamLeague(currentDB.teams, t.id, t.name);
            if (teamAssignedLeague === "league-2") {
              return lKey === "league-2-group-a";
            }
            return teamAssignedLeague === lKey;
          });

          const newList: any[] = activeTeamsForLeague.map((t: any) => {
            const existingRow = existingList.find((row: any) =>
              (row.id && row.id === t.id) ||
              normalizePersianString(row.team) === normalizePersianString(t.name)
            );

            return {
              rank: existingRow?.rank || 1,
              id: t.id,
              team: t.name,
              played: t.stats?.played || 0,
              won: t.stats?.won || 0,
              drawn: t.stats?.drawn || 0,
              lost: t.stats?.lost || 0,
              goalsFor: t.stats?.goalsFor || 0,
              goalsAgainst: t.stats?.goalsAgainst || 0,
              goalDifference: (t.stats?.goalsFor || 0) - (t.stats?.goalsAgainst || 0),
              points: t.stats?.points || 0
            };
          });

          newList.sort((a: any, b: any) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
          });

          newList.forEach((row: any, index: number) => {
            row.rank = index + 1;
          });

          currentDB.standings[lKey] = newList;
        });

        upsertArchive("standings", JSON.parse(JSON.stringify(currentDB.standings)));
        const standingsLeaguesForMatches = ["pro-league", "league-1", "league-2", "league-2-group-a", "league-2-group-b", "futsal"];
        const activeMatches = (currentDB.matches || []).filter((m: any) => standingsLeaguesForMatches.includes(m.league) && m.status !== "archived");
        upsertArchive("matches", JSON.parse(JSON.stringify(activeMatches)));

      } else if (type === "bracket") {
        const bracketData = JSON.parse(JSON.stringify(currentDB.bracket));

        if (currentDB.stats && currentDB.stats["hazfi-cup"]) {
          bracketData.stats = JSON.parse(JSON.stringify(currentDB.stats["hazfi-cup"]));
        }

        upsertArchive("bracket", bracketData);
        const activeMatches = (currentDB.matches || []).filter((m: any) => m.league === "hazfi-cup" && m.status !== "archived");
        upsertArchive("matches", JSON.parse(JSON.stringify(activeMatches)));
      }

      if (type === "stats") {
        currentDB.players.forEach((p: any) => {
          p.baseMatches = 0;
          p.baseGoals = 0;
          p.baseAssists = 0;
          p.baseCleanSheets = 0;
          p.baseYellowCards = 0;
          p.baseRedCards = 0;
          p.seasonStats = {
            matches: 0,
            goals: 0,
            assists: 0,
            cleanSheets: 0,
            yellowCards: 0,
            redCards: 0,
            minutes: 0,
            mvps: 0,
            averageRating: 0
          };
          p.ratingsHistory = [];
          p.leagueStats = { matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 };
          p.cupStats = { matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 };
        });

        if (Array.isArray(currentDB.coaches)) {
          currentDB.coaches.forEach((c: any) => {
            c.baseMatches = 0;
            c.baseWins = 0;
            c.baseDraws = 0;
            c.baseLosses = 0;
            c.seasonStats = {
              matches: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              winRate: 0,
              goalsFor: 0,
              goalsAgainst: 0
            };
            c.recentForm = [];
          });
        }

        if (currentDB.stats) {
          for (const key of Object.keys(currentDB.stats)) {
            currentDB.stats[key] = {
              scorers: [],
              assists: [],
              cleansheets: [],
              ratings: []
            };
          }
        }

        if (Array.isArray(currentDB.matches)) {
          currentDB.matches.forEach((m: any) => {
            if (m && m.status === "finished") {
              m.archived_stats = true;
              if (m.league === "hazfi-cup") {
                if (m.archived_bracket) m.status = "archived";
              } else {
                if (m.archived_standings) m.status = "archived";
              }
            }
          });
        }

        const stagedKeys = [
          "football_Finished_Games", "futsal_Finished_Games",
          "football_Now_Games", "futsal_Now_Games",
          "football_Feature_Games", "futsal_Feature_Games"
        ];
        stagedKeys.forEach(k => {
          if (Array.isArray(currentDB[k])) {
            currentDB[k].forEach((m: any) => {
              if (m && m.status === "finished") {
                m.archived_stats = true;
                if (m.league === "hazfi-cup") {
                  if (m.archived_bracket) m.status = "archived";
                } else {
                  if (m.archived_standings) m.status = "archived";
                }
              }
            });
            currentDB[k] = currentDB[k].filter((m: any) => m.status !== "archived");
          }
        });

      } else if (type === "standings") {
        currentDB.teams.forEach((t: any) => {
          t.basePlayed = 0;
          t.baseWon = 0;
          t.baseDrawn = 0;
          t.baseLost = 0;
          t.basePoints = 0;
          t.baseGoalsFor = 0;
          t.baseGoalsAgainst = 0;
          t.stats = {
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            points: 0,
            goalsFor: 0,
            goalsAgainst: 0
          };
          t.recentForm = [];
          t.recentMatches = [];
        });

        if (Array.isArray(currentDB.players)) {
          currentDB.players.forEach((p: any) => {
            p.baseMatches = 0;
            p.baseGoals = 0;
            p.baseAssists = 0;
            p.baseCleanSheets = 0;
            p.baseYellowCards = 0;
            p.baseRedCards = 0;
            p.leagueStats = {
              matches: 0,
              goals: 0,
              assists: 0,
              cleanSheets: 0,
              yellowCards: 0,
              redCards: 0,
              minutes: 0,
              mvps: 0,
              ratingSum: 0,
              ratingCount: 0,
              averageRating: 0
            };
            const c = p.cupStats || {};
            p.seasonStats = {
              matches: c.matches || 0,
              goals: c.goals || 0,
              assists: c.assists || 0,
              cleanSheets: c.cleanSheets || 0,
              yellowCards: c.yellowCards || 0,
              redCards: c.redCards || 0,
              minutes: c.minutes || 0,
              mvps: c.mvps || 0,
              averageRating: c.averageRating || parseFloat(p.rating) || 7.2
            };
          });
        }

        if (currentDB.stats) {
          ["pro-league", "league-1", "league-2", "futsal"].forEach((lKey) => {
            currentDB.stats[lKey] = {
              scorers: [],
              assists: [],
              cleansheets: [],
              ratings: []
            };
          });
        }

        if (currentDB.standings) {
          for (const key of Object.keys(currentDB.standings)) {
            currentDB.standings[key] = [];
          }
        }

        if (Array.isArray(currentDB.matches)) {
          currentDB.matches.forEach((m: any) => {
            if (m && ["pro-league", "league-1", "league-2", "league-2-group-a", "league-2-group-b", "futsal"].includes(m.league)) {
              m.archived_standings = true;
              m.status = "archived";
            }
          });
        }

        const stagedKeys = [
          "football_Finished_Games", "futsal_Finished_Games",
          "football_Now_Games", "futsal_Now_Games",
          "football_Feature_Games", "futsal_Feature_Games"
        ];
        stagedKeys.forEach(k => {
          if (Array.isArray(currentDB[k])) {
            currentDB[k].forEach((m: any) => {
              if (m && ["pro-league", "league-1", "league-2", "league-2-group-a", "league-2-group-b", "futsal"].includes(m.league)) {
                m.archived_standings = true;
                m.status = "archived";
              }
            });
            currentDB[k] = currentDB[k].filter((m: any) => m.status !== "archived");
          }
        });

      } else if (type === "bracket") {
        currentDB.bracket = {
          round16: [],
          quarterFinals: [],
          semiFinals: [],
          final: {
            id: "f-1",
            teamHome: "",
            teamAway: "",
            scoreHome: 0,
            scoreAway: 0,
            date: "",
            status: "not-started",
            venue: "",
            winner: ""
          }
        };

        if (Array.isArray(currentDB.players)) {
          currentDB.players.forEach((p: any) => {
            p.cupStats = {
              matches: 0,
              goals: 0,
              assists: 0,
              cleanSheets: 0,
              yellowCards: 0,
              redCards: 0,
              minutes: 0,
              mvps: 0,
              ratingSum: 0,
              ratingCount: 0,
              averageRating: 0
            };
            const l = p.leagueStats || {};
            p.seasonStats = {
              matches: l.matches || 0,
              goals: l.goals || 0,
              assists: l.assists || 0,
              cleanSheets: l.cleanSheets || 0,
              yellowCards: l.yellowCards || 0,
              redCards: l.redCards || 0,
              minutes: l.minutes || 0,
              mvps: l.mvps || 0,
              averageRating: l.averageRating || parseFloat(p.rating) || 7.2
            };
          });
        }

        if (currentDB.stats && currentDB.stats["hazfi-cup"]) {
          currentDB.stats["hazfi-cup"] = {
            scorers: [],
            assists: [],
            cleansheets: [],
            ratings: []
          };
        }

        if (Array.isArray(currentDB.matches)) {
          currentDB.matches.forEach((m: any) => {
            if (m && m.league === "hazfi-cup") {
              m.archived_bracket = true;
              m.status = "archived";
            }
          });
        }

        const stagedKeys = [
          "football_Finished_Games", "futsal_Finished_Games",
          "football_Now_Games", "futsal_Now_Games",
          "football_Feature_Games", "futsal_Feature_Games"
        ];
        stagedKeys.forEach(k => {
          if (Array.isArray(currentDB[k])) {
            currentDB[k].forEach((m: any) => {
              if (m && m.league === "hazfi-cup") {
                m.archived_bracket = true;
                m.status = "archived";
              }
            });
            currentDB[k] = currentDB[k].filter((m: any) => m.status !== "archived");
          }
        });
      }

      recalculateAndSyncDatabase();

      await saveDB();
      res.json({ success: true, message: `آرشیو ${type} با موفقیت ایجاد گردید و مقادیر جاری صفر شدند.`, archives: currentDB.archives });
    } catch (err: any) {
      logMessage("error", "api", "خطا در ایجاد آرشیو", err);
      res.status(500).json({ error: "خطای سرور در ایجاد آرشیو: " + (err.message || err) });
    }
  });

  app.delete("/api/archives/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    logMessage("info", "api", `درخواست حذف آرشیو با شناسه: ${id}`);

    try {
      const currentDB = loadDB();
      const originalLength = currentDB.archives?.length || 0;
      currentDB.archives = (currentDB.archives || []).filter((a: any) => String(a.id) !== String(id));

      if (currentDB.archives.length < originalLength) {
        await saveDB();
        res.json({ success: true, message: "آرشیو با موفقیت حذف گردید.", archives: currentDB.archives });
      } else {
        res.status(404).json({ error: "آرشیو یافت نشد." });
      }
    } catch (err: any) {
      res.status(500).json({ error: "خطای سرور در حذف آرشیو: " + (err.message || err) });
    }
  });
}
