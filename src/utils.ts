/**
 * Returns a robust image URL, proxying third-party assets (like Varzesh3)
 * to bypass referrer blocks and hotlinking prevention in iframe environments.
 */
import { resolveTeamLeague } from "./shared/teamMatch";

export const getSafeImageUrl = (url: string): string => {
  if (!url) {
    return "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800";
  }
  
  // If it's a relative URL or already a proxied URL, keep it as is
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
    return url;
  }

  // Route any Varzesh3 or external scraper images through our local proxy
  if (url.includes("varzesh3.com") || url.includes("varzesh") || url.includes("livescore")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }

  return url;
};

/**
 * Returns loaded database coaches from window global
 */

const APP_DATA_TTL_MS = 30_000;
let appDataCache: { data: any; ts: number } | null = null;
let appDataInFlight: Promise<any> | null = null;

/**
 * Fetches /api/data with a short in-memory cache (30s) + single-flight dedup.
 * Reduces redundant full downloads of the ~1MB dataset on every route change.
 * Uses browser cache ("default") so the server ETag can return 304 without body.
 */
export const fetchCachedAppData = (): Promise<any> => {
  const now = Date.now();
  if (appDataCache && now - appDataCache.ts < APP_DATA_TTL_MS) {
    return Promise.resolve(appDataCache.data);
  }
  if (appDataInFlight) return appDataInFlight;
  appDataInFlight = fetch("/api/data")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data) appDataCache = { data, ts: Date.now() };
      return data;
    })
    .finally(() => {
      appDataInFlight = null;
    });
  return appDataInFlight;
};

/**
 * Invalidates the 30s in-memory /api/data cache so the next fetch is fresh.
 * Must be called after any admin mutation before refreshing the UI.
 */
export const invalidateAppDataCache = (): void => {
  appDataCache = null;
  appDataInFlight = null;
};

/**
 * Returns loaded database teams from window global
 */
export const getDbTeams = (): any[] => {
  return (window as any).db_teams || [];
};

/**
 * Returns loaded database players from window global
 */
export const getDbPlayers = (): any[] => {
  return (window as any).db_players || [];
};

export const getDbCoaches = (): any[] => {
  return (window as any).db_coaches || [];
};

/**
 * Checks if a team exists in the current database
 */
export const isTeamInDb = (teamIdentifier: string): boolean => {
  if (!teamIdentifier) return false;
  const teams = getDbTeams();
  return teams.some(t => 
    t.id?.toString() === teamIdentifier?.toString() || 
    (t.name && teamIdentifier && normalizePersianString(t.name) === normalizePersianString(teamIdentifier)) || 
    (t.name && teamIdentifier && t.name.includes(teamIdentifier)) || 
    (t.name && teamIdentifier && teamIdentifier.includes(t.name))
  );
};

/**
 * Checks if a player exists in the current database
 */
export const isPlayerInDb = (playerIdentifier: string): boolean => {
  if (!playerIdentifier) return false;
  const players = getDbPlayers();
  return players.some(p => 
    p.id?.toString() === playerIdentifier?.toString() || 
    p.name === playerIdentifier || 
    (p.name && playerIdentifier && p.name.includes(playerIdentifier)) || 
    (p.name && playerIdentifier && playerIdentifier.includes(p.name))
  );
};

// Convert Persian and Arabic numbers to normal English numbers
export function toEnglishDigits(str: string): string {
  if (!str) return "";
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let result = String(str);
  for (let i = 0; i < 10; i++) {
    result = result.replace(persianDigits[i], String(i)).replace(arabicDigits[i], String(i));
  }
  return result;
}

export function normalizePersianString(str: string): string {
  if (!str) return "";
  return String(str)
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // remove zero-width spaces
    .replace(/[\s\t]+/g, " ")             // normalize multiple spaces to single space
    .replace(/‏/g, "")                    // remove right-to-left mark
    .replace(/ي/g, "ی")                   // Arabic Ye to Persian Ye
    .replace(/ك/g, "ک")                   // Arabic Ke to Persian Ke
    .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))) // Persian digits to English
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))) // Arabic digits to English
    .toLowerCase();
}

/**
 * Recalculates team standings, individual player stats, and historical ratings dynamically
 * from finished and live games in the matches array.
 */
