import { loadDB, setDb } from "../state";
import { normalizePersianString } from "../utils/persian";
import {
  buildPlayerIdentityIndex,
  collectPlayerTeamRefs,
  findMatchLineupPlacement,
  isSamePlayer,
  normalizePlayerName,
  playerTeamMatchesSide,
} from "../../shared/playerIdentity";
import type { PlayerIdentityIndex } from "../../shared/playerIdentity";
import { logMessage } from "../utils/logger";
import { realMinute } from "../../shared/matchMinute";
import { resolveTeam, resolveTeamLeague, normalizeLeagueKey, resolveTeamLeagueWithFallback } from "../../shared/teamMatch";
import { coachOfTeamAt } from "../../shared/coachTenure";

export function calculatePlayerMinutesAndPlayed(
  player: any,
  match: any,
  playersOrIndex?: any[] | PlayerIdentityIndex,
  memberships?: any[]
): { played: boolean; minutes: number; started: boolean } {
  const isFutsal = match.sport === "futsal" || match.league === "futsal";
  const fullDuration = isFutsal ? 40 : 90;

  // Accept a prebuilt index (hot recalc paths) to avoid rebuilding it
  // per player-match pair; fall back to building from the roster or player.
  const index: PlayerIdentityIndex = Array.isArray(playersOrIndex)
    ? buildPlayerIdentityIndex(playersOrIndex.length > 0 ? playersOrIndex : [player])
    : (playersOrIndex || buildPlayerIdentityIndex([player]));
  const same = (ref: { id?: any; name?: any }, side: "home" | "away" | null) =>
    isSamePlayer({ ...ref, side }, player, match, index, memberships || []);

  const lineups = match.lineups || { home: [], away: [] };
  const homeLineup = lineups.home || [];
  const awayLineup = lineups.away || [];

  const inHome = homeLineup.find((lp: any) => same({ id: lp.id, name: lp.name }, "home"));
  const inAway = awayLineup.find((lp: any) => same({ id: lp.id, name: lp.name }, "away"));
  const lineupPlayer = inHome || inAway;

  const events = match.events || [];

  const subInEvents = events.filter((ev: any) => ev && ev.type === "substitution" && same({ id: ev.player2Id, name: ev.player2Name }, ev.team));
  const subInEvent = subInEvents[0];

  const subOutEvents = events.filter((ev: any) => ev && ev.type === "substitution" && same({ id: ev.playerId, name: ev.playerName }, ev.team));
  const subOutEvent = subOutEvents[0];

  const redCardEvents = events.filter((ev: any) => ev && ev.type === "red-card" && same({ id: ev.playerId, name: ev.playerName }, ev.team));
  const redCardEvent = redCardEvents[0];

  const hasOtherEvent = events.some((ev: any) => ev && ev.type !== "substitution" && (same({ id: ev.playerId, name: ev.playerName }, ev.team) || same({ id: ev.player2Id, name: ev.player2Name }, ev.team)));
  const inScorersList = (match.scorersList || []).some((sc: any) => sc && (same({ id: sc.scorerId, name: sc.scorerName || sc.name }, null) || same({ id: sc.assistId, name: sc.assistName || sc.assist }, null)));

  const started = !!lineupPlayer;
  const played = started || !!subInEvent || hasOtherEvent || inScorersList;

  if (!played) {
    return { played: false, minutes: 0, started: false };
  }

  let minutes = fullDuration;
  if (started) {
    if (subOutEvent) {
      minutes = realMinute(subOutEvent.minute, fullDuration) || fullDuration;
    } else if (redCardEvent) {
      minutes = realMinute(redCardEvent.minute, fullDuration) || fullDuration;
    }
  } else if (subInEvent) {
    const inMin = realMinute(subInEvent.minute, fullDuration) || 0;
    if (subOutEvent) {
      const outMin = realMinute(subOutEvent.minute, fullDuration) || fullDuration;
      minutes = Math.max(0, outMin - inMin);
    } else if (redCardEvent) {
      const redMin = realMinute(redCardEvent.minute, fullDuration) || fullDuration;
      minutes = Math.max(0, redMin - inMin);
    } else {
      minutes = Math.max(0, fullDuration - inMin);
    }
  } else {
    if (redCardEvent) {
      minutes = realMinute(redCardEvent.minute, fullDuration) || fullDuration;
    } else if (subOutEvent) {
      minutes = realMinute(subOutEvent.minute, fullDuration) || fullDuration;
    } else {
      minutes = fullDuration;
    }
  }

  return { played: true, minutes, started };
}

