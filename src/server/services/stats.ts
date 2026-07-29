import { loadDB, setDb } from "../state";
import { normalizePersianString, toPersianDigits } from "../utils/persian";
import { logMessage } from "../utils/logger";

export function calculatePlayerMinutesAndPlayed(player: any, match: any): { played: boolean; minutes: number; started: boolean } {
  const isFutsal = match.sport === "futsal" || match.league === "futsal";
  const fullDuration = isFutsal ? 40 : 90;

  const normPName = normalizePersianString(player.name || "");
  const normPId = String(player.id || "");

  const isPlayerMatch = (key?: any) => {
    if (!key) return false;
    const normKey = normalizePersianString(String(key));
    return normKey === normPName || normKey === normPId;
  };

  const lineups = match.lineups || { home: [], away: [] };
  const homeLineup = lineups.home || [];
  const awayLineup = lineups.away || [];
  
  const inHome = homeLineup.find((lp: any) => isPlayerMatch(lp.id) || isPlayerMatch(lp.name));
  const inAway = awayLineup.find((lp: any) => isPlayerMatch(lp.id) || isPlayerMatch(lp.name));
  const lineupPlayer = inHome || inAway;

  const events = match.events || [];

  const subInEvents = events.filter((ev: any) => ev && ev.type === "substitution" && isPlayerMatch(ev.player2Name));
  const subInEvent = subInEvents[0];

  const subOutEvents = events.filter((ev: any) => ev && ev.type === "substitution" && isPlayerMatch(ev.playerName));
  const subOutEvent = subOutEvents[0];

  const redCardEvents = events.filter((ev: any) => ev && ev.type === "red-card" && isPlayerMatch(ev.playerName));
  const redCardEvent = redCardEvents[0];

  const hasOtherEvent = events.some((ev: any) => ev && ev.type !== "substitution" && (isPlayerMatch(ev.playerName) || isPlayerMatch(ev.player2Name)));
  const inScorersList = (match.scorersList || []).some((sc: any) => sc && (isPlayerMatch(sc.scorerName) || isPlayerMatch(sc.scorerId) || isPlayerMatch(sc.name) || isPlayerMatch(sc.assist)));

  const started = !!lineupPlayer;
  const played = started || !!subInEvent || hasOtherEvent || inScorersList;

  if (!played) {
    return { played: false, minutes: 0, started: false };
  }

  let minutes = fullDuration;
  if (started) {
    if (subOutEvent) {
      const outMin = parseInt(subOutEvent.minute, 10) || fullDuration;
      minutes = outMin;
    } else if (redCardEvent) {
      const redMin = parseInt(redCardEvent.minute, 10) || fullDuration;
      minutes = redMin;
    }
  } else if (subInEvent) {
    const inMin = parseInt(subInEvent.minute, 10) || 0;
    if (subOutEvent) {
      const outMin = parseInt(subOutEvent.minute, 10) || fullDuration;
      minutes = Math.max(0, outMin - inMin);
    } else if (redCardEvent) {
      const redMin = parseInt(redCardEvent.minute, 10) || fullDuration;
      minutes = Math.max(0, redMin - inMin);
    } else {
      minutes = Math.max(0, fullDuration - inMin);
    }
  } else {
    if (redCardEvent) {
      minutes = parseInt(redCardEvent.minute, 10) || fullDuration;
    } else if (subOutEvent) {
      minutes = parseInt(subOutEvent.minute, 10) || fullDuration;
    } else {
      minutes = fullDuration;
    }
  }

  return { played: true, minutes, started };
}