export function computeDynamicAppletStats(
  rawMatches: any[],
  rawTeams: any[],
  rawPlayers: any[],
  persistedStandings?: Record<string, any[]>,
  persistedStats?: Record<string, any>
): {
  processedMatches: any[];
  processedTeams: any[];
  processedPlayers: any[];
  processedStats: Record<string, any>;
  processedStandings: Record<string, any[]>;
} {
  const now = new Date();

  // 1. DYNAMIC MATCH STATUS CALCULATOR
  const processedMatches = rawMatches.map((match: any) => {
    // Preserve manual status overrides by Admin to avoid resetting manual finishes
    if (match.status === "finished") {
      return match;
    }
    // Determine status and minutes based on real-world system clock
    if (match.date && match.time) {
      try {
        const parts = match.date.split("-");
        if (parts.length === 3) {
          const yr = parseInt(parts[0], 10);
          const mo = parseInt(parts[1], 10) - 1;
          const dy = parseInt(parts[2], 10);

          const timeClean = toEnglishDigits(match.time || "18:00");
          const tParts = timeClean.split(":");
          const hr = parseInt(tParts[0], 10) || 18;
          const mn = parseInt(tParts[1], 10) || 0;

          const matchDateObj = new Date(yr, mo, dy, hr, mn, 0, 0);
          const elapsedMs = now.getTime() - matchDateObj.getTime();

          if (elapsedMs < 0) {
            // Future game
            return {
              ...match,
              status: "not-started",
              scoreHome: 0,
              scoreAway: 0
            };
          } else if (elapsedMs < 110 * 60 * 1000) {
            // Live game - always update minutes based on clock
            const elapsedMins = Math.floor(elapsedMs / (60 * 1000)) || 1;
            let scHome = match.scoreHome ?? 0;
            const scAway = match.scoreAway ?? 0;
            // Only inject fake scores if not already set by admin
            if (match.status !== "live" && scHome === 0 && scAway === 0 && elapsedMins > 45) {
              scHome = 1;
            }

            return {
              ...match,
              status: "live",
              minutes: String(elapsedMins),
              scoreHome: scHome,
              scoreAway: scAway
            };
          } else {
            // Finished game
            return {
              ...match,
              status: "finished"
            };
          }
        }
      } catch (err) {
        console.error("Error computing dynamic status for match", match.id, err);
      }
    }
    return match;
  });

  // 2. Map Teams directly from the Server-supplied data (preserves all server recalculations)
  const processedTeams = rawTeams.map((t: any) => {
    const statsObj = t.stats || {};
    return {
      ...t,
      stats: {
        played: parseInt(statsObj.played) || 0,
        won: parseInt(statsObj.won) || 0,
        drawn: parseInt(statsObj.drawn) || 0,
        lost: parseInt(statsObj.lost) || 0,
        goalsFor: parseInt(statsObj.goalsFor) || 0,
        goalsAgainst: parseInt(statsObj.goalsAgainst) || 0,
        points: parseInt(statsObj.points) || 0,
        rank: parseInt(statsObj.rank) || 0
      },
      recentForm: t.recentForm || []
    };
  });

  // 3. Map Players directly from server values, using seasonStats directly to avoid matching-discrepancy double-addition loops
  const processedPlayers = rawPlayers.map((p: any) => {
    const sStats = p.seasonStats || {};
    return {
      ...p,
      baseGoals: p.baseGoals !== undefined ? p.baseGoals : (sStats.goals || 0),
      baseAssists: p.baseAssists !== undefined ? p.baseAssists : (sStats.assists || 0),
      baseMatches: p.baseMatches !== undefined ? p.baseMatches : (sStats.matches || 0),
      baseCleanSheets: p.baseCleanSheets !== undefined ? p.baseCleanSheets : (sStats.cleanSheets || 0),
      baseYellowCards: p.baseYellowCards !== undefined ? p.baseYellowCards : (sStats.yellowCards || 0),
      baseRedCards: p.baseRedCards !== undefined ? p.baseRedCards : (sStats.redCards || 0),
      seasonStats: {
        matches: parseInt(sStats.matches) || 0,
        goals: parseInt(sStats.goals) || 0,
        assists: parseInt(sStats.assists) || 0,
        cleanSheets: parseInt(sStats.cleanSheets) || 0,
        yellowCards: parseInt(sStats.yellowCards) || 0,
        redCards: parseInt(sStats.redCards) || 0,
        minutes: parseInt(sStats.minutes) || 0,
        mvps: parseInt(sStats.mvps) || 0,
        averageRating: parseFloat(sStats.averageRating || p.averageRating) || 7.0
      },
      leagueStats: p.leagueStats || sStats.leagueStats || { 
        matches: p.baseMatches || 0, 
        goals: p.baseGoals || 0, 
        assists: p.baseAssists || 0, 
        cleanSheets: p.baseCleanSheets || 0, 
        yellowCards: p.baseYellowCards || 0, 
        redCards: p.baseRedCards || 0,
        minutes: (p.baseMatches || 0) * 90,
        mvps: 0,
        averageRating: parseFloat(p.rating) || 7.2
      },
      cupStats: p.cupStats || sStats.cupStats || { 
        matches: 0, 
        goals: 0, 
        assists: 0, 
        cleanSheets: 0, 
        yellowCards: 0, 
        redCards: 0,
        minutes: 0,
        mvps: 0,
        averageRating: 0
      },
      ratingsHistory: p.ratingsHistory || [],
      averageRating: parseFloat(p.averageRating) || 7.0
    };
  });

  // Helper keyword to determine league dynamically for players
  const getTeamLeague = (teamId: string, teamName?: string): string => {
    const resolvedLeague = resolveTeamLeague(processedTeams, teamId, teamName);
    if (resolvedLeague) {
      return resolvedLeague;
    }
    const id = (teamId || "").toLowerCase();
    const name = (teamName || "").toLowerCase();
    if (id.startsWith("futsal-") || id.includes("futsal") || id.includes("sungun") || id.includes("giti") || name.includes("فوتسال") || name.includes("سونگون") || name.includes("گیتی")) {
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

  // 4. Standings are parsed from persistedStandings, or fall back to calculating them
  const leagues = ["pro-league", "league-1", "league-2", "league-2-group-a", "league-2-group-b", "futsal"];
  const processedStandings: Record<string, any[]> = {};

  leagues.forEach((l) => {
    if (persistedStandings && persistedStandings[l] && persistedStandings[l].length > 0) {
      processedStandings[l] = persistedStandings[l];
    } else {
      const leagueTeams = processedTeams.filter((t: any) => {
        const teamAssignedLeague = getTeamLeague(t.id, t.name);
        if (teamAssignedLeague === "league-2") {
          return l === "league-2-group-a";
        }
        return teamAssignedLeague === l;
      });
      const sorted = [...leagueTeams].sort((a: any, b: any) => {
        const gdA = a.stats.goalsFor - a.stats.goalsAgainst;
        const gdB = b.stats.goalsFor - b.stats.goalsAgainst;
        if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
        if (gdB !== gdA) return gdB - gdA;
        return b.stats.goalsFor - a.stats.goalsFor;
      });

      processedStandings[l] = sorted.map((t: any, idx: number) => ({
        rank: idx + 1,
        team: t.name,
        played: t.stats.played,
        won: t.stats.won,
        drawn: t.stats.drawn,
        lost: t.stats.lost,
        goalsFor: t.stats.goalsFor,
        goalsAgainst: t.stats.goalsAgainst,
        goalDifference: t.stats.goalsFor - t.stats.goalsAgainst,
        points: t.stats.points
      }));
    }
  });

  // 5. Individual Stats tables
  const processedStats: Record<string, any> = {};
  const statsLeagues = ["pro-league", "league-1", "league-2", "hazfi-cup", "futsal"];

  statsLeagues.forEach((leagueKey) => {
    let statsObj: any;

    // Dynamic calculation from cleanly mapped player seasonStats
    let eligiblePlayers: any[];

    if (leagueKey === "hazfi-cup") {
      eligiblePlayers = processedPlayers.filter((p: any) => {
        const cStats = p.cupStats || {};
        return (cStats.goals > 0 || cStats.assists > 0 || cStats.cleanSheets > 0 || cStats.averageRating > 0);
      });
    } else {
      eligiblePlayers = processedPlayers.filter((p: any) => getTeamLeague(p.teamId, p.teamName) === leagueKey);
    }
    
    const scorers = [...eligiblePlayers]
      .map((p: any) => {
        const goals = leagueKey === "hazfi-cup" ? (p.cupStats?.goals || 0) : (p.leagueStats?.goals || 0);
        return { p, goals };
      })
      .filter((item: any) => item.goals > 0)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10)
      .map((item: any, idx) => ({
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
      .sort((a, b) => b.assists - a.assists)
      .slice(0, 10)
      .map((item: any, idx) => ({
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
      .sort((a, b) => b.cleanSheets - a.cleanSheets)
      .slice(0, 10)
      .map((item: any, idx) => ({
        rank: idx + 1,
        name: item.p.name,
        team: item.p.teamName,
        cleanSheets: item.cleanSheets
      }));

    const ratings = [...eligiblePlayers]
      .map((p: any) => {
        const rating = leagueKey === "hazfi-cup" 
          ? (p.cupStats?.averageRating || p.averageRating || 0) 
          : (p.leagueStats?.averageRating || p.averageRating || 0);
        return { p, rating };
      })
      .filter((item: any) => item.rating > 0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10)
      .map((item: any, idx) => ({
        rank: idx + 1,
        name: item.p.name,
        team: item.p.teamName,
        rating: item.rating
      }));

    if (scorers.length > 0 || assists.length > 0 || cleansheets.length > 0) {
      statsObj = { scorers, assists, cleansheets, ratings };
    } else if (persistedStats && persistedStats[leagueKey]) {
      // Deep clone to safely manipulate it without changing the reference
      statsObj = JSON.parse(JSON.stringify(persistedStats[leagueKey]));
    } else {
      statsObj = { scorers: [], assists: [], cleansheets: [], ratings: [] };
    }

    // Now, absolutely guarantee everything is sorted and correctly ranked!
    if (statsObj) {
      if (statsObj.scorers && Array.isArray(statsObj.scorers)) {
        statsObj.scorers = [...statsObj.scorers]
          .sort((a: any, b: any) => (Number(b.goals) || 0) - (Number(a.goals) || 0))
          .map((item: any, idx: number) => ({
            ...item,
            rank: idx + 1
          }));
      }
      if (statsObj.assists && Array.isArray(statsObj.assists)) {
        statsObj.assists = [...statsObj.assists]
          .sort((a: any, b: any) => (Number(b.assists) || 0) - (Number(a.assists) || 0))
          .map((item: any, idx: number) => ({
            ...item,
            rank: idx + 1
          }));
      }
      if (statsObj.cleansheets && Array.isArray(statsObj.cleansheets)) {
        statsObj.cleansheets = [...statsObj.cleansheets]
          .sort((a: any, b: any) => {
            const valA = a.cleanSheets !== undefined ? a.cleanSheets : (a.cleansheets !== undefined ? a.cleansheets : (a.clean_sheets || 0));
            const valB = b.cleanSheets !== undefined ? b.cleanSheets : (b.cleansheets !== undefined ? b.cleansheets : (b.clean_sheets || 0));
            return (Number(valB) || 0) - (Number(valA) || 0);
          })
          .map((item: any, idx: number) => ({
            ...item,
            rank: idx + 1
          }));
      }
      if (statsObj.ratings && Array.isArray(statsObj.ratings)) {
        statsObj.ratings = [...statsObj.ratings]
          .sort((a: any, b: any) => {
            const valA = a.rating !== undefined ? a.rating : (a.averageRating || 0);
            const valB = b.rating !== undefined ? b.rating : (b.averageRating || 0);
            return (Number(valB) || 0) - (Number(valA) || 0);
          })
          .map((item: any, idx: number) => ({
            ...item,
            rank: idx + 1
          }));
      }
    }

    processedStats[leagueKey] = statsObj;
  });

  return {
    processedMatches,
    processedTeams,
    processedPlayers,
    processedStats,
    processedStandings
  };
}

/**
 * Parsers a Gregorian date string (YYYY-MM-DD or similar) and evaluates its relative relationship
 * to the current system clock on-the-fly in Persian terms.
 */
export function getRelativeDateLabel(dateStr: string): string {
  if (!dateStr) return "نامعلوم";
  try {
    const parts = dateStr.trim().split("-");
    if (parts.length !== 3) return dateStr;
    const yr = parseInt(parts[0], 10);
    const mo = parseInt(parts[1], 10) - 1;
    const dy = parseInt(parts[2], 10);

    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    const targetObj = new Date(yr, mo, dy);
    targetObj.setHours(0, 0, 0, 0);

    const diffTime = targetObj.getTime() - todayObj.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "امروز";
    if (diffDays === 1) return "فردا";
    if (diffDays === 2) return "۲ روز بعد";
    if (diffDays === -1) return "دیروز";
    if (diffDays === -2) return "۲ روز قبل";
    
    if (diffDays > 2 && diffDays <= 7) return `${toPersianDigits(diffDays)} روز بعد`;
    if (diffDays < -2 && diffDays >= -7) return `${toPersianDigits(Math.abs(diffDays))} روز قبل`;
    if (diffDays > 7) return "پیش‌رو";
    return "بایگانی گذشته";
  } catch (err) {
    return dateStr;
  }
}

/**
 * Converts a standard English number (or string representation) to Persian digits.
 */
export function toPersianDigits(num: number | string): string {
  const numStr = String(num);
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return numStr.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

/**
 * Returns a Persian relative time label (e.g. "۳۴ دقیقه پیش", "۲ روز پیش") for an ISO timestamp.
 */
export function getTimeAgoPersian(iso?: string | null): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return "";
  const diff = Date.now() - ts;
  if (diff < 60 * 1000) return "لحظاتی پیش";
  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 60) return `${toPersianDigits(mins)} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${toPersianDigits(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "دیروز";
  if (days < 30) return `${toPersianDigits(days)} روز پیش`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${toPersianDigits(months)} ماه پیش`;
  return `${toPersianDigits(Math.floor(months / 12))} سال پیش`;
}

/**
 * Converts a Gregorian date string (YYYY-MM-DD) into Jalali / Shamsi format.
 * E.g., "2026-06-06" -> "۱۶ خرداد ۱۴۰۵"
 */
export function convertGregorianToShamsi(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const gy = parseInt(parts[0], 10);
    const gm = parseInt(parts[1], 10) - 1;
    const gd = parseInt(parts[2], 10);

    const dateObj = new Date(gy, gm, gd);
    // Use native JavaScript Intl with Jalali (persian) calendar for 100% accurate conversion
    const shamsiStr = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(dateObj);
    return shamsiStr;
  } catch (err) {
    return dateStr;
  }
}

/**
 * Converts a Jalali / Shamsi date string (YYYY/MM/DD or YYYY-MM-DD) into standard Gregorian YYYY-MM-DD.
 */
export function convertShamsiToGregorian(shamsiStr: string): string {
  if (!shamsiStr) return "";
  try {
    const clean = toEnglishDigits(shamsiStr).trim();
    // Support split by slash or dash
    const parts = clean.split(/[\/\-]/);
    if (parts.length !== 3) return shamsiStr;
    const jy = parseInt(parts[0], 10);
    const jm = parseInt(parts[1], 10);
    const jd = parseInt(parts[2], 10);

    const jy_epoch = jy - 979;
    let j_days = 365 * jy_epoch + Math.floor(jy_epoch / 33) * 8 + Math.floor(((jy_epoch % 33) + 3) / 4);
    
    for (let i = 0; i < jm - 1; ++i) {
      if (i < 6) j_days += 31;
      else j_days += 30;
    }
    j_days += jd - 1;

    const g_days = j_days + 79;
    let gy = 1600 + 400 * Math.floor(g_days / 146097);
    let rem = g_days % 146097;

    let leap = 1;
    if (rem >= 36525) {
      rem -= 1;
      gy += 100 * Math.floor(rem / 36524);
      rem = rem % 36524;
      if (rem >= 365) {
        rem += 1;
      } else {
        leap = 0;
      }
    }

    gy += 4 * Math.floor(rem / 1461);
    rem = rem % 1461;

    if (rem >= 366) {
      leap = 0;
      rem -= 1;
      gy += Math.floor(rem / 365);
      rem = rem % 365;
    }

    const g_m_d = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm = 1;
    let gd = rem + 1;
    for (let i = 0; i < 12; ++i) {
      if (gd <= g_m_d[i]) {
        gm = i + 1;
        break;
      }
      gd -= g_m_d[i];
    }
    
    const yyyy = gy;
    const mm = String(gm).padStart(2, "0");
    const dd = String(gd).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch (err) {
    return shamsiStr;
  }
}

export function convertGregorianToShamsiNumeric(dateStr: string): string {
  if (!dateStr) return "";
  try {
    let clean = dateStr;
    if (clean.includes("T")) {
      clean = clean.split("T")[0];
    }
    const parts = clean.split("-");
    if (parts.length !== 3) return dateStr;
    const gy = parseInt(parts[0], 10);
    const gm = parseInt(parts[1], 10) - 1;
    const gd = parseInt(parts[2], 10);

    const dateObj = new Date(gy, gm, gd);
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const formattedParts = formatter.formatToParts(dateObj);
    const year = formattedParts.find(p => p.type === 'year')?.value || '1405';
    let month = formattedParts.find(p => p.type === 'month')?.value || '03';
    let day = formattedParts.find(p => p.type === 'day')?.value || '17';
    
    if (month.length === 1) month = '0' + month;
    if (day.length === 1) day = '0' + day;
    
    return `${year}/${month}/${day}`;
  } catch (err) {
    return "1405/03/17";
  }
}

export function getTodayShamsi(): string {
  try {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === 'year')?.value || '1405';
    let month = parts.find(p => p.type === 'month')?.value || '03';
    let day = parts.find(p => p.type === 'day')?.value || '17';
    
    if (month.length === 1) month = '0' + month;
    if (day.length === 1) day = '0' + day;
    
    return `${year}/${month}/${day}`;
  } catch (err) {
    return "1405/03/17";
  }
}