export function getPlayerCalculatedStatsFromMatches(playerId: string, matches: any[], allPlayers: any[]): any {
  const player = allPlayers.find((p: any) => String(p.id) === playerId);
  if (!player) return { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, cleanSheets: 0 };

  const index: PlayerIdentityIndex = buildPlayerIdentityIndex(allPlayers);
  const dbForMemberships = loadDB();
  const membershipsForIdentity = (dbForMemberships && dbForMemberships.teamMemberships) || [];
  const membershipsByPlayer = new Map<string, any[]>();
  membershipsForIdentity.forEach((mm: any) => {
    if (!mm || !mm.playerId) return;
    const k = String(mm.playerId);
    const arr = membershipsByPlayer.get(k) || [];
    arr.push(mm);
    membershipsByPlayer.set(k, arr);
  });
  const playerMemberships = membershipsByPlayer.get(String(player.id)) || [];
  
  let matchCount = 0;
  let goalCount = 0;
  let assistCount = 0;
  let yellowCount = 0;
  let redCount = 0;
  let cleanSheetsCount = 0;

  const finishedGames = matches.filter((m: any) => m.status === "finished" && !m.archived_stats && !m.isAutoFinished);

  finishedGames.forEach((match: any) => {
    const same = (ref: { id?: any; name?: any }, side: "home" | "away" | null) =>
      isSamePlayer({ ...ref, side }, player, match, index, playerMemberships);

    let { played: playedThisMatch } = calculatePlayerMinutesAndPlayed(player, match, index, playerMemberships);

    // Rating/lineup source: starters always; substitutes only when they
    // actually entered the pitch (a bench rating without entry is ignored).
    const placement = findMatchLineupPlacement(player, match, index, playerMemberships);
    const inHome = placement.role === "starter" && placement.side === "home";
    const lp = placement.role === "starter" || (placement.role === "substitute" && playedThisMatch)
      ? placement.entry
      : null;
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
      
      const isScorer = same({ id: ev.playerId, name: ev.playerName }, ev.team);
      const isAssistant = same({ id: ev.player2Id, name: ev.player2Name }, ev.team);

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
      const isScorer = same({ id: sc.scorerId, name: sc.scorerName || sc.name }, null);
      const isAssistant = same({ id: sc.assistId, name: sc.assistName || sc.assist }, null);

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

export function getCoachCalculatedStatsFromMatches(coach: any, matches: any[], ctx?: { coaches?: any[]; movements?: any[]; teams?: any[]; appointments?: any[] }): { matches: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number } {
  const result = { matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  if (!coach) return result;
  const coachId = String(coach.id || "");
  const tenureCoaches = ((ctx && ctx.coaches) || []).map((c: any) => ({
    id: String(c.id),
    teamId: c.teamId != null ? String(c.teamId) : null,
  }));
  const tenureMovements = ((ctx && ctx.movements) || []).map((m: any) => ({
    coachId: m.coachId != null ? String(m.coachId) : null,
    fromTeamId: m.fromTeamId != null ? String(m.fromTeamId) : null,
    toTeamId: m.toTeamId != null ? String(m.toTeamId) : null,
    movementDate: m.movementDate || null,
  }));
  const tenureAppointments = ((ctx && ctx.appointments) || []).map((a: any) => ({
    coachId: a.coachId != null ? String(a.coachId) : null,
    teamId: a.teamId != null ? String(a.teamId) : null,
    startDate: a.startDate || null,
    endDate: a.endDate || null,
    status: a.status || null,
  }));
  const holderOf = (teamId: any, date: any): string | null => {
    if (teamId == null || teamId === "") return null;
    // No ledger context (legacy direct callers): keep the old live-mapping
    // rule so behavior is unchanged outside the recalc.
    if (tenureCoaches.length === 0) {
      const coachTeamId = coach.teamId;
      const normTeamName = normalizePersianString(coach.teamName || "");
      void date;
      return null;
    }
    return coachOfTeamAt(String(teamId), date, tenureCoaches, tenureMovements, tenureAppointments);
  };

  const CoachTeamMatchesSide = (teamId: any, teamName: any, date: any): boolean => {
    let tid = teamId != null && String(teamId).trim() !== "" ? String(teamId) : null;
    if (!tid && teamName && ctx && Array.isArray(ctx.teams)) {
      const resolved = resolveTeam(ctx.teams, teamName);
      if (resolved && resolved.id != null) tid = String(resolved.id);
    }
    const holder = holderOf(tid, date);
    if (holder != null) return holder === coachId;
    return false;
  };

  (matches || []).forEach((m: any) => {
    if (!m || m.status !== "finished" || m.isAutoFinished || m.archived_stats) return;

    let isHome = m.coachHomeId && coachId && String(m.coachHomeId) === coachId;
    let isAway = m.coachAwayId && coachId && String(m.coachAwayId) === coachId;

    if (!isHome && !isAway) {
      if (tenureCoaches.length > 0) {
        isHome = CoachTeamMatchesSide(m.teamHomeId, m.teamHome, m.date);
        isAway = !isHome && CoachTeamMatchesSide(m.teamAwayId, m.teamAway, m.date);
      } else {
        const coachTeamId = coach.teamId;
        const normTeamName = normalizePersianString(coach.teamName || "");
        isHome = (coachTeamId && m.teamHomeId && String(m.teamHomeId) === String(coachTeamId)) ||
          (normTeamName && m.teamHome && normalizePersianString(m.teamHome) === normTeamName);
        isAway = (coachTeamId && m.teamAwayId && String(m.teamAwayId) === String(coachTeamId)) ||
          (normTeamName && m.teamAway && normalizePersianString(m.teamAway) === normTeamName);
      }
    }
    if (!isHome && !isAway) return;

    result.matches += 1;
    const hs = parseInt(String(m.scoreHome), 10) || 0;
    const as = parseInt(String(m.scoreAway), 10) || 0;
    const gf = isHome ? hs : as;
    const ga = isHome ? as : hs;
    result.goalsFor += gf;
    result.goalsAgainst += ga;
    if (gf > ga) result.wins += 1;
    else if (gf < ga) result.losses += 1;
    else result.draws += 1;
  });

  return result;
}

export function recalculateAndSyncDatabase(): void {
  const db = loadDB();
  if (!db) return;
  if (!db.players) db.players = [];
  if (!db.teams) db.teams = [];
  if (!db.standings) db.standings = {};

  const getTeamLeague = (teamId: string, teamName?: string): string => {
    // Single source of truth lives in shared/teamMatch (divisionKey, then
    // the legacy keyword lists, defaulting to pro-league).
    return resolveTeamLeagueWithFallback(db.teams, teamId, teamName);
  };

  const hasActiveTeam = (p: any): boolean => {
    if (!p.teamId && !p.teamName) return false;
    const name = normalizePersianString(p.teamName || "");
    if (!name || name === "بازیکن آزاد" || name === "بدون باشگاه") return false;
    return !!resolveTeam(db.teams, p.teamId || p.teamName);
  };

  logMessage("info", "database", "آغاز عملیات هماهنگ‌سازی بازگشتی آمار بازیکنان، تیم‌ها و لیدربردهای لیگ...");

  // Phase 3 (season history): resolve the current season once. db.seasons is
  // authoritative; db.currentSeason (system_info mirror) is the fallback.
  // seasonIdOf normalizes inline (no import from services/database — that
  // module imports this one, so importing back would be circular).
  const activeSeasonRow = Array.isArray((db as any).seasons)
    ? (db as any).seasons.find((s: any) => s && (s.isActive || s.status === "current"))
    : null;
  const currentSeasonId: string | null = (activeSeasonRow && activeSeasonRow.id)
    || (db.currentSeason ? `season-${String(db.currentSeason).replace(/^season-/, "")}` : null);
  const currentSeasonTag: string | null = (activeSeasonRow && activeSeasonRow.name)
    || (db.currentSeason ? String(db.currentSeason).replace(/^season-/, "") : null);
  // Red-team fix (Phase 6): the legacy base* baseline is pinned to the
  // EARLIEST known season, never the floating current season. Otherwise the
  // first recalc after a season switch would drain the old season's displayed
  // numbers and fabricate base numbers into the fresh season — violating
  // "new season = zero records". career == sum(seasons) still holds exactly
  // (the base is counted once, in the earliest season).
  const baseSeasonRow = (() => {
    const all = Array.isArray((db as any).seasons) ? (db as any).seasons.filter((s: any) => s && s.id) : [];
    if (all.length === 0) return null;
    return [...all].sort((a: any, b: any) => String(a.name || a.id).localeCompare(String(b.name || b.id)))[0];
  })();
  const baseSeasonId: string | null = (baseSeasonRow && baseSeasonRow.id) || currentSeasonId;
  const baseSeasonTag: string | null = (baseSeasonRow && baseSeasonRow.name) || currentSeasonTag;
  const seasonIdOf = (m: any): string | null => {
    if (!m) return currentSeasonId;
    if (m.seasonId) return String(m.seasonId);
    if (m.season_id) return String(m.season_id);
    const tag = m.season != null ? String(m.season).trim() : "";
    if (tag) return tag.startsWith("season-") ? tag : `season-${tag}`;
    return currentSeasonId;
  };
  const seasonTagOf = (m: any): string | null => {
    if (!m) return currentSeasonTag;
    if (m.season != null && String(m.season).trim()) return String(m.season).trim().replace(/^season-/, "");
    const sid = seasonIdOf(m);
    if (sid) return sid.replace(/^season-/, "");
    return currentSeasonTag;
  };

  // Per-(entity, season, club) aggregates, accumulated in the SAME pass and
  // under the SAME gates as the all-time numbers, so season rows always
  // reconcile with the displayed totals. Flattened to db.playerSeasonStats /
  // db.coachSeasonStats / db.teamSeasonStats at the end of this function.
  type SeasonSplit = { matches: number; goals: number; assists: number; cleanSheets: number; yellowCards: number; redCards: number; minutes: number; mvps: number; ratingSum: number; ratingCount: number; averageRating: number | null };
  const newSeasonSplit = (): SeasonSplit => ({ matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, minutes: 0, mvps: 0, ratingSum: 0, ratingCount: 0, averageRating: null });
  const playerSeasonBuckets = new Map<string, { playerId: string; seasonId: string | null; seasonTag: string | null; clubId: string | null; clubName: string | null; league: SeasonSplit; cup: SeasonSplit }>();
  const coachSeasonBuckets = new Map<string, { coachId: string; seasonId: string | null; seasonTag: string | null; teamId: string | null; teamName: string | null; matches: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number }>();
  const teamSeasonBuckets = new Map<string, { teamId: string; teamName: string; seasonId: string | null; seasonTag: string | null; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }>();
  const bucketId = (prefix: string, a: string, s: string | null, c: string | null): string =>
    `${prefix}-${a}~${s || "noseason"}~${c || "noclub"}`;
  const bumpTeamSeasonBucket = (teamObj: any, sid: string | null, stag: string | null, scored: number, conceded: number): void => {
    if (!teamObj || !teamObj.id) return;
    const key = `${teamObj.id}~${sid || "noseason"}`;
    let b = teamSeasonBuckets.get(key);
    if (!b) {
      b = { teamId: String(teamObj.id), teamName: teamObj.name || "", seasonId: sid, seasonTag: stag, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      teamSeasonBuckets.set(key, b);
    }
    b.played += 1;
    b.goalsFor += scored;
    b.goalsAgainst += conceded;
    if (scored > conceded) { b.won += 1; b.points += 3; }
    else if (scored < conceded) { b.lost += 1; }
    else { b.drawn += 1; b.points += 1; }
  };
  const bumpCoachSeasonBucket = (coach: any, teamObj: any, sid: string | null, stag: string | null, scored: number, conceded: number): void => {
    if (!coach || !coach.id) return;
    const tid = teamObj && teamObj.id ? String(teamObj.id) : (coach.teamId ? String(coach.teamId) : null);
    const key = `${coach.id}~${sid || "noseason"}~${tid || "noclub"}`;
    let b = coachSeasonBuckets.get(key);
    if (!b) {
      b = { coachId: String(coach.id), seasonId: sid, seasonTag: stag, teamId: tid, teamName: (teamObj && teamObj.name) || coach.teamName || null, matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
      coachSeasonBuckets.set(key, b);
    }
    b.matches += 1;
    b.goalsFor += scored;
    b.goalsAgainst += conceded;
    if (scored > conceded) b.wins += 1;
    else if (scored < conceded) b.losses += 1;
    else b.draws += 1;
  };

  // Hoisted: identical for every player (was rebuilt per player inside the loop).
  const nonCupMatchesForBase = (db.matches || []).filter((m: any) => m.league !== "hazfi-cup");

  db.players.forEach((p: any) => {
    // One-time legacy seeding only: if all base* are already defined (the
    // common case after the first run), skip the full player x matches scan.
    const needsBaseSeed =
      p.baseMatches === undefined || p.baseGoals === undefined ||
      p.baseAssists === undefined || p.baseCleanSheets === undefined ||
      p.baseYellowCards === undefined || p.baseRedCards === undefined;
    let calc = { matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 };
    if (needsBaseSeed) {
      calc = getPlayerCalculatedStatsFromMatches(String(p.id), nonCupMatchesForBase, db.players);
    }
    
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
      ratingSum: 0,
      ratingCount: 0,
      averageRating: null
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
      averageRating: null
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
      averageRating: null
    };
    p.ratingsHistory = [];
  });

  // Team-side equivalent of the player base seeding below: what db.matches
  // already explain under the SAME gates the loop uses (finished, non-auto,
  // league only). Base = stored minus that (floored at 0), so matches present
  // in db can never be counted twice. (The old formula seeded base = stored
  // in full, which double-counted for any team whose stored stats already
  // reflected db.matches — see Ario Eslamshahr, the only nonzero-base team.)
  const calcTeamBase = (teamId: any, teamName: any): { played: number; won: number; drawn: number; lost: number; points: number; goalsFor: number; goalsAgainst: number } => {
    const out = { played: 0, won: 0, drawn: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0 };
    const norm = normalizePersianString(String(teamName || ""));
    for (const m of nonCupMatchesForBase) {
      if (!m || m.status !== "finished" || m.isAutoFinished || (m as any).archived_standings) continue;
      const isHome = (m.teamHomeId != null && String(m.teamHomeId) === String(teamId)) ||
        (norm !== "" && normalizePersianString(m.teamHome || "") === norm);
      const isAway = (m.teamAwayId != null && String(m.teamAwayId) === String(teamId)) ||
        (norm !== "" && normalizePersianString(m.teamAway || "") === norm);
      if (!isHome && !isAway) continue;
      const hp = parseInt(String(m.scoreHome), 10) || 0;
      const ap = parseInt(String(m.scoreAway), 10) || 0;
      const scored = isHome ? hp : ap;
      const conceded = isHome ? ap : hp;
      out.played += 1;
      out.goalsFor += scored;
      out.goalsAgainst += conceded;
      if (scored > conceded) { out.won += 1; out.points += 3; }
      else if (scored < conceded) { out.lost += 1; }
      else { out.drawn += 1; out.points += 1; }
    }
    return out;
  };

  db.teams.forEach((t: any) => {
    const needsTeamBaseSeed =
      t.basePlayed === undefined || t.baseWon === undefined ||
      t.baseDrawn === undefined || t.baseLost === undefined ||
      t.basePoints === undefined || t.baseGoalsFor === undefined ||
      t.baseGoalsAgainst === undefined;
    const teamCalc = needsTeamBaseSeed
      ? calcTeamBase(t.id, t.name)
      : { played: 0, won: 0, drawn: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0 };
    if (t.basePlayed === undefined) t.basePlayed = Math.max(0, (parseInt(t.stats?.played) || 0) - teamCalc.played);
    if (t.baseWon === undefined) t.baseWon = Math.max(0, (parseInt(t.stats?.won) || 0) - teamCalc.won);
    if (t.baseDrawn === undefined) t.baseDrawn = Math.max(0, (parseInt(t.stats?.drawn) || 0) - teamCalc.drawn);
    if (t.baseLost === undefined) t.baseLost = Math.max(0, (parseInt(t.stats?.lost) || 0) - teamCalc.lost);
    if (t.basePoints === undefined) t.basePoints = Math.max(0, (parseInt(t.stats?.points) || 0) - teamCalc.points);
    if (t.baseGoalsFor === undefined) t.baseGoalsFor = Math.max(0, (parseInt(t.stats?.goalsFor) || 0) - teamCalc.goalsFor);
    if (t.baseGoalsAgainst === undefined) t.baseGoalsAgainst = Math.max(0, (parseInt(t.stats?.goalsAgainst) || 0) - teamCalc.goalsAgainst);

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
    if (m && m.status === "finished" && !m.isAutoFinished) {
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

  // Stable identity first: every known id plus, for each normalized name,
  // EVERY player sharing it (so duplicate names never collapse to one survivor).
  const identityIndex: PlayerIdentityIndex = buildPlayerIdentityIndex(db.players);
  const membershipsByPlayer = new Map<string, any[]>();
  (db.teamMemberships || []).forEach((mm: any) => {
    if (!mm || !mm.playerId) return;
    const k = String(mm.playerId);
    const arr = membershipsByPlayer.get(k) || [];
    arr.push(mm);
    membershipsByPlayer.set(k, arr);
  });
  const playerNameToIds = new Map<string, string[]>();
  db.players.forEach((p: any) => {
    if (!p || !p.name || !p.id) return;
    const key = normalizePlayerName(p.name);
    if (!key) return;
    const arr = playerNameToIds.get(key) || [];
    if (!arr.includes(String(p.id))) arr.push(String(p.id));
    playerNameToIds.set(key, arr);
  });

  const teamMap: Record<string, any> = {};
  db.teams.forEach((t: any) => {
    teamMap[t.id] = t;
    if (t.name) {
      teamMap[t.name] = t;
      teamMap[normalizePersianString(t.name)] = t;
    }
  });

  const coachById: Record<string, any> = {};
  db.coaches.forEach((c: any) => {
    coachById[c.id] = c;
  });

  // Movement-aware tenure inputs: WHO coached team T on date D, resolved from
  // the ledger — never from live assignments (a transfer must not rewrite
  // history on the next recalc). Coaches without any movement rows keep their
  // current team since -infinity, which degenerates EXACTLY to the old
  // current-mapping behavior for the 99% untransferred case.
  // P2: appointment intervals take precedence per team wherever they exist.
  const tenureCoaches = (db.coaches || []).map((c: any) => ({
    id: String(c.id),
    teamId: c.teamId != null ? String(c.teamId) : null,
  }));
  const tenureMovements = (db.coachMovements || []).map((m: any) => ({
    coachId: m.coachId != null ? String(m.coachId) : null,
    fromTeamId: m.fromTeamId != null ? String(m.fromTeamId) : null,
    toTeamId: m.toTeamId != null ? String(m.toTeamId) : null,
    movementDate: m.movementDate || null,
  }));
  const tenureAppointments = (db.coachAppointments || []).map((a: any) => ({
    coachId: a.coachId != null ? String(a.coachId) : null,
    teamId: a.teamId != null ? String(a.teamId) : null,
    startDate: a.startDate || null,
    endDate: a.endDate || null,
    status: a.status || null,
  }));

  finishedGames.forEach((match: any) => {
    const hp = parseInt(String(match.scoreHome), 10) || 0;
    const ap = parseInt(String(match.scoreAway), 10) || 0;
    // Canonical season for this match (Phase 1 guarantees season_id on all
    // stored matches; current season is the defensive fallback only).
    const sid = seasonIdOf(match);
    const stag = seasonTagOf(match);

    const homeTeam = teamMap[match.teamHome] || teamMap[normalizePersianString(match.teamHome || "")] || teamMap[match.teamHomeId];
    const awayTeam = teamMap[match.teamAway] || teamMap[normalizePersianString(match.teamAway || "")] || teamMap[match.teamAwayId];

    const isCup = match.league === "hazfi-cup";

    const standingsGate = isCup ? !match.archived_bracket : !match.archived_standings;
    if (standingsGate) {
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
        // Season bucket mirrors the exact same gate (league, non-archived):
        // one row per (team, season), so displayed standings stay the sum.
        if (homeTeam) bumpTeamSeasonBucket(homeTeam, sid, stag, hp, ap);
        if (awayTeam) bumpTeamSeasonBucket(awayTeam, sid, stag, ap, hp);
      }

      // Coach identity: stamped match ids first, then movement-aware tenure
      // (who held this team on this date). Deliberately NO live-mapping
      // fallback: resolving via current assignments is what rewrote history
      // on every post-transfer recalc.
      const resolveSideCoach = (stampedId: any, teamObj: any): any | null => {
        if (stampedId != null && String(stampedId).trim() !== "" && coachById[String(stampedId)]) {
          return coachById[String(stampedId)];
        }
        const tid = teamObj && teamObj.id != null ? String(teamObj.id) : null;
        if (!tid) return null;
        const holderId = coachOfTeamAt(tid, match.date, tenureCoaches, tenureMovements, tenureAppointments);
        return (holderId && coachById[holderId]) || null;
      };
      const homeCoach = resolveSideCoach(match.coachHomeId, homeTeam);
      const awayCoach = resolveSideCoach(match.coachAwayId, awayTeam);
      if (!match.archived_stats && (homeCoach || awayCoach)) {
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
        // Season buckets mirror the exact same scope: structurally inside the
        // standings gate AND the archived_stats gate, cups included — one row
        // per (coach, season, team), reconciling with coach.seasonStats.
        if (homeCoach) bumpCoachSeasonBucket(homeCoach, homeTeam, sid, stag, hp, ap);
        if (awayCoach) bumpCoachSeasonBucket(awayCoach, awayTeam, sid, stag, ap, hp);
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
        if (ev.playerId) idsAndNames.add(String(ev.playerId));
        if (ev.playerName) idsAndNames.add(ev.playerName);
        if (ev.player2Id) idsAndNames.add(String(ev.player2Id));
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
      const dupIds = playerNameToIds.get(normalizePlayerName(String(key)));
      if (dupIds) dupIds.forEach(id => involvedPlayerIds.add(id));
    });

    involvedPlayerIds.forEach(pId => {
      const pObj = playerMap[pId];
      if (!pObj || match.archived_stats) return;

      const isFutsal = match.sport === "futsal" || match.league === "futsal";
      const fullDuration = isFutsal ? 40 : 90;
      const pMemberships = membershipsByPlayer.get(String(pObj.id)) || [];

      const same = (ref: { id?: any; name?: any }, side: "home" | "away" | null) =>
        isSamePlayer({ ...ref, side }, pObj, match, identityIndex, pMemberships);

      const playInfo = calculatePlayerMinutesAndPlayed(pObj, match, identityIndex, pMemberships);
      if (!playInfo.played) {
        return;
      }

      let lGoals = 0;
      let lAssists = 0;
      let lYellow = 0;
      let lRed = 0;
      let minutesPlayed = playInfo.minutes;

      const placementForEntry = findMatchLineupPlacement(pObj, match, identityIndex, pMemberships);
      const lp = placementForEntry.entry;
      
      if (lp) {
        lGoals = parseInt(lp.goals) || 0;
        lAssists = parseInt(lp.assists) || 0;
        lYellow = (lp.yellowCard || lp.yellowCards) ? 1 : 0;
        lRed = (lp.redCard || lp.redCards) ? 1 : 0;
        if (lp.minutesPlayed !== undefined) {
          minutesPlayed = realMinute(lp.minutesPlayed, fullDuration) || minutesPlayed;
        }
      }

      let evGoals = 0;
      let evAssists = 0;
      let evYellow = 0;
      let evRed = 0;

      const events = match.events || [];
      events.forEach((ev: any) => {
        if (!ev) return;
        if (ev.playerName && same({ id: ev.playerId, name: ev.playerName }, ev.team)) {
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
        if (ev.player2Name && same({ id: ev.player2Id, name: ev.player2Name }, ev.team)) {
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
        const isScorer = same({ id: sc.scorerId, name: sc.scorerName || sc.name }, null);
        const isAssistant = same({ id: sc.assistId, name: sc.assistName || sc.assist }, null);

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
          const pMemberships = membershipsByPlayer.get(String(pObj.id)) || [];

          const sameSide = (ref: { id?: any; name?: any }, side: "home" | "away" | null) =>
            isSamePlayer({ ...ref, side }, pObj, match, identityIndex, pMemberships);
          // This player is in matchPlayerset, i.e. involved in this match, so a
          // substitute rating counts; bench ratings without entry never reach here.
          const placement = findMatchLineupPlacement(pObj, match, identityIndex, pMemberships);
          const lp = placement.entry;
          let isHome: boolean | null = placement.side === "home" ? true :
            placement.side === "away" ? false : null;
          if (isHome === null) {
            const sideEvent = (match.events || []).find((ev: any) => ev && (sameSide({ id: ev.playerId, name: ev.playerName }, ev.team) || sameSide({ id: ev.player2Id, name: ev.player2Name }, ev.team)) && (ev.team === "home" || ev.team === "away"));
            isHome = sideEvent ? sideEvent.team === "home" : null;
          }
          if (isHome === null) {
            const refs = collectPlayerTeamRefs(pObj, pMemberships, match);
            if (refs.some((r) => playerTeamMatchesSide(r, match, "home"))) isHome = true;
            else if (refs.some((r) => playerTeamMatchesSide(r, match, "away"))) isHome = false;
          }
          const conceded = isHome ? (parseInt(String(match.scoreAway), 10) || 0) : (parseInt(String(match.scoreHome), 10) || 0);
          const cleanSheetCount = (isGK && conceded === 0) ? 1 : 0;
           const isMvp = isSamePlayer({ id: match.mvpId, name: (match as any).mvpName }, pObj, match, identityIndex, pMemberships);
          const rawRating = lp && lp.rating != null ? parseFloat(String(lp.rating)) : null;
          const hasValidRating = rawRating != null && !isNaN(rawRating) && rawRating > 0;
          const ratingVal = hasValidRating ? rawRating : null;

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
            if (ratingVal != null) {
              pObj.cupStats.ratingSum = (pObj.cupStats.ratingSum || 0) + ratingVal;
              pObj.cupStats.ratingCount = (pObj.cupStats.ratingCount || 0) + 1;
              pObj.cupStats.averageRating = parseFloat((pObj.cupStats.ratingSum / pObj.cupStats.ratingCount).toFixed(1));
            }
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
            if (ratingVal != null) {
              pObj.leagueStats.ratingSum = (pObj.leagueStats.ratingSum || 0) + ratingVal;
              pObj.leagueStats.ratingCount = (pObj.leagueStats.ratingCount || 0) + 1;
              pObj.leagueStats.averageRating = parseFloat((pObj.leagueStats.ratingSum / pObj.leagueStats.ratingCount).toFixed(1));
            }
         }

         pObj.seasonStats.matches += 1;
         pObj.seasonStats.goals += stats.goals;
         pObj.seasonStats.assists += stats.assists;
         pObj.seasonStats.yellowCards = (pObj.seasonStats.yellowCards || 0) + stats.yellow;
         pObj.seasonStats.redCards = (pObj.seasonStats.redCards || 0) + stats.red;
         pObj.seasonStats.cleanSheets = (pObj.seasonStats.cleanSheets || 0) + cleanSheetCount;
         pObj.seasonStats.minutes = (pObj.seasonStats.minutes || 0) + stats.minutes;
          pObj.seasonStats.mvps = (pObj.seasonStats.mvps || 0) + (isMvp ? 1 : 0);

          // Season bucket: the club is the side actually played for in THIS
          // match (not the player's current club), so mid-season transfers
          // split correctly across clubs. League/cup split preserved.
          const playedClub = isHome === true ? homeTeam : isHome === false ? awayTeam : null;
          const playedClubId = playedClub && playedClub.id ? String(playedClub.id) : null;
          const playedClubName = (playedClub && playedClub.name) || null;
          const psKey = `${pObj.id}~${sid || "noseason"}~${playedClubId || "noclub"}`;
          let psb = playerSeasonBuckets.get(psKey);
          if (!psb) {
            psb = { playerId: String(pObj.id), seasonId: sid, seasonTag: stag, clubId: playedClubId, clubName: playedClubName, league: newSeasonSplit(), cup: newSeasonSplit() };
            playerSeasonBuckets.set(psKey, psb);
          }
          const psSplit = isCup ? psb.cup : psb.league;
          psSplit.matches += 1;
          psSplit.goals += stats.goals;
          psSplit.assists += stats.assists;
          psSplit.yellowCards += stats.yellow;
          psSplit.redCards += stats.red;
          psSplit.cleanSheets += cleanSheetCount;
          psSplit.minutes += stats.minutes;
          psSplit.mvps += isMvp ? 1 : 0;
          if (ratingVal != null) {
            psSplit.ratingSum += ratingVal;
            psSplit.ratingCount += 1;
            psSplit.averageRating = parseFloat((psSplit.ratingSum / psSplit.ratingCount).toFixed(1));
          }

          const oppTeam = isHome ? match.teamAway : match.teamHome;

          const alreadyIn = pObj.ratingsHistory.some((item: any) => item.matchId === match.id);
          if (!alreadyIn) {
            pObj.ratingsHistory.push({
              matchId: match.id,
              seasonId: sid,
              matchOpponent: oppTeam,
              isCup: isCup,
              rating: ratingVal,
              date: match.date,
              time: match.time || "00:00",
              goals: stats.goals,
              assists: stats.assists,
               minutes: stats.minutes,
               isMvp: isSamePlayer({ id: match.mvpId, name: (match as any).mvpName }, pObj, match, identityIndex, pMemberships)
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

       const validRatings = p.ratingsHistory.filter((x: any) => x.rating != null && x.rating > 0);
       if (validRatings.length > 0) {
         const sum = validRatings.reduce((acc: number, item: any) => acc + item.rating, 0);
         p.averageRating = parseFloat((sum / validRatings.length).toFixed(1));
       } else {
         p.averageRating = null;
       }
       if (p.seasonStats) {
         p.seasonStats.averageRating = p.averageRating;
       }

       const leagueRatings = p.ratingsHistory.filter((x: any) => !x.isCup && x.rating != null && x.rating > 0);
       if (leagueRatings.length > 0) {
         const lSum = leagueRatings.reduce((acc: number, item: any) => acc + item.rating, 0);
         if (p.leagueStats) {
           p.leagueStats.averageRating = parseFloat((lSum / leagueRatings.length).toFixed(1));
         }
       } else if (p.leagueStats) {
         p.leagueStats.averageRating = null;
       }

       const cupRatings = p.ratingsHistory.filter((x: any) => x.isCup && x.rating != null && x.rating > 0);
       if (cupRatings.length > 0) {
         const cSum = cupRatings.reduce((acc: number, item: any) => acc + item.rating, 0);
         if (p.cupStats) {
           p.cupStats.averageRating = parseFloat((cSum / cupRatings.length).toFixed(1));
         }
       } else if (p.cupStats) {
         p.cupStats.averageRating = null;
       }
     } else {
       p.averageRating = null;
       if (p.seasonStats) p.seasonStats.averageRating = null;
       if (p.leagueStats) p.leagueStats.averageRating = null;
       if (p.cupStats) p.cupStats.averageRating = null;
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
        score: scoreStr,
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
      eligiblePlayers = db.players.filter((p: any) => hasActiveTeam(p) && normalizeLeagueKey(getTeamLeague(p.teamId, p.teamName)) === leagueKey);
    }

    const scorers = [...eligiblePlayers]
      .map((p: any) => {
        const goals = leagueKey === "hazfi-cup" ? (p.cupStats?.goals || 0) : (p.leagueStats?.goals || 0);
        return { p, goals };
      })
      .filter((item: any) => item.goals > 0)
      .sort((a: any, b: any) => b.goals - a.goals)
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
      .map((item: any, idx: number) => ({
        rank: idx + 1,
        name: item.p.name,
        team: item.p.teamName,
        cleanSheets: item.cleanSheets
      }));

    const ratings = [...eligiblePlayers]
      .map((p: any) => {
        const rating = leagueKey === "hazfi-cup" ? (p.cupStats?.averageRating ?? null) : (p.leagueStats?.averageRating ?? null);
        return { p, rating };
      })
      .filter((item: any) => item.rating != null && item.rating > 0)
      .sort((a: any, b: any) => b.rating - a.rating)
      .map((item: any, idx: number) => ({
        rank: idx + 1,
        name: item.p.name,
        team: item.p.teamName,
        rating: item.rating
      }));

    db.stats[leagueKey] = { scorers, assists, cleansheets, ratings };
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

  // Legacy baseline attribution (Option B, pinned): base* values capture
  // matches NOT present in db.matches. The baseline is pinned to the earliest
  // known season (baseSeasonId) — the same attribution the displayed all-time
  // numbers already use. This keeps the invariant career == sum(seasons) exact
  // for every entity AND keeps fresh seasons at true zero.
  if (baseSeasonId) {
    db.players.forEach((p: any) => {
      const bM = p.baseMatches || 0, bG = p.baseGoals || 0, bA = p.baseAssists || 0;
      const bCS = p.baseCleanSheets || 0, bY = p.baseYellowCards || 0, bR = p.baseRedCards || 0;
      if (!bM && !bG && !bA && !bCS && !bY && !bR) return;
      const clubId = p.teamId ? String(p.teamId) : null;
      const key = `${p.id}~${baseSeasonId}~${clubId || "noclub"}`;
      let b = playerSeasonBuckets.get(key);
      if (!b) {
        b = { playerId: String(p.id), seasonId: baseSeasonId, seasonTag: baseSeasonTag, clubId, clubName: p.teamName || null, league: newSeasonSplit(), cup: newSeasonSplit() };
        playerSeasonBuckets.set(key, b);
      }
      // Base was seeded against non-cup matches only -> league split.
      b.league.matches += bM;
      b.league.goals += bG;
      b.league.assists += bA;
      b.league.cleanSheets += bCS;
      b.league.yellowCards += bY;
      b.league.redCards += bR;
      b.league.minutes += bM * 90;
    });
    db.teams.forEach((t: any) => {
      const bP = t.basePlayed || 0, bW = t.baseWon || 0, bD = t.baseDrawn || 0;
      const bL = t.baseLost || 0, bPts = t.basePoints || 0;
      const bGF = t.baseGoalsFor || 0, bGA = t.baseGoalsAgainst || 0;
      if (!bP && !bW && !bD && !bL && !bPts && !bGF && !bGA) return;
      const key = `${t.id}~${baseSeasonId}`;
      let b = teamSeasonBuckets.get(key);
      if (!b) {
        b = { teamId: String(t.id), teamName: t.name || "", seasonId: baseSeasonId, seasonTag: baseSeasonTag, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
        teamSeasonBuckets.set(key, b);
      }
      b.played += bP; b.won += bW; b.drawn += bD; b.lost += bL;
      b.points += bPts; b.goalsFor += bGF; b.goalsAgainst += bGA;
    });
    db.coaches.forEach((c: any) => {
      const bM = c.baseMatches || 0, bW = c.baseWins || 0, bD = c.baseDraws || 0, bL = c.baseLosses || 0;
      if (!bM && !bW && !bD && !bL) return;
      const tid = c.teamId ? String(c.teamId) : null;
      const key = `${c.id}~${baseSeasonId}~${tid || "noclub"}`;
      let b = coachSeasonBuckets.get(key);
      if (!b) {
        b = { coachId: String(c.id), seasonId: baseSeasonId, seasonTag: baseSeasonTag, teamId: tid, teamName: c.teamName || null, matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
        coachSeasonBuckets.set(key, b);
      }
      b.matches += bM; b.wins += bW; b.draws += bD; b.losses += bL;
    });
  }

  // Flatten buckets to the durable memory arrays (persisted by saveDB).
  const finSplit = (s: SeasonSplit) => ({ matches: s.matches, goals: s.goals, assists: s.assists, cleanSheets: s.cleanSheets, yellowCards: s.yellowCards, redCards: s.redCards, minutes: s.minutes, mvps: s.mvps, ratingSum: s.ratingSum, ratingCount: s.ratingCount, averageRating: s.averageRating });
  const nowIso = new Date().toISOString();
  db.playerSeasonStats = [...playerSeasonBuckets.values()].map((b) => {
    const rSum = b.league.ratingSum + b.cup.ratingSum;
    const rCount = b.league.ratingCount + b.cup.ratingCount;
    return {
      id: bucketId("pss", b.playerId, b.seasonId, b.clubId),
      playerId: b.playerId,
      season: b.seasonTag,
      seasonId: b.seasonId,
      teamId: b.clubId,
      teamName: b.clubName,
      matches: b.league.matches + b.cup.matches,
      goals: b.league.goals + b.cup.goals,
      assists: b.league.assists + b.cup.assists,
      cleanSheets: b.league.cleanSheets + b.cup.cleanSheets,
      yellowCards: b.league.yellowCards + b.cup.yellowCards,
      redCards: b.league.redCards + b.cup.redCards,
      minutes: b.league.minutes + b.cup.minutes,
      avgRating: rCount > 0 ? parseFloat((rSum / rCount).toFixed(1)) : null,
      ratings: { count: rCount, sum: parseFloat(rSum.toFixed(1)) },
      leagueStats: finSplit(b.league),
      cupStats: finSplit(b.cup),
      createdAt: nowIso
    };
  });
  db.coachSeasonStats = [...coachSeasonBuckets.values()].map((b) => ({
    id: bucketId("css", b.coachId, b.seasonId, b.teamId),
    coachId: b.coachId,
    season: b.seasonTag,
    seasonId: b.seasonId,
    teamId: b.teamId,
    teamName: b.teamName,
    matches: b.matches,
    wins: b.wins,
    draws: b.draws,
    losses: b.losses,
    goalsFor: b.goalsFor,
    goalsAgainst: b.goalsAgainst,
    winRate: b.matches > 0 ? parseFloat(((b.wins / b.matches) * 100).toFixed(1)) : 0,
    createdAt: nowIso
  }));
  db.teamSeasonStats = [...teamSeasonBuckets.values()].map((b) => ({
    id: `tss-${b.teamId}~${b.seasonId || "noseason"}`,
    teamId: b.teamId,
    teamName: b.teamName,
    season: b.seasonTag,
    seasonId: b.seasonId,
    played: b.played,
    won: b.won,
    drawn: b.drawn,
    lost: b.lost,
    goalsFor: b.goalsFor,
    goalsAgainst: b.goalsAgainst,
    points: b.points,
    rank: null,
    createdAt: nowIso
  }));

  logMessage("info", "database", "هماهنگ‌سازی بازگشتی با موفقیت تمام شد و تمام جداول بروز شدند.");
}