export function getPlayerCalculatedStatsFromMatches(playerId: string, matches: any[], allPlayers: any[]): any {
  const player = allPlayers.find((p: any) => String(p.id) === playerId);
  if (!player) return { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, cleanSheets: 0 };

  const normPlayerName = normalizePersianString(player.name || "");
  const normPlayerId = String(player.id || "");
  
  let matchCount = 0;
  let goalCount = 0;
  let assistCount = 0;
  let yellowCount = 0;
  let redCount = 0;
  let cleanSheetsCount = 0;

  const finishedGames = matches.filter((m: any) => m.status === "finished" && !m.archived_stats);

  const matchNames = (name1?: string, name2?: string) => {
    if (!name1 || !name2) return false;
    return normalizePersianString(name1) === normalizePersianString(name2);
  };

  finishedGames.forEach((match: any) => {
    const lineups = match.lineups || { home: [], away: [] };
    const homeLineup = lineups.home || [];
    const awayLineup = lineups.away || [];

    const inHome = homeLineup.find((lp: any) => String(lp.id) === normPlayerId || matchNames(lp.name, player.name));
    const inAway = awayLineup.find((lp: any) => String(lp.id) === normPlayerId || matchNames(lp.name, player.name));
    const lp = inHome || inAway;

    let { played: playedThisMatch } = calculatePlayerMinutesAndPlayed(player, match);
    let lGoals = 0;
    let lAssists = 0;
    let lYellow = 0;
    let lRed = 0;

    if (playedThisMatch && lp) {
      lGoals = parseInt(lp.goals) || 0;
      lAssists = parseInt(lp.assists) || 0;
      lYellow = (lp.yellowCard || lp.yellowCards) ? 1 : 0;
      lRed = (lp.redCard || lp.redCards) ? 1 : 0;
    }

    let evGoals = 0;
    let evAssists = 0;
    let evYellow = 0;
    let evRed = 0;

    const events = match.events || [];
    events.forEach((ev: any) => {
      if (!ev) return;
      
      const isScorer = matchNames(ev.playerName, player.name);
      const isAssistant = matchNames(ev.player2Name, player.name);

      if (isScorer) {
        playedThisMatch = true;
        if (ev.type === "goal" || ev.type === "penalty") {
          evGoals += 1;
        } else if (ev.type === "yellow-card") {
          evYellow += 1;
        } else if (ev.type === "red-card") {
          evRed += 1;
        } else if (ev.type === "assist" && !ev.player2Name) {
          evAssists += 1;
        }
      }
      if (isAssistant) {
        playedThisMatch = true;
        if (ev.type === "goal" || ev.type === "assist") {
          evAssists += 1;
        }
      }
    });

    let scGoals = 0;
    let scAssists = 0;

    const scorers = match.scorersList || [];
    scorers.forEach((sc: any) => {
      if (!sc) return;
      const isScorer = matchNames(sc.scorerName, player.name) || matchNames(sc.scorerId, player.id) || matchNames(sc.name, player.name);
      const isAssistant = matchNames(sc.assistName, player.name) || matchNames(sc.assistId, player.id) || matchNames(sc.assist, player.name);

      if (isScorer) {
        playedThisMatch = true;
        scGoals += 1;
      }
      if (isAssistant) {
        playedThisMatch = true;
        scAssists += 1;
      }
    });

    if (playedThisMatch) {
      matchCount += 1;
      goalCount += Math.max(lGoals, evGoals, scGoals);
      assistCount += Math.max(lAssists, evAssists, scAssists);
      yellowCount += Math.max(lYellow, evYellow);
      redCount += Math.max(lRed, evRed);

      const isGK = typeof player.position === "string" && player.position.includes("دروازه");
      const oppScore = inHome ? (parseInt(String(match.scoreAway), 10) || 0) : (parseInt(String(match.scoreHome), 10) || 0);
      if (isGK && oppScore === 0) {
        cleanSheetsCount += 1;
      }
    }
  });

  return {
    matches: matchCount,
    goals: goalCount,
    assists: assistCount,
    yellowCards: yellowCount,
    redCards: redCount,
    cleanSheets: cleanSheetsCount
  };
}

export function recalculateAndSyncDatabase(): void {
  const db = loadDB();
  if (!db) return;
  if (!db.players) db.players = [];
  if (!db.teams) db.teams = [];
  if (!db.standings) db.standings = {};

  const getTeamLeague = (teamId: string, teamName?: string): string => {
    const teamObj = db.teams.find((t: any) => 
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
  };

  logMessage("info", "database", "آغاز عملیات هماهنگ‌سازی بازگشتی آمار بازیکنان، تیم‌ها و لیدربردهای لیگ...");

  db.players.forEach((p: any) => {
    const nonCupMatches = (db.matches || []).filter((m: any) => m.league !== "hazfi-cup");
    const calc = getPlayerCalculatedStatsFromMatches(String(p.id), nonCupMatches, db.players);
    
    if (p.baseMatches === undefined) {
      p.baseMatches = Math.max(0, (parseInt(p.seasonStats?.matches) || 0) - calc.matches);
    }
    if (p.baseGoals === undefined) {
      p.baseGoals = Math.max(0, (parseInt(p.seasonStats?.goals) || 0) - calc.goals);
    }
    if (p.baseAssists === undefined) {
      p.baseAssists = Math.max(0, (parseInt(p.seasonStats?.assists) || 0) - calc.assists);
    }
    if (p.baseCleanSheets === undefined) {
      p.baseCleanSheets = Math.max(0, (parseInt(p.seasonStats?.cleanSheets) || 0) - calc.cleanSheets);
    }
    if (p.baseYellowCards === undefined) {
      p.baseYellowCards = Math.max(0, (parseInt(p.seasonStats?.yellowCards) || 0) - calc.yellowCards);
    }
    if (p.baseRedCards === undefined) {
      p.baseRedCards = Math.max(0, (parseInt(p.seasonStats?.redCards) || 0) - calc.redCards);
    }

    const baseMult = p.baseMatches || 0;
    p.leagueStats = {
      matches: p.baseMatches,
      goals: p.baseGoals,
      assists: p.baseAssists,
      cleanSheets: p.baseCleanSheets,
      yellowCards: p.baseYellowCards,
      redCards: p.baseRedCards,
      minutes: baseMult * 90,
      mvps: 0,
      ratingSum: baseMult * (parseFloat(p.rating) || 7.2),
      ratingCount: baseMult,
      averageRating: parseFloat(p.rating) || 7.2
    };

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

    p.seasonStats = {
      matches: p.baseMatches,
      goals: p.baseGoals,
      assists: p.baseAssists,
      cleanSheets: p.baseCleanSheets,
      yellowCards: p.baseYellowCards,
      redCards: p.baseRedCards,
      minutes: baseMult * 90,
      mvps: 0,
      averageRating: parseFloat(p.rating) || 7.2
    };
    p.ratingsHistory = [];
  });

  db.teams.forEach((t: any) => {
    if (t.basePlayed === undefined) t.basePlayed = parseInt(t.stats?.played) || 0;
    if (t.baseWon === undefined) t.baseWon = parseInt(t.stats?.won) || 0;
    if (t.baseDrawn === undefined) t.baseDrawn = parseInt(t.stats?.drawn) || 0;
    if (t.baseLost === undefined) t.baseLost = parseInt(t.stats?.lost) || 0;
    if (t.basePoints === undefined) t.basePoints = parseInt(t.stats?.points) || 0;
    if (t.baseGoalsFor === undefined) t.baseGoalsFor = parseInt(t.stats?.goalsFor) || 0;
    if (t.baseGoalsAgainst === undefined) t.baseGoalsAgainst = parseInt(t.stats?.goalsAgainst) || 0;

    t.stats = {
      played: t.basePlayed,
      won: t.baseWon,
      drawn: t.baseDrawn,
      lost: t.baseLost,
      points: t.basePoints,
      goalsFor: t.baseGoalsFor,
      goalsAgainst: t.baseGoalsAgainst
    };

    t.cupStats = {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0
    };

    t.recentForm = [];
    t.recentMatches = [];
  });

  if (!db.coaches) db.coaches = [];
  db.coaches.forEach((c: any) => {
    if (c.baseMatches === undefined) c.baseMatches = parseInt(c.seasonStats?.matches) || 0;
    if (c.baseWins === undefined) c.baseWins = parseInt(c.seasonStats?.wins) || 0;
    if (c.baseDraws === undefined) c.baseDraws = parseInt(c.seasonStats?.draws) || 0;
    if (c.baseLosses === undefined) c.baseLosses = parseInt(c.seasonStats?.losses) || 0;

    c.seasonStats = {
      matches: c.baseMatches,
      wins: c.baseWins,
      draws: c.baseDraws,
      losses: c.baseLosses,
      winRate: c.baseMatches > 0 ? parseFloat(((c.baseWins / c.baseMatches) * 100).toFixed(1)) : 0,
      goalsFor: 0,
      goalsAgainst: 0
    };
    c.recentForm = [];
  });

  const finishedGames: any[] = [];
  const sourceMatches = Array.isArray(db.matches) ? db.matches : [];
  sourceMatches.forEach((m: any) => {
    if (m && m.status === "finished") {
      finishedGames.push(m);
    }
  });

  const parseDateTimeRobust = (item: any) => {
    if (!item) return 0;
    const rawDate = item.date || "";
    if (!rawDate) return 0;
    const cleanDate = String(rawDate).trim();
    if (cleanDate.includes("T")) {
      const t = new Date(cleanDate).getTime();
      if (!isNaN(t)) return t;
    }
    const rawTime = item.time || "00:00";
    const cleanTime = String(rawTime).trim();
    const isoStr = `${cleanDate}T${cleanTime}:00`;
    const parsed = new Date(isoStr).getTime();
    if (!isNaN(parsed)) return parsed;
    const dateParsed = new Date(cleanDate).getTime();
    if (!isNaN(dateParsed)) {
      const timeParts = cleanTime.split(":");
      const hrs = parseInt(timeParts[0], 10) || 0;
      const mins = parseInt(timeParts[1], 10) || 0;
      return dateParsed + (hrs * 3600000) + (mins * 60000);
    }
    return 0;
  };

  finishedGames.sort((a, b) => parseDateTimeRobust(a) - parseDateTimeRobust(b));

  const playerMap: Record<string, any> = {};
  db.players.forEach((p: any) => {
    playerMap[p.id] = p;
    if (p.name) {
      playerMap[p.name] = p;
      playerMap[normalizePersianString(p.name)] = p;
    }
  });

  const teamMap: Record<string, any> = {};
  db.teams.forEach((t: any) => {
    teamMap[t.id] = t;
    if (t.name) {
      teamMap[t.name] = t;
      teamMap[normalizePersianString(t.name)] = t;
    }
  });

  const coachMapByTeamId: Record<string, any> = {};
  db.coaches.forEach((c: any) => {
    if (c.teamId) {
      coachMapByTeamId[c.teamId] = c;
    }
  });

  finishedGames.forEach((match: any) => {
    const hp = parseInt(String(match.scoreHome), 10) || 0;
    const ap = parseInt(String(match.scoreAway), 10) || 0;

    const homeTeam = teamMap[match.teamHome] || teamMap[normalizePersianString(match.teamHome || "")] || teamMap[match.teamHomeId];
    const awayTeam = teamMap[match.teamAway] || teamMap[normalizePersianString(match.teamAway || "")] || teamMap[match.teamAwayId];

    const isCup = match.league === "hazfi-cup";

    if (!match.archived_standings) {
      if (isCup) {
        if (homeTeam) {
          if (!homeTeam.cupStats) homeTeam.cupStats = { played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0 };
          homeTeam.cupStats.played += 1;
          homeTeam.cupStats.goalsFor += hp;
          homeTeam.cupStats.goalsAgainst += ap;
        }
        if (awayTeam) {
          if (!awayTeam.cupStats) awayTeam.cupStats = { played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0 };
          awayTeam.cupStats.played += 1;
          awayTeam.cupStats.goalsFor += ap;
          awayTeam.cupStats.goalsAgainst += hp;
        }

        if (hp > ap) {
          if (homeTeam) homeTeam.cupStats.won += 1;
          if (awayTeam) awayTeam.cupStats.lost += 1;
        } else if (hp < ap) {
          if (homeTeam) homeTeam.cupStats.lost += 1;
          if (awayTeam) awayTeam.cupStats.won += 1;
        } else {
          if (homeTeam) homeTeam.cupStats.drawn += 1;
          if (awayTeam) awayTeam.cupStats.drawn += 1;
        }
      } else {
        if (homeTeam) {
          homeTeam.stats.played += 1;
          homeTeam.stats.goalsFor += hp;
          homeTeam.stats.goalsAgainst += ap;
        }
        if (awayTeam) {
          awayTeam.stats.played += 1;
          awayTeam.stats.goalsFor += ap;
          awayTeam.stats.goalsAgainst += hp;
        }

        if (hp > ap) {
          if (homeTeam) {
            homeTeam.stats.won += 1;
            homeTeam.stats.points += 3;
            homeTeam.recentForm.push("W");
          }
          if (awayTeam) {
            awayTeam.stats.lost += 1;
            awayTeam.recentForm.push("L");
          }
        } else if (hp < ap) {
          if (homeTeam) {
            homeTeam.stats.lost += 1;
            homeTeam.recentForm.push("L");
          }
          if (awayTeam) {
            awayTeam.stats.won += 1;
            awayTeam.stats.points += 3;
            awayTeam.recentForm.push("W");
          }
        } else {
          if (homeTeam) {
            homeTeam.stats.drawn += 1;
            homeTeam.stats.points += 1;
            homeTeam.recentForm.push("D");
          }
          if (awayTeam) {
            awayTeam.stats.drawn += 1;
            awayTeam.stats.points += 1;
            awayTeam.recentForm.push("D");
          }
        }
      }

      const homeCoach = homeTeam ? coachMapByTeamId[homeTeam.id] : null;
      const awayCoach = awayTeam ? coachMapByTeamId[awayTeam.id] : null;
      [homeCoach, awayCoach].forEach((coach) => {
        if (coach) {
          coach.seasonStats.matches = (coach.seasonStats.matches || 0) + 1;
          coach.seasonStats.goalsFor = (coach.seasonStats.goalsFor || 0) + (coach === homeCoach ? hp : ap);
          coach.seasonStats.goalsAgainst = (coach.seasonStats.goalsAgainst || 0) + (coach === homeCoach ? ap : hp);
        }
      });
      if (homeCoach && awayCoach) {
        if (hp > ap) {
          homeCoach.seasonStats.wins = (homeCoach.seasonStats.wins || 0) + 1;
          awayCoach.seasonStats.losses = (awayCoach.seasonStats.losses || 0) + 1;
          homeCoach.recentForm.push("W");
          awayCoach.recentForm.push("L");
        } else if (hp < ap) {
          homeCoach.seasonStats.losses = (homeCoach.seasonStats.losses || 0) + 1;
          awayCoach.seasonStats.wins = (awayCoach.seasonStats.wins || 0) + 1;
          homeCoach.recentForm.push("L");
          awayCoach.recentForm.push("W");
        } else {
          homeCoach.seasonStats.draws = (homeCoach.seasonStats.draws || 0) + 1;
          awayCoach.seasonStats.draws = (awayCoach.seasonStats.draws || 0) + 1;
          homeCoach.recentForm.push("D");
          awayCoach.recentForm.push("D");
        }
      } else if (homeCoach) {
        if (hp > ap) {
          homeCoach.seasonStats.wins = (homeCoach.seasonStats.wins || 0) + 1;
          homeCoach.recentForm.push("W");
        } else if (hp < ap) {
          homeCoach.seasonStats.losses = (homeCoach.seasonStats.losses || 0) + 1;
          homeCoach.recentForm.push("L");
        } else {
          homeCoach.seasonStats.draws = (homeCoach.seasonStats.draws || 0) + 1;
          homeCoach.recentForm.push("D");
        }
      } else if (awayCoach) {
        if (hp > ap) {
          awayCoach.seasonStats.losses = (awayCoach.seasonStats.losses || 0) + 1;
          awayCoach.recentForm.push("L");
        } else if (hp < ap) {
          awayCoach.seasonStats.wins = (awayCoach.seasonStats.wins || 0) + 1;
          awayCoach.recentForm.push("W");
        } else {
          awayCoach.seasonStats.draws = (awayCoach.seasonStats.draws || 0) + 1;
          awayCoach.recentForm.push("D");
        }
      }
    }

    const matchPlayerset = new Set<string>();
    const playerStatsOnMatch: Record<string, { goals: number; assists: number; yellow: number; red: number; minutes: number }> = {};

    const getAllInvolved = () => {
      const idsAndNames = new Set<string>();
      
      const lineups = match.lineups || { home: [], away: [] };
      const homeLineup = lineups.home || [];
      const awayLineup = lineups.away || [];
      
      homeLineup.forEach((lp: any) => { if (lp.id) idsAndNames.add(String(lp.id)); if (lp.name) idsAndNames.add(lp.name); });
      awayLineup.forEach((lp: any) => { if (lp.id) idsAndNames.add(String(lp.id)); if (lp.name) idsAndNames.add(lp.name); });
      
      const events = match.events || [];
      events.forEach((ev: any) => {
        if (!ev) return;
        if (ev.playerName) idsAndNames.add(ev.playerName);
        if (ev.player2Name) idsAndNames.add(ev.player2Name);
      });
      
      const scorers = match.scorersList || [];
      scorers.forEach((sc: any) => {
        if (!sc) return;
        if (sc.scorerId) idsAndNames.add(String(sc.scorerId));
        if (sc.scorerName) idsAndNames.add(sc.scorerName);
        if (sc.name) idsAndNames.add(sc.name);
        if (sc.assistId) idsAndNames.add(String(sc.assistId));
        if (sc.assistName) idsAndNames.add(sc.assistName);
        if (sc.assist) idsAndNames.add(sc.assist);
      });
      
      return Array.from(idsAndNames);
    };

    const involvedKeys = getAllInvolved();
    
    const involvedPlayerIds = new Set<string>();
    involvedKeys.forEach(key => {
      const pObj = playerMap[key] || playerMap[normalizePersianString(key)];
      if (pObj && pObj.id) {
        involvedPlayerIds.add(String(pObj.id));
      }
    });

    involvedPlayerIds.forEach(pId => {
      const pObj = playerMap[pId];
      if (!pObj || match.archived_stats) return;

      const normPName = normalizePersianString(pObj.name || "");
      const normPId = String(pId);

      const checkMatch = (key?: any) => {
        if (!key) return false;
        const normKey = normalizePersianString(String(key));
        return normKey === normPName || normKey === normPId;
      };

      const playInfo = calculatePlayerMinutesAndPlayed(pObj, match);
      if (!playInfo.played) {
        return;
      }

      let lGoals = 0;
      let lAssists = 0;
      let lYellow = 0;
      let lRed = 0;
      let minutesPlayed = playInfo.minutes;

      const lineups = match.lineups || { home: [], away: [] };
      const homeLineup = lineups.home || [];
      const awayLineup = lineups.away || [];
      const lp = homeLineup.find((x: any) => checkMatch(x.id) || checkMatch(x.name)) || 
                 awayLineup.find((x: any) => checkMatch(x.id) || checkMatch(x.name));
      
      if (lp) {
        lGoals = parseInt(lp.goals) || 0;
        lAssists = parseInt(lp.assists) || 0;
        lYellow = (lp.yellowCard || lp.yellowCards) ? 1 : 0;
        lRed = (lp.redCard || lp.redCards) ? 1 : 0;
        if (lp.minutesPlayed !== undefined) {
          minutesPlayed = parseInt(lp.minutesPlayed) || minutesPlayed;
        }
      }

      let evGoals = 0;
      let evAssists = 0;
      let evYellow = 0;
      let evRed = 0;

      const events = match.events || [];
      events.forEach((ev: any) => {
        if (!ev) return;
        if (ev.playerName && checkMatch(ev.playerName)) {
          if (ev.type === "goal" || ev.type === "penalty") {
            evGoals += 1;
          } else if (ev.type === "yellow-card") {
            evYellow += 1;
          } else if (ev.type === "red-card") {
            evRed += 1;
          } else if (ev.type === "assist" && !ev.player2Name) {
            evAssists += 1;
          }
        }
        if (ev.player2Name && checkMatch(ev.player2Name)) {
          if (ev.type === "goal" || ev.type === "assist") {
            evAssists += 1;
          }
        }
      });

      let scGoals = 0;
      let scAssists = 0;

      const scorers = match.scorersList || [];
      scorers.forEach((sc: any) => {
        if (!sc) return;
        const isScorer = checkMatch(sc.scorerName) || checkMatch(sc.scorerId) || checkMatch(sc.name);
        const isAssistant = checkMatch(sc.assistName) || checkMatch(sc.assistId) || checkMatch(sc.assist);

        if (isScorer) {
          scGoals += 1;
        }
        if (isAssistant) {
          scAssists += 1;
        }
      });

      const finalGoals = Math.max(lGoals, evGoals, scGoals);
      const finalAssists = Math.max(lAssists, evAssists, scAssists);
      const finalYellow = Math.max(lYellow, evYellow);
      const finalRed = Math.max(lRed, evRed);

      playerStatsOnMatch[pId] = {
        goals: finalGoals,
        assists: finalAssists,
        yellow: finalYellow,
        red: finalRed,
        minutes: minutesPlayed
      };
      matchPlayerset.add(pId);
    });

     matchPlayerset.forEach((pId) => {
       const pObj = playerMap[pId];
       if (pObj) {
         const stats = playerStatsOnMatch[pId];
         const isCup = match.league === "hazfi-cup";
         const isGK = typeof pObj.position === "string" && pObj.position.includes("دروازه");
         const isHome = pObj.teamName === match.teamHome || pObj.teamId === match.teamHomeId;
         const conceded = isHome ? (parseInt(String(match.scoreAway), 10) || 0) : (parseInt(String(match.scoreHome), 10) || 0);
         const cleanSheetCount = (isGK && conceded === 0) ? 1 : 0;
         const isMvp = match.mvpId === pObj.id || match.mvpId === pObj.name || (match.mvpId && match.mvpId.includes(pObj.name)) || false;

         const lineups = match.lineups || { home: [], away: [] };
         const homeLineup = lineups.home || [];
         const awayLineup = lineups.away || [];
         const checkMatch = (key?: any) => {
           if (!key) return false;
           const normKey = normalizePersianString(String(key));
           return normKey === normalizePersianString(pObj.name || "") || normKey === String(pObj.id);
         };
         const lp = homeLineup.find((x: any) => checkMatch(x.id) || checkMatch(x.name)) || 
                    awayLineup.find((x: any) => checkMatch(x.id) || checkMatch(x.name));
         const ratingVal = lp && lp.rating ? (parseFloat(lp.rating) || 7.0) : (parseFloat(pObj.rating) || 7.0);

         if (isCup) {
           if (!pObj.cupStats) {
             pObj.cupStats = { matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, minutes: 0, mvps: 0, ratingSum: 0, ratingCount: 0, averageRating: 0 };
           }
           pObj.cupStats.matches += 1;
           pObj.cupStats.goals += stats.goals;
           pObj.cupStats.assists += stats.assists;
           pObj.cupStats.yellowCards = (pObj.cupStats.yellowCards || 0) + stats.yellow;
           pObj.cupStats.redCards = (pObj.cupStats.redCards || 0) + stats.red;
           pObj.cupStats.cleanSheets = (pObj.cupStats.cleanSheets || 0) + cleanSheetCount;
           pObj.cupStats.minutes = (pObj.cupStats.minutes || 0) + stats.minutes;
           pObj.cupStats.mvps = (pObj.cupStats.mvps || 0) + (isMvp ? 1 : 0);
           pObj.cupStats.ratingSum = (pObj.cupStats.ratingSum || 0) + ratingVal;
           pObj.cupStats.ratingCount = (pObj.cupStats.ratingCount || 0) + 1;
           pObj.cupStats.averageRating = parseFloat((pObj.cupStats.ratingSum / pObj.cupStats.ratingCount).toFixed(1));
         } else {
           if (!pObj.leagueStats) {
             pObj.leagueStats = { matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, minutes: 0, mvps: 0, ratingSum: 0, ratingCount: 0, averageRating: 0 };
           }
           pObj.leagueStats.matches += 1;
           pObj.leagueStats.goals += stats.goals;
           pObj.leagueStats.assists += stats.assists;
           pObj.leagueStats.yellowCards = (pObj.leagueStats.yellowCards || 0) + stats.yellow;
           pObj.leagueStats.redCards = (pObj.leagueStats.redCards || 0) + stats.red;
           pObj.leagueStats.cleanSheets = (pObj.leagueStats.cleanSheets || 0) + cleanSheetCount;
           pObj.leagueStats.minutes = (pObj.leagueStats.minutes || 0) + stats.minutes;
           pObj.leagueStats.mvps = (pObj.leagueStats.mvps || 0) + (isMvp ? 1 : 0);
           pObj.leagueStats.ratingSum = (pObj.leagueStats.ratingSum || 0) + ratingVal;
           pObj.leagueStats.ratingCount = (pObj.leagueStats.ratingCount || 0) + 1;
           pObj.leagueStats.averageRating = parseFloat((pObj.leagueStats.ratingSum / pObj.leagueStats.ratingCount).toFixed(1));
         }

         pObj.seasonStats.matches += 1;
         pObj.seasonStats.goals += stats.goals;
         pObj.seasonStats.assists += stats.assists;
         pObj.seasonStats.yellowCards = (pObj.seasonStats.yellowCards || 0) + stats.yellow;
         pObj.seasonStats.redCards = (pObj.seasonStats.redCards || 0) + stats.red;
         pObj.seasonStats.cleanSheets = (pObj.seasonStats.cleanSheets || 0) + cleanSheetCount;
         pObj.seasonStats.minutes = (pObj.seasonStats.minutes || 0) + stats.minutes;
         pObj.seasonStats.mvps = (pObj.seasonStats.mvps || 0) + (isMvp ? 1 : 0);

         const oppTeam = (pObj.teamName === match.teamHome || pObj.teamId === match.teamHomeId) ? match.teamAway : match.teamHome;

         const alreadyIn = pObj.ratingsHistory.some((item: any) => item.matchId === match.id);
         if (!alreadyIn) {
           pObj.ratingsHistory.push({
             matchId: match.id,
             matchOpponent: oppTeam,
             isCup: isCup,
             rating: ratingVal,
             date: match.date,
             time: match.time || "00:00",
            goals: stats.goals,
            assists: stats.assists,
            minutes: stats.minutes,
            isMvp: match.mvpId === pObj.id || match.mvpId === pObj.name || (match.mvpId && match.mvpId.includes(pObj.name))
          });
        }
      }
    });
  });

   db.players.forEach((p: any) => {
     if (p.ratingsHistory.length > 0) {
       p.ratingsHistory.sort((a: any, b: any) => {
         const tA = parseDateTimeRobust(a);
         const tB = parseDateTimeRobust(b);
         if (tA !== tB) return tB - tA;
         return (b.matchId || "").localeCompare(a.matchId || "");
       });
       
       const sum = p.ratingsHistory.reduce((acc: number, item: any) => acc + item.rating, 0);
       p.averageRating = parseFloat((sum / p.ratingsHistory.length).toFixed(1));
       if (p.seasonStats) {
         p.seasonStats.averageRating = p.averageRating;
       }

       const leagueRatings = p.ratingsHistory.filter((x: any) => !x.isCup);
       if (leagueRatings.length > 0) {
         const lSum = leagueRatings.reduce((acc: number, item: any) => acc + item.rating, 0);
         if (p.leagueStats) {
           p.leagueStats.averageRating = parseFloat((lSum / leagueRatings.length).toFixed(1));
         }
       } else if (p.leagueStats) {
         p.leagueStats.averageRating = parseFloat(p.rating) || 7.2;
       }

       const cupRatings = p.ratingsHistory.filter((x: any) => x.isCup);
       if (cupRatings.length > 0) {
         const cSum = cupRatings.reduce((acc: number, item: any) => acc + item.rating, 0);
         if (p.cupStats) {
           p.cupStats.averageRating = parseFloat((cSum / cupRatings.length).toFixed(1));
         }
       } else if (p.cupStats) {
         p.cupStats.averageRating = 0;
       }
     }
   });

  db.teams.forEach((t: any) => {
    const teamMatches = finishedGames.filter((m: any) => (m.teamHome === t.name || m.teamAway === t.name || m.teamHomeId === t.id || m.teamAwayId === t.id) && !m.archived_standings);
    
    teamMatches.sort((a: any, b: any) => {
      const tA = parseDateTimeRobust(a);
      const tB = parseDateTimeRobust(b);
      if (tA !== tB) return tB - tA;
      return (b.id || "").localeCompare(a.id || "");
    });

    t.recentMatches = teamMatches.slice(0, 10).map((m: any) => {
      const isHome = m.teamHome === t.name || m.teamHomeId === t.id;
      const opponent = isHome ? m.teamAway : m.teamHome;
      const opponentLogo = isHome ? m.teamAwayLogo : m.teamHomeLogo;
      const hp = parseInt(String(m.scoreHome), 10) || 0;
      const ap = parseInt(String(m.scoreAway), 10) || 0;
      const scoreStr = isHome ? `${hp}-${ap}` : `${ap}-${hp}`;
      
      let result = "تساوی";
      if ((isHome && hp > ap) || (!isHome && ap > hp)) result = "برد";
      else if ((isHome && hp < ap) || (!isHome && ap < hp)) result = "باخت";

      return {
        date: m.date,
        opponent,
        opponentLogo: opponentLogo || "👤",
        score: toPersianDigits(scoreStr),
        isHome,
        result
      };
    });

    const formChronological = [...t.recentForm];
    t.recentForm = formChronological.slice(-5);
  });

  const standingsLeagues = ["pro-league", "league-1", "league-2-group-a", "league-2-group-b", "futsal"];
  standingsLeagues.forEach((lKey) => {
    const existingList = Array.isArray(db.standings[lKey]) ? db.standings[lKey] : [];
    const activeTeamsForLeague = db.teams.filter((t: any) => {
      const teamAssignedLeague = getTeamLeague(t.id, t.name);
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

    db.standings[lKey] = newList;
  });

  const statsLeagues = ["pro-league", "league-1", "league-2", "hazfi-cup", "futsal"];
  if (!db.stats) db.stats = {};

  statsLeagues.forEach((leagueKey) => {
    let eligiblePlayers: any[];

    if (leagueKey === "hazfi-cup") {
      eligiblePlayers = db.players.filter((p: any) => {
        const cStats = p.cupStats || {};
        return (cStats.goals > 0 || cStats.assists > 0 || cStats.cleanSheets > 0);
      });
    } else {
      eligiblePlayers = db.players.filter((p: any) => getTeamLeague(p.teamId, p.teamName) === leagueKey);
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

    if (scorers.length > 0 || assists.length > 0 || cleansheets.length > 0 || !db.stats[leagueKey]) {
      db.stats[leagueKey] = { scorers, assists, cleansheets, ratings };
    }
  });

  db.coaches.forEach((c: any) => {
    const total = (c.seasonStats?.matches || 0);
    const wins = (c.seasonStats?.wins || 0);
    c.seasonStats.winRate = total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0;
    const form = c.recentForm || [];
    c.recentForm = form.slice(-5);

    if (c.teamId) {
      const team = db.teams.find((t: any) => t.id === c.teamId);
      if (team) {
        if (!team.stats) team.stats = {};
        team.stats.coach = c.name;
        team.coach = c.name;
      }
    }
  });

  logMessage("info", "database", "هماهنگ‌سازی بازگشتی با موفقیت تمام شد و تمام جداول بروز شدند.");
}
