import React, { useState, useEffect } from "react";
import {
  Award, Clock, Star, Trophy,
} from "lucide-react";
import { formatStatNumber, normalizePersianString } from "../utils";
import { resolveTeam } from "../shared/teamMatch";
import { realMinute, parseMatchMinute } from "../shared/matchMinute";
import { buildPlayerIdentityIndex, findMatchLineupPlacement, isSamePlayer } from "../shared/playerIdentity";
import { buildCareerCards } from "../shared/career";
import SeasonSwitcher, { defaultSeasonValue } from "./SeasonSwitcher";
import MovementTimeline from "./MovementTimeline";
import CareerSection from "./CareerSection";
import PlayerHero, { formatCompactEuro } from "./player/PlayerHero";
import { RatingsLineChart, MarketLineChart, PresenceStrip, GoalTimingBars } from "./player/PlayerCharts";
import {
  SectionCard, SeasonPerformance, CareerMini, SimilarPlayers, NextMatchCard,
  PlayerShareCard, ProfileInfoBox, NewsList, SplitTable, MatchLogList, MiniStat,
} from "./player/PlayerWidgets";

interface PlayerDetailProps {
  player: any;
  allMatches?: any[];
  allTeams?: any[];
  allPlayers?: any[];
  news?: any[];
  onBack: () => void;
  onSelectTeam?: (name: string) => void;
  onSelectMatch?: (id: string) => void;
  onSelectNews?: (id: string) => void;
}

type TabKey = "summary" | "performance" | "details" | "market" | "career" | "ratings" | "compare" | "news";

const TABS: { key: TabKey; label: string }[] = [
  { key: "summary", label: "خلاصه" },
  { key: "performance", label: "عملکرد" },
  { key: "details", label: "آمار و جزئیات" },
  { key: "market", label: "ارزش بازیکن" },
  { key: "career", label: "مسیر حرفه‌ای" },
  { key: "ratings", label: "نمرات بازی‌ها" },
  { key: "compare", label: "مقایسه" },
  { key: "news", label: "اخبار" },
];

export default function PlayerDetail({
  player,
  allMatches = [],
  allTeams = [],
  allPlayers = [],
  news = [],
  onBack,
  onSelectTeam,
  onSelectMatch,
  onSelectNews
}: PlayerDetailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [compareId, setCompareId] = useState<string | null>(null);
  const [selectedCompet, setSelectedCompet] = useState<"all" | "league" | "cup">("all");
  const [playerNews, setPlayerNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  // Phase 5: per-season view. "career" = all-time numbers (previous behavior,
  // byte-identical). A season id scopes every stat below to that season's
  // rows (embedded by /api/detail/player/:id), split by club when needed.
  const [seasonId, setSeasonId] = useState<string>(() => defaultSeasonValue(player?.seasons, true));

  useEffect(() => {
    if (player) {
      const isFutsal = player.id?.startsWith("futsal-") || player.teamId?.startsWith("futsal-") || player.teamId?.includes("futsal") || (player.teamName || "").includes("فوتسال");
      setSelectedCompet(isFutsal ? "league" : "all");
      setSeasonId(defaultSeasonValue(player.seasons, true));

      // Fetch related news from server
      setLoadingNews(true);
      fetch(`/api/related-news/player/${player.id}?limit=10`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setPlayerNews(data.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingNews(false));
    }
  }, [player?.id]);

  if (!player) return null;

  // Same futsal signals as TeamDetail (explicit fields + futsal id prefix).
  const isFutsalPlayer = (player as any).sport === "futsal" ||
                         (player as any).league === "futsal" ||
                         player.id?.startsWith("futsal-") ||
                         player.teamId?.startsWith("futsal-") ||
                         player.teamId?.includes("futsal") ||
                         (player.teamName || "").includes("فوتسال");

  const identityIndex = buildPlayerIdentityIndex(allPlayers && allPlayers.length > 0 ? allPlayers : [player]);

  const getPlayerMinutesAndPlayed = (m: any, p: any) => {
    const isFutsal = m.sport === "futsal" || m.league === "futsal";
    const fullDuration = isFutsal ? 40 : 90;

    const sameInMatch = (ref: { id?: any; name?: any }, side: "home" | "away" | null) =>
      isSamePlayer({ ...ref, side }, p, m, identityIndex, []);

    const lineups = m.lineups || { home: [], away: [] };
    const homeLineup = lineups.home || [];
    const awayLineup = lineups.away || [];

    const inHome = homeLineup.find((x: any) => sameInMatch({ id: x.id, name: x.name }, "home"));
    const inAway = awayLineup.find((x: any) => sameInMatch({ id: x.id, name: x.name }, "away"));
    const lp = inHome || inAway;

    const events = m.events || [];

    const subInEvent = events.find((ev: any) => ev && ev.type === "substitution" && sameInMatch({ id: ev.player2Id, name: ev.player2Name }, ev.team));
    const subOutEvent = events.find((ev: any) => ev && ev.type === "substitution" && sameInMatch({ id: ev.playerId, name: ev.playerName }, ev.team));
    const redCardEvent = events.find((ev: any) => ev && ev.type === "red-card" && sameInMatch({ id: ev.playerId, name: ev.playerName }, ev.team));

    const hasOtherEvent = events.some((ev: any) => ev && ev.type !== "substitution" && (sameInMatch({ id: ev.playerId, name: ev.playerName }, ev.team) || sameInMatch({ id: ev.player2Id, name: ev.player2Name }, ev.team)));
    const inScorersList = (m.scorersList || []).some((sc: any) => sc && (sameInMatch({ id: sc.scorerId, name: sc.scorerName || sc.name }, null) || sameInMatch({ id: sc.assistId, name: sc.assistName || sc.assist }, null)));

    const started = !!lp;
    const played = started || !!subInEvent || hasOtherEvent || inScorersList;

    if (!played) {
      return { played: false, minutes: 0 };
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

    return { played: true, minutes };
  };

  // DYNAMICALLY FILTER AND MATCH PLAYER PERFORMANCE FROM ALL GAMES IN THE BASE
  // To obtain an real fotmob-like match performance log!
  const playerMatches: any[] = [];

  allMatches.forEach(match => {
    if (match.status !== "finished") return;

    const { played: playedThisMatch, minutes: calculatedMins } = getPlayerMinutesAndPlayed(match, player);
    if (!playedThisMatch) return;

    const sameLog = (ref: { id?: any; name?: any }, side: "home" | "away" | null) =>
      isSamePlayer({ ...ref, side }, player, match, identityIndex, []);

    const placement = findMatchLineupPlacement(player, match, identityIndex, []);
    const lpHome = placement.role === "starter" && placement.side === "home" ? placement.entry : null;
    const lpAway = placement.role === "starter" && placement.side === "away" ? placement.entry : null;
    // A substitute rating counts only when the sub actually entered the pitch.
    const subEntry = placement.role === "substitute" && playedThisMatch ? placement.entry : null;
    const lpForStats = lpHome || lpAway || subEntry;

    let playerGoals = 0;
    let playerAssists = 0;
    let playerYellow = 0;
    let playerRed = 0;
    const playerRating = lpForStats?.rating ?? null;

    // Sum from events:
    const matchEvents = match.events || [];
    matchEvents.forEach((ev: any) => {
      if (!ev) return;
      if (sameLog({ id: ev.playerId, name: ev.playerName }, ev.team)) {
        if (ev.type === "goal" || ev.type === "penalty") playerGoals += 1;
        else if (ev.type === "yellow-card") playerYellow += 1;
        else if (ev.type === "red-card") playerRed += 1;
      }
      if (sameLog({ id: ev.player2Id, name: ev.player2Name }, ev.team)) {
        if (ev.type === "assist" || ev.type === "goal") playerAssists += 1;
      }
    });

    if (lpForStats) {
      playerGoals = Math.max(playerGoals, parseInt(lpForStats.goals) || 0);
      playerAssists = Math.max(playerAssists, parseInt(lpForStats.assists) || 0);
    }

    let inHome = placement.side === "home" ? lpForStats : null;
    let inAway = placement.side === "away" ? lpForStats : null;

    if (!inHome && !inAway) {
      const isHomeTeam = player.teamName && match.teamHome &&
        normalizePersianString(player.teamName) === normalizePersianString(match.teamHome);
      const isAwayTeam = player.teamName && match.teamAway &&
        normalizePersianString(player.teamName) === normalizePersianString(match.teamAway);

      let assumedTeam: "home" | "away" | null = null;
      if (isHomeTeam) assumedTeam = "home";
      else if (isAwayTeam) assumedTeam = "away";
      else {
        const matchingEv = matchEvents.find((ev: any) => ev && ev.team && sameLog({ id: ev.playerId, name: ev.playerName }, ev.team));
        if (matchingEv) {
          assumedTeam = matchingEv.team;
        }
      }

      if (assumedTeam === "home") {
        inHome = {
          id: player.id,
          name: player.name,
          goals: playerGoals,
          assists: playerAssists,
          rating: playerRating,
          minutesPlayed: calculatedMins
        };
      } else if (assumedTeam === "away") {
        inAway = {
          id: player.id,
          name: player.name,
          goals: playerGoals,
          assists: playerAssists,
          rating: playerRating,
          minutesPlayed: calculatedMins
        };
      }
    }

    if (inHome || inAway) {
      let playerYellow = 0;
      let playerRed = 0;
      let playerAssistsEvents = 0;
      let playerOwnGoals = 0;
      let playerPenalties = 0;
      let playerSubIn = false;
      let playerSubOut = false;
      const matchEvents = match.events || [];
      matchEvents.forEach((ev: any) => {
        if (!ev) return;
        const isPlayer1 = sameLog({ id: ev.playerId, name: ev.playerName }, ev.team);
        const isPlayer2 = sameLog({ id: ev.player2Id, name: ev.player2Name }, ev.team);

        if (isPlayer1) {
          if (ev.type === "yellow-card") playerYellow += 1;
          if (ev.type === "red-card") playerRed += 1;
          if (ev.type === "assist") playerAssistsEvents += 1;
          if (ev.type === "own-goal") playerOwnGoals += 1;
          if (ev.type === "penalty") playerPenalties += 1;
          if (ev.type === "substitution") playerSubOut = true;
        }
        if (isPlayer2) {
          if (ev.type === "goal") playerAssistsEvents += 1;
          if (ev.type === "substitution") playerSubIn = true;
        }
      });

      const homeGoals = Number(match.scoreHome) || 0;
      const awayGoals = Number(match.scoreAway) || 0;
      const computeResult = (isTeamHome: boolean): "W" | "D" | "L" => {
        if (homeGoals === awayGoals) return "D";
        return isTeamHome
          ? (homeGoals > awayGoals ? "W" : "L")
          : (awayGoals > homeGoals ? "W" : "L");
      };

      if (inHome) {
        playerMatches.push({
          matchId: match.id,
          date: match.date,
          time: match.time,
          opponent: match.teamAway,
          opponentLogo: match.teamAwayLogo || "🔵",
          teamName: match.teamHome,
          teamLogo: match.teamHomeLogo || "🔴",
          goals: playerGoals,
          assists: Math.max(playerAssists, playerAssistsEvents),
          yellowCards: playerYellow,
          redCards: playerRed,
          ownGoals: playerOwnGoals,
          penalties: playerPenalties,
          subbedIn: playerSubIn,
          subbedOut: playerSubOut,
          result: computeResult(true),
          rating: inHome.rating ?? null,
          minutesPlayed: calculatedMins || inHome.minutesPlayed || 90,
          seasonId: match.seasonId || null,
          season: match.season || null,
          isMvp: isSamePlayer({ id: match.mvpId }, player, match, identityIndex, []),
          scoreHome: match.scoreHome,
          scoreAway: match.scoreAway,
          isHome: true
        });
      } else if (inAway) {
        playerMatches.push({
          matchId: match.id,
          date: match.date,
          time: match.time,
          opponent: match.teamHome,
          opponentLogo: match.teamHomeLogo || "🔴",
          teamName: match.teamAway,
          teamLogo: match.teamAwayLogo || "🔵",
          goals: playerGoals,
          assists: Math.max(playerAssists, playerAssistsEvents),
          yellowCards: playerYellow,
          redCards: playerRed,
          ownGoals: playerOwnGoals,
          penalties: playerPenalties,
          subbedIn: playerSubIn,
          subbedOut: playerSubOut,
          result: computeResult(false),
          rating: inAway.rating ?? null,
          minutesPlayed: calculatedMins || inAway.minutesPlayed || 90,
          seasonId: match.seasonId || null,
          season: match.season || null,
          isMvp: isSamePlayer({ id: match.mvpId }, player, match, identityIndex, []),
          scoreHome: match.scoreHome,
          scoreAway: match.scoreAway,
          isHome: false
        });
      }
    }
  });

  // Sort matched entries newest first using robust dateTime calculation
  playerMatches.sort((a, b) => {
    const parseDateTimeRobust = (item: any) => {
      if (!item || !item.date) return 0;
      const cleanDate = String(item.date).trim();
      if (cleanDate.includes("T")) {
        const t = new Date(cleanDate).getTime();
        if (!isNaN(t)) return t;
      }
      const dateParts = cleanDate.split("-");
      if (dateParts.length === 3) {
        let yr = parseInt(dateParts[0], 10);
        if (yr < 1600 && yr > 1000) {
          yr += 621; // Convert Shamsi year to Gregorian-equivalent AD year for sorting
        }
        const mo = parseInt(dateParts[1], 10) - 1;
        const dy = parseInt(dateParts[2], 10);

        const timeParts = (item.time || "00:00").trim().split(":");
        const hr = parseInt(timeParts[0], 10) || 0;
        const mn = parseInt(timeParts[1], 10) || 0;

        return new Date(yr, mo, dy, hr, mn, 0, 0).getTime();
      }
      const fallback = new Date(cleanDate).getTime();
      return isNaN(fallback) ? 0 : fallback;
    };
    const tA = parseDateTimeRobust(a);
    const tB = parseDateTimeRobust(b);
    if (tA !== tB) return tB - tA;
    return (b.matchId || "").localeCompare(a.matchId || "");
  });

  // Calculate dynamic average rating
  const isCareerView = seasonId === "career";
  const seasonRows = !isCareerView ? ((player.seasonRows || []).filter((r: any) => String(r.seasonId) === String(seasonId))) : [];
  const scopedHistory = isCareerView ? (player.ratingsHistory || []) : ((player.ratingsHistory || []).filter((h: any) => String(h.seasonId) === String(seasonId)));
  const sumRows = (key: string) => seasonRows.reduce((a: number, r: any) => a + (Number(r[key]) || 0), 0);
  const sumSplit = (split: "leagueStats" | "cupStats", key: string) => seasonRows.reduce((a: number, r: any) => a + (Number(r[split]?.[key]) || 0), 0);
  const splitRating = (split: "leagueStats" | "cupStats"): number | null => {
    const s = seasonRows.reduce((a: number, r: any) => a + (Number(r[split]?.ratingSum) || 0), 0);
    const c = seasonRows.reduce((a: number, r: any) => a + (Number(r[split]?.ratingCount) || 0), 0);
    return c > 0 ? parseFloat((s / c).toFixed(1)) : null;
  };
  const seasonAvgRating = (() => {
    const s = seasonRows.reduce((a: number, r: any) => a + (Number(r.ratings?.sum) || 0), 0);
    const c = seasonRows.reduce((a: number, r: any) => a + (Number(r.ratings?.count) || 0), 0);
    return c > 0 ? parseFloat((s / c).toFixed(1)) : null;
  })();
  const seasonMvps = (cupOnly: boolean | null): number => {
    if (cupOnly === null) return sumSplit("leagueStats", "mvps") + sumSplit("cupStats", "mvps");
    const fromRows = cupOnly ? sumSplit("cupStats", "mvps") : sumSplit("leagueStats", "mvps");
    if (fromRows > 0) return fromRows;
    return scopedHistory.filter((h: any) => (cupOnly ? h.isCup : !h.isCup) && h.isMvp).length;
  };

  const leagueMatches = isCareerView ? (player.leagueStats?.matches || 0) : sumSplit("leagueStats", "matches");
  const leagueGoals = isCareerView ? (player.leagueStats?.goals || 0) : sumSplit("leagueStats", "goals");
  const leagueAssists = isCareerView ? (player.leagueStats?.assists || 0) : sumSplit("leagueStats", "assists");
  const leagueClean = isCareerView ? (player.leagueStats?.cleanSheets || 0) : sumSplit("leagueStats", "cleanSheets");
  const leagueYellow = isCareerView ? (player.leagueStats?.yellowCards || 0) : sumSplit("leagueStats", "yellowCards");
  const leagueRed = isCareerView ? (player.leagueStats?.redCards || 0) : sumSplit("leagueStats", "redCards");
  const leagueMinutesRaw = isCareerView ? player.leagueStats?.minutes : sumSplit("leagueStats", "minutes");
  const leagueMinutes = leagueMinutesRaw || (leagueMatches * 90);
  const leagueMvps = isCareerView ? (player.leagueStats?.mvps || player.ratingsHistory?.filter((h: any) => !h.isCup && h.isMvp).length || 0) : seasonMvps(false);
  const leagueAvgRating = isCareerView ? (player.leagueStats?.averageRating ?? null) : splitRating("leagueStats");

  const cupMatches = isCareerView ? (player.cupStats?.matches || 0) : sumSplit("cupStats", "matches");
  const cupGoals = isCareerView ? (player.cupStats?.goals || 0) : sumSplit("cupStats", "goals");
  const cupAssists = isCareerView ? (player.cupStats?.assists || 0) : sumSplit("cupStats", "assists");
  const cupClean = isCareerView ? (player.cupStats?.cleanSheets || 0) : sumSplit("cupStats", "cleanSheets");
  const cupYellow = isCareerView ? (player.cupStats?.yellowCards || 0) : sumSplit("cupStats", "yellowCards");
  const cupRed = isCareerView ? (player.cupStats?.redCards || 0) : sumSplit("cupStats", "redCards");
  const cupMinutesRaw = isCareerView ? player.cupStats?.minutes : sumSplit("cupStats", "minutes");
  const cupMinutes = cupMinutesRaw || (cupMatches * 90);
  const cupMvps = isCareerView ? (player.cupStats?.mvps || player.ratingsHistory?.filter((h: any) => h.isCup && h.isMvp).length || 0) : seasonMvps(true);
  const cupAvgRating = isCareerView ? (player.cupStats?.averageRating ?? null) : splitRating("cupStats");

  const displayedMatches = isCareerView ? (player.seasonStats?.matches || 0) : sumRows("matches");
  const displayedGoals = isCareerView ? (player.seasonStats?.goals || 0) : sumRows("goals");
  const displayedAssists = isCareerView ? (player.seasonStats?.assists || 0) : sumRows("assists");
  const displayedClean = isCareerView ? (player.seasonStats?.cleanSheets || 0) : sumRows("cleanSheets");
  const displayedYellow = isCareerView ? (player.seasonStats?.yellowCards || 0) : sumRows("yellowCards");
  const displayedRed = isCareerView ? (player.seasonStats?.redCards || 0) : sumRows("redCards");
  const displayedMinutesRaw = isCareerView ? (player.seasonStats?.minutes || playerMatches.reduce((acc, m) => acc + m.minutesPlayed, 0)) : sumRows("minutes");
  const displayedMinutes = displayedMinutesRaw || (displayedMatches * 90);
  const displayedMvps = isCareerView ? (player.seasonStats?.mvps || player.ratingsHistory?.filter((h: any) => h.isMvp).length || playerMatches.filter(m => m.isMvp).length || 0) : (seasonMvps(null) || scopedHistory.filter((h: any) => h.isMvp).length || playerMatches.filter(m => m.isMvp).length || 0);
  const displayedAvgRating = isCareerView ? (player.seasonStats?.averageRating ?? player.averageRating ?? null) : seasonAvgRating;
  // Matches-tab scope: same season filter as the stats above.
  const seasonTagForMatches = (player.seasons || []).find((s: any) => String(s.id) === String(seasonId))?.name;
  const visiblePlayerMatches = isCareerView ? playerMatches : playerMatches.filter((m: any) =>
    String(m.seasonId) === String(seasonId) ||
    (seasonTagForMatches != null && (String(m.season) === String(seasonTagForMatches) || String(m.seasonId) === `season-${seasonTagForMatches}`)));

  // Active calculation variables depending on selectedCompet toggle
  const activeAvgRating = selectedCompet === "all" ? displayedAvgRating : (selectedCompet === "league" ? leagueAvgRating : cupAvgRating);
  const activeMvps = selectedCompet === "all" ? displayedMvps : (selectedCompet === "league" ? leagueMvps : cupMvps);
  const activeMinutes = selectedCompet === "all" ? displayedMinutes : (selectedCompet === "league" ? leagueMinutes : cupMinutes);
  const activeGoals = selectedCompet === "all" ? displayedGoals : (selectedCompet === "league" ? leagueGoals : cupGoals);
  const activeAssists = selectedCompet === "all" ? displayedAssists : (selectedCompet === "league" ? leagueAssists : cupAssists);
  const activeClean = selectedCompet === "all" ? displayedClean : (selectedCompet === "league" ? leagueClean : cupClean);
  const activeYellow = selectedCompet === "all" ? displayedYellow : (selectedCompet === "league" ? leagueYellow : cupYellow);
  const activeRed = selectedCompet === "all" ? displayedRed : (selectedCompet === "league" ? leagueRed : cupRed);

  // Find club reference to open team detail
  const myClubRef = resolveTeam(allTeams, player.teamId || player.teamName);
  const teamLogo: string | null = ((myClubRef as any)?.logo || null);

  // ---------- NEW: derived showcase values (reference design) ----------
  const isGk = typeof player.position === "string" && player.position.includes("دروازه");

  // Rated history newest-first (server sorts it). All chart/form logic reads this.
  const ratedHistory: any[] = (player.ratingsHistory || []).filter((h: any) => Number(h.rating) > 0);
  const scopedRated = isCareerView ? ratedHistory : ratedHistory.filter((h: any) => String(h.seasonId) === String(seasonId));
  const last10 = scopedRated.slice(0, 10);
  const last5 = scopedRated.slice(0, 5);
  const formScore: number | null = last5.length > 0
    ? Math.round((last5.reduce((a: number, h: any) => a + Number(h.rating), 0) / last5.length) * 10)
    : null;
  // TF rating: server-computed cumulative score (seasonStats.tfRating),
  // default 70, range [60, 99]. Manual base_rating (admin, 0-10 scale) wins
  // when set. Form and rank always derive from computed data (never stored).
  const storedTf: number | null = player.seasonStats?.tfRating != null
    ? Number(player.seasonStats.tfRating)
    : null;
  const hasBase = player.baseRating != null && player.baseRating !== "";
  const tfRating: number | null = hasBase
    ? +((Number(player.baseRating) * 10).toFixed(1))
    : (storedTf ?? 70);
  const ratingBase: number | null = hasBase && selectedCompet === "all"
    ? Number(player.baseRating)
    : (activeAvgRating != null ? Number(activeAvgRating) : null);
  const spark: number[] = scopedRated.slice(0, 12).reverse().map((h: any) => Number(h.rating));

  // Team logo lookup for opponents / career clubs (real match + team tables).
  const logoForTeam = (teamName?: string | null): string | null => {
    if (!teamName) return null;
    const tnorm = normalizePersianString(teamName);
    const m = (allMatches || []).find((x: any) => normalizePersianString(x.teamHome) === tnorm || normalizePersianString(x.teamAway) === tnorm);
    if (m) {
      if (normalizePersianString(m.teamHome) === tnorm && m.teamHomeLogo && !String(m.teamHomeLogo).startsWith("🔵") && !String(m.teamHomeLogo).startsWith("🔴")) return m.teamHomeLogo;
      if (normalizePersianString(m.teamAway) === tnorm && m.teamAwayLogo && !String(m.teamAwayLogo).startsWith("🔵") && !String(m.teamAwayLogo).startsWith("🔴")) return m.teamAwayLogo;
    }
    const t = resolveTeam(allTeams, teamName);
    return ((t as any)?.logo || null);
  };

  // Position peers (same normalized position, rated) -> rank + similar players.
  const normPos = normalizePersianString(player.position || "");
  const myAvgNum = Number(player.seasonStats?.averageRating ?? player.averageRating ?? 0);
  const peers = (allPlayers || [])
    .filter((p: any) => p && String(p.id) !== String(player.id) && normalizePersianString(p.position || "") === normPos && Number(p.seasonStats?.averageRating ?? p.averageRating ?? 0) > 0)
    .sort((a: any, b: any) => Number(b.seasonStats?.averageRating ?? b.averageRating ?? 0) - Number(a.seasonStats?.averageRating ?? a.averageRating ?? 0));
  const rank: number | null = myAvgNum > 0 && normPos
    ? peers.filter((p: any) => Number(p.seasonStats?.averageRating ?? p.averageRating ?? 0) > myAvgNum).length + 1
    : null;
  // Similarity: same-position gate (peers above) + rating gap + age gap.
  // score = 100 - (ratingGap * 10 + ageGapYears * 1.5), floored at 60.
  const myAgeNum: number | null = Number(player.age) > 0 ? Number(player.age) : null;
  const similarFull = myAvgNum > 0
    ? peers
        .map((p: any) => {
          const avg = Number(p.seasonStats?.averageRating ?? p.averageRating ?? 0);
          const d = Math.abs(avg - myAvgNum);
          const pa = Number(p.age) > 0 ? Number(p.age) : null;
          const ageGap = myAgeNum != null && pa != null ? Math.abs(pa - myAgeNum) : 0;
          return { p, score: d * 10 + ageGap * 1.5 };
        })
        .sort((a: any, b: any) => a.score - b.score)
        .map(({ p, score }: any) => ({
          id: String(p.id),
          name: p.name,
          teamName: p.teamName,
          position: p.position || "",
          age: Number(p.age) > 0 ? Number(p.age) : null,
          avg: Number(p.seasonStats?.averageRating ?? p.averageRating ?? 0) || null,
          matches: Number(p.seasonStats?.matches ?? 0) || 0,
          goals: Number(p.seasonStats?.goals ?? 0) || 0,
          assists: Number(p.seasonStats?.assists ?? 0) || 0,
          image: p.image || null,
          similarity: Math.max(60, Math.round(100 - score)),
        }))
    : [];

  // Next match of the player's club (not-started fixtures).
  const myTeamNorm = normalizePersianString(player.teamName || "");
  const nextMatch = (() => {
    const tid = player.teamId ? String(player.teamId) : null;
    const cands = (allMatches || [])
      .filter((m: any) => m.status === "not-started" && (
        (tid && (String(m.teamHomeId) === tid || String(m.teamAwayId) === tid)) ||
        (myTeamNorm && (normalizePersianString(m.teamHome) === myTeamNorm || normalizePersianString(m.teamAway) === myTeamNorm))
      ))
      .sort((a: any, b: any) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.time || "").localeCompare(String(b.time || "")));
    if (cands.length > 0) return cands[0];
    return null;
  })();

  // Future-tracked fields (no backend yet — UI renders honest empty states).
  // Shape reserved: marketValue = { value, currency, changePct, history: [{season, value}] }
  const market: any = (player as any).marketValue ?? null;
  const marketHistory = Array.isArray(market?.history) && market.history.length > 0
    ? market.history.map((h: any) => ({
        x: String(h.season),
        y: Number(h.value) || 0,
        label: formatCompactEuro(Number(h.value) || 0, market.currency || "€"),
      }))
    : null;
  const marketLabel = market ? formatCompactEuro(Number(market.value) || 0, market.currency || "€") : "—";
  // Presence results respect the same season scope as the match log.
  const presenceResults = visiblePlayerMatches.map((m: any) => m.result as "W" | "D" | "L");

  // Chart points: oldest on the left, newest on the right.
  const last10Points = [...last10].reverse().map((h: any) => ({
    y: Number(h.rating),
    logo: logoForTeam(h.matchOpponent),
    name: h.matchOpponent,
  }));
  const last10Avg = last10.length > 0
    ? last10.reduce((a: number, h: any) => a + Number(h.rating), 0) / last10.length
    : null;

  // Career mini reads the SAME pipeline as the career tab (buildCareerCards
  // over seasonRows + movements), grouped by club — mini and tab can never
  // disagree.
  const careerView = buildCareerCards({
    kind: "player",
    seasonRows: player.seasonRows || [],
    movements: (player.movements || []).map((m: any) => ({
      id: String(m.id),
      fromTeamId: m.fromTeamId != null ? String(m.fromTeamId) : null,
      toTeamId: m.toTeamId != null ? String(m.toTeamId) : null,
      seasonId: m.seasonId != null ? String(m.seasonId) : null,
      movementDate: m.movementDate || null,
    })),
    seasons: player.seasons || [],
    currentClubId: player.teamId != null ? String(player.teamId) : null,
    currentClubName: player.teamName || null,
  });
  const careerMiniRows = (() => {
    const byClub = new Map<string, { club: string; seasons: string[]; apps: number }>();
    careerView.cards
      .filter((c) => !c.isEmpty && c.clubName)
      .forEach((c) => {
        const key = String(c.clubId || c.clubName);
        const e = byClub.get(key) || { club: String(c.clubName), seasons: [] as string[], apps: 0 };
        const sLabel = String(c.seasonName || c.seasonId || "");
        if (sLabel && !e.seasons.includes(sLabel)) e.seasons.push(sLabel);
        e.apps += Number(c.matches) || 0;
        byClub.set(key, e);
      });
    const rows = [...byClub.values()]
      .map((e) => {
        const sorted = [...e.seasons].sort((a, b) => b.localeCompare(a, "fa"));
        const season = sorted.length > 1 ? `${sorted[sorted.length - 1]} - ${sorted[0]}` : (sorted[0] || "—");
        return { club: e.club, season, apps: e.apps, logo: logoForTeam(e.club), latest: sorted[0] || "" };
      })
      .sort((a, b) => b.latest.localeCompare(a.latest, "fa"))
      .slice(0, 4)
      .map(({ club, season, apps, logo }) => ({ club, season, apps, logo }));
    return rows;
  })();

  const quick = {
    matches: displayedMatches,
    goals: displayedGoals,
    assists: displayedAssists,
    minutes: displayedMinutes,
    avg: ratingBase,
  };
  const perf = {
    matches: displayedMatches, minutes: displayedMinutes, goals: displayedGoals, assists: displayedAssists,
    yellow: displayedYellow, red: displayedRed, mvps: displayedMvps, avg: displayedAvgRating, clean: displayedClean, isGk,
  };
  const rankLabel = normPos && player.position ? `بین ${player.position}` : "بین هم‌پستان";

  // Home / away split (playerMatches already tags isHome).
  const splitSide = (arr: any[]) => {
    const rated = arr.map((m) => Number(m.rating) || 0).filter((r) => r > 0);
    return {
      matches: arr.length,
      goals: arr.reduce((a, m) => a + (Number(m.goals) || 0), 0),
      assists: arr.reduce((a, m) => a + (Number(m.assists) || 0), 0),
      minutes: arr.reduce((a, m) => a + (Number(m.minutesPlayed) || 0), 0),
      avg: rated.length > 0 ? rated.reduce((a, r) => a + r, 0) / rated.length : null,
    };
  };
  const homeSplit = splitSide(playerMatches.filter((m) => m.isHome));
  const awaySplit = splitSide(playerMatches.filter((m) => !m.isHome));

  // Goal-timing distribution from real match events (all competitions).
  const goalBuckets = [
    { label: "1-15", count: 0 },
    { label: "16-30", count: 0 },
    { label: "31-45", count: 0 },
    { label: "46-60", count: 0 },
    { label: "61-75", count: 0 },
    { label: "76-90+", count: 0 },
  ];
  allMatches.forEach((m: any) => {
    if (m.status !== "finished") return;
    const dur = m.sport === "futsal" || m.league === "futsal" ? 40 : 90;
    (m.events || []).forEach((ev: any) => {
      if (!ev || (ev.type !== "goal" && ev.type !== "penalty")) return;
      const mine = isSamePlayer({ id: ev.playerId, name: ev.playerName, side: ev.team }, player, m, identityIndex, []);
      if (!mine) return;
      let min: number;
      try {
        min = parseMatchMinute(ev.minute, dur).total || realMinute(ev.minute, dur) || 0;
      } catch {
        min = realMinute(ev.minute, dur) || 0;
      }
      if (min <= 0) return;
      const b = min <= 15 ? 0 : min <= 30 ? 1 : min <= 45 ? 2 : min <= 60 ? 3 : min <= 75 ? 4 : 5;
      goalBuckets[b].count += 1;
    });
  });
  const totalTimedGoals = goalBuckets.reduce((a, b) => a + b.count, 0);

  const competToggle = (
    <div className="flex gap-1 rounded-xl border border-white/5 bg-black/40 p-0.5 text-[10px] select-none">
      {!isFutsalPlayer && (
        <button
          type="button"
          onClick={() => setSelectedCompet("all")}
          className={`rounded-lg px-3 py-1.5 font-black transition ${selectedCompet === "all" ? "bg-emerald-500 text-black shadow" : "text-slate-400 hover:text-white"}`}
        >
          کل فصل جاری
        </button>
      )}
      <button
        type="button"
        onClick={() => setSelectedCompet("league")}
        className={`rounded-lg px-3 py-1.5 font-black transition ${selectedCompet === "league" ? "bg-emerald-500 text-black shadow" : "text-slate-400 hover:text-white"}`}
      >
        {isFutsalPlayer ? "لیگ برتر فوتسال" : "لیگ برتر"}
      </button>
      {!isFutsalPlayer && (
        <button
          type="button"
          onClick={() => setSelectedCompet("cup")}
          className={`rounded-lg px-3 py-1.5 font-black transition ${selectedCompet === "cup" ? "bg-emerald-500 text-black shadow" : "text-slate-400 hover:text-white"}`}
        >
          جام حذفی
        </button>
      )}
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 duration-300" dir="rtl">
      {/* ================= HERO ================= */}
      <PlayerHero
        player={player}
        teamLogo={teamLogo}
        onSelectTeam={onSelectTeam}
        onBack={onBack}
        seasonId={seasonId}
        seasons={player.seasons || []}
        onSeasonChange={setSeasonId}
        tfRating={tfRating}
        spark={spark}
        market={market ? { value: Number(market.value) || 0, currency: market.currency || "€", changePct: market.changePct ?? null } : null}
        formScore={formScore}
        rank={rank}
        rankLabel={rankLabel}
        quick={quick}
        avgLabel={selectedCompet === "all" ? "نمره میانگین" : selectedCompet === "league" ? "نمره میانگین لیگ" : "نمره میانگین حذفی"}
      />

      {/* ================= TAB BAR ================= */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#121215] shadow-xl">
        <div className="flex min-w-max items-center gap-1 p-1.5" role="tablist" aria-label="بخش‌های پروفایل">
          {TABS.map((t) => {
            const count = t.key === "ratings" ? visiblePlayerMatches.length : t.key === "news" ? playerNews.length : null;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(t.key)}
                className={`relative shrink-0 rounded-xl px-4 py-2.5 text-xs font-black transition ${
                  active ? "text-emerald-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {t.label}
                {count != null && count > 0 && (
                  <span className={`mr-1.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] ${active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-slate-400"}`}>
                    {formatStatNumber(count)}
                  </span>
                )}
                {active && <span className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-emerald-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= SUMMARY ================= */}
      {activeTab === "summary" && (
        <div className="grid animate-in fade-in grid-cols-1 gap-4 duration-200 lg:grid-cols-3">
          <SectionCard title="نتایج با حضور بازیکن">
            <PresenceStrip results={presenceResults} />
          </SectionCard>
          <SectionCard title="ارزش بازیکن در گذر زمان" action={<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">همه</span>}>
            <MarketLineChart points={marketHistory} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/5 p-2">
                <p className="text-[9px] text-slate-400">بالاترین ارزش</p>
                <p className="mt-0.5 font-mono text-sm font-black text-white" dir="ltr">{marketLabel}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <p className="text-[9px] text-slate-400">کمترین ارزش</p>
                <p className="mt-0.5 font-mono text-sm font-black text-white" dir="ltr">{marketHistory ? marketHistory[0].label : "—"}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <p className="text-[9px] text-slate-400">تغییر نسبت به فصل قبل</p>
                <p className="mt-0.5 font-mono text-sm font-black text-emerald-400" dir="ltr">
                  {market?.changePct != null ? `${market.changePct >= 0 ? "+" : ""}${formatStatNumber(Number(market.changePct).toFixed(0))}%` : "—"}
                </p>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="مسیر حرفه‌ای" action={careerMiniRows.length > 0 ? <button type="button" onClick={() => setActiveTab("career")} className="text-[10px] font-black text-emerald-400 hover:text-emerald-300">مشاهده مسیر کامل</button> : undefined}>
            <CareerMini rows={careerMiniRows} onViewAll={careerMiniRows.length > 0 ? () => setActiveTab("career") : undefined} />
          </SectionCard>

          <div className="lg:col-span-2">
            <SectionCard title="نمرات 10 بازی اخیر">
              <RatingsLineChart data={last10Points} />
              {last10Avg != null && (
                <p className="mx-auto mt-2 w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-300">
                  میانگین نمره: <span className="font-mono">{formatStatNumber(last10Avg.toFixed(2))}</span>
                </p>
              )}
            </SectionCard>
          </div>
          <SectionCard title="عملکرد در فصل جاری" action={<button type="button" onClick={() => setActiveTab("performance")} className="text-[10px] font-black text-emerald-400 hover:text-emerald-300">مشاهده آمار کامل</button>}>
            <SeasonPerformance stats={perf} onViewAll={() => setActiveTab("performance")} />
          </SectionCard>
          <SectionCard title="بازیکنان مشابه" action={similarFull.length > 0 ? <button type="button" onClick={() => setActiveTab("compare")} className="text-[10px] font-black text-emerald-400 hover:text-emerald-300">مشاهده بازیکنان بیشتر</button> : undefined}>
            <SimilarPlayers items={similarFull.slice(0, 3)} onViewAll={similarFull.length > 3 ? () => setActiveTab("compare") : undefined} />
          </SectionCard>

          <SectionCard title={player.name}>
            <PlayerShareCard player={player} tfRating={tfRating} marketLabel={marketLabel} quick={quick} />
          </SectionCard>
          <SectionCard title={`آخرین اخبار ${player.name}`} action={playerNews.length > 0 ? <button type="button" onClick={() => setActiveTab("news")} className="text-[10px] font-black text-emerald-400 hover:text-emerald-300">مشاهده همه اخبار</button> : undefined}>
            {loadingNews ? (
              <p className="py-6 text-center text-xs font-bold text-slate-400">در حال بارگذاری اخبار...</p>
            ) : (
              <NewsList items={playerNews.slice(0, 4)} playerName={player.name} onSelectNews={onSelectNews} onViewAll={playerNews.length > 4 ? () => setActiveTab("news") : undefined} />
            )}
          </SectionCard>
          <div className="space-y-4">
            <NextMatchCard match={nextMatch} onOpenMatch={onSelectMatch} />
            <SectionCard title="اطلاعات پروفایل">
              <ProfileInfoBox playerId={String(player.id)} updatedAt={(player as any).updatedAt || null} />
            </SectionCard>
          </div>
        </div>
      )}

      {/* ================= PERFORMANCE ================= */}
      {activeTab === "performance" && (
        <div className="grid animate-in fade-in grid-cols-1 gap-4 duration-200 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#131317] p-3.5 shadow-sm">
              <div>
                <h4 className="text-xs font-black text-white">فیلتر عملکرد بازیکن</h4>
                <p className="mt-0.5 text-[10px] text-slate-400">تفکیک نمرات، دقایق و کارت‌ها بر اساس تورنمنت</p>
              </div>
              {competToggle}
            </div>
            {!isCareerView && seasonRows.length > 1 && (
              <div className="space-y-2 rounded-2xl border border-white/5 bg-[#131317] p-3.5 shadow-sm">
                <h4 className="text-[11px] font-black text-slate-200">تفکیک باشگاهی این فصل</h4>
                {seasonRows.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5 text-[11px]">
                    <span className="truncate font-bold text-white">{r.teamName || "—"}</span>
                    <span className="shrink-0 font-mono text-slate-400">
                      {formatStatNumber(r.matches || 0)} بازی • {formatStatNumber(r.goals || 0)} گل • {formatStatNumber(r.assists || 0)} پاس
                    </span>
                  </div>
                ))}
              </div>
            )}
            <SectionCard title="عملکرد در فصل جاری">
              <SeasonPerformance stats={perf} />
            </SectionCard>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard title="خانگی / خارج از خانه">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] text-slate-400">
                        <th className="py-2 font-bold">زمین</th>
                        <th className="py-2 text-center font-bold">بازی</th>
                        <th className="py-2 text-center font-bold">گل</th>
                        <th className="py-2 text-center font-bold">پاس</th>
                        <th className="py-2 text-center font-bold">میانگین</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "در خانه", s: homeSplit },
                        { label: "بیرون از خانه", s: awaySplit },
                      ].map((r) => (
                        <tr key={r.label} className="border-b border-white/5 last:border-0">
                          <td className="py-2.5 font-bold text-slate-200">{r.label}</td>
                          <td className="py-2.5 text-center font-mono text-slate-300">{formatStatNumber(r.s.matches)}</td>
                          <td className="py-2.5 text-center font-mono font-bold text-emerald-400">{formatStatNumber(r.s.goals)}</td>
                          <td className="py-2.5 text-center font-mono font-bold text-sky-400">{formatStatNumber(r.s.assists)}</td>
                          <td className="py-2.5 text-center font-mono font-bold text-amber-400">{r.s.avg == null ? "—" : formatStatNumber(r.s.avg.toFixed(1))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
              {totalTimedGoals > 0 && (
                <SectionCard title="زمان‌بندی گل‌ها">
                  <GoalTimingBars buckets={goalBuckets} />
                </SectionCard>
              )}
            </div>
            <SectionCard title="نمرات 10 بازی اخیر">
              <RatingsLineChart data={last10Points} />
              {last10Avg != null && (
                <p className="mx-auto mt-2 w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-300">
                  میانگین نمره: <span className="font-mono">{formatStatNumber(last10Avg.toFixed(2))}</span>
                </p>
              )}
            </SectionCard>
          </div>
          <div className="grid content-start grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <MiniStat icon={<Award className="h-5 w-5" />} label="بهترین بازیکن زمین" value={formatStatNumber(activeMvps)} sub="افتخار بهترین عملکرد (MVP)" tone="red" />
            <MiniStat icon={<Clock className="h-5 w-5" />} label="دقایق بازی" value={formatStatNumber(activeMinutes)} sub="زمان حضور در میدان" tone="slate" />
            <MiniStat
              icon={<Star className="h-5 w-5" />}
              label="میانگین نمره"
              value={activeAvgRating != null && Number(activeAvgRating) > 0 ? formatStatNumber(Number(activeAvgRating).toFixed(1)) : "—"}
              sub={activeAvgRating != null && Number(activeAvgRating) > 0 ? "امتیاز عملکرد ثبت‌شده" : "هنوز نمره‌ای ثبت نشده"}
              tone="emerald"
            />
          </div>
        </div>
      )}

      {/* ================= DETAILS ================= */}
      {activeTab === "details" && (
        <div className="animate-in fade-in space-y-4 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#131317] p-3.5 shadow-sm">
            <div>
              <h4 className="text-xs font-black text-white">رکوردهای تفکیکی بازیکن در این فصل</h4>
              <p className="mt-0.5 text-[10px] text-slate-400">لیگ برتر، جام حذفی و جمع کارنامه</p>
            </div>
            {competToggle}
          </div>
          <SplitTable
            showClean={isGk}
            rows={[
              ...(isFutsalPlayer ? [] : [{ label: isFutsalPlayer ? "لیگ برتر فوتسال" : "مسابقات لیگ برتر", matches: leagueMatches, goals: leagueGoals, assists: leagueAssists, clean: leagueClean, active: selectedCompet === "league" }]),
              ...(isFutsalPlayer ? [{ label: "لیگ برتر فوتسال", matches: leagueMatches, goals: leagueGoals, assists: leagueAssists, clean: leagueClean, active: selectedCompet === "league" }] : []),
              ...(!isFutsalPlayer ? [{ label: "جام حذفی کشور", matches: cupMatches, goals: cupGoals, assists: cupAssists, clean: cupClean, active: selectedCompet === "cup" }] : []),
            ]}
            total={{ label: "جمع کل کارنامه", matches: displayedMatches, goals: displayedGoals, assists: displayedAssists, clean: displayedClean, active: selectedCompet === "all" && !isFutsalPlayer }}
          />
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold">
              <span className="text-[10px] text-slate-400">کارت زرد:</span>
              <span className="font-mono text-sm font-black text-amber-400">{formatStatNumber(activeYellow)}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold">
              <span className="text-[10px] text-slate-400">کارت قرمز:</span>
              <span className="font-mono text-sm font-black text-red-400">{formatStatNumber(activeRed)}</span>
            </div>
          </div>
          {player.statsByTeam && player.statsByTeam.length > 0 && (
            <SectionCard title="تفکیک عملکرد به تفکیک باشگاه‌ها در این فصل">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {player.statsByTeam.map((st: any, idx: number) => (
                  <div key={idx} className="space-y-2 rounded-xl border border-white/5 bg-white/5/60 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white">{st.teamName}</span>
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">{formatStatNumber(st.matches || 0)} بازی</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px] font-bold">
                      <div className="rounded bg-black/20 p-1 text-emerald-400"><span className="mb-0.5 block font-sans text-[8px] font-normal text-slate-400">گل زده</span>{formatStatNumber(st.goals || 0)}</div>
                      <div className="rounded bg-black/20 p-1 text-sky-400"><span className="mb-0.5 block font-sans text-[8px] font-normal text-slate-400">پاس گل</span>{formatStatNumber(st.assists || 0)}</div>
                      <div className="rounded bg-black/20 p-1 text-amber-400"><span className="mb-0.5 block font-sans text-[8px] font-normal text-slate-400">کلین‌شیت</span>{formatStatNumber(st.cleanSheets || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          <SectionCard title="درباره و شرح ویژگی‌های فیزیکی">
            <p className="text-[13px] font-medium leading-loose text-slate-200">
              {player.bio || "توضیحات و نمایه فیزیکی این بازیکن در سیستم به طور تفصیلی ثبت نشده است."}
            </p>
            <div className="mt-3 space-y-2 border-t border-white/5 pt-3 text-xs font-medium">
              <p className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">تابعیت ملی:</span>
                <span className="font-bold text-white">{player.nationality || "ایران"}</span>
              </p>
            </div>
          </SectionCard>
          {player.honors && player.honors.length > 0 && (
            <SectionCard title="کابین افتخارات باشگاهی">
              <div className="space-y-2">
                {player.honors.map((honor: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-slate-200">
                    <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="font-bold">{honor}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ================= MARKET ================= */}
      {activeTab === "market" && (
        <div className="grid animate-in fade-in grid-cols-1 gap-4 duration-200 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionCard title="ارزش بازیکن در گذر زمان" action={<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">فقط لیگ برتر</span>}>
              <MarketLineChart points={marketHistory} />
            </SectionCard>
          </div>
          <div className="space-y-4">
            <SectionCard title="خلاصه ارزش">
              <div className="space-y-2 text-center">
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-[10px] text-slate-400">بالاترین ارزش</p>
                  <p className="mt-0.5 font-mono text-lg font-black text-white" dir="ltr">{marketLabel}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-[10px] text-slate-400">کمترین ارزش</p>
                  <p className="mt-0.5 font-mono text-lg font-black text-white" dir="ltr">{marketHistory ? marketHistory[0].label : "—"}</p>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-3">
                  <p className="text-[10px] text-slate-400">تغییر نسبت به فصل قبل</p>
                  <p className="mt-0.5 font-mono text-lg font-black text-emerald-400" dir="ltr">
                    {market?.changePct != null ? `${market.changePct >= 0 ? "+" : ""}${formatStatNumber(Number(market.changePct).toFixed(0))}%` : "—"}
                  </p>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="درباره این بخش">
              <p className="text-[11px] leading-relaxed text-slate-400">
                ارزش‌گذاری بازیکن بر اساس عملکرد، سن، پست و وضعیت قرارداد محاسبه می‌شود. منطق محاسباتی این بخش در فاز بعدی اضافه خواهد شد.
              </p>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ================= CAREER ================= */}
      {activeTab === "career" && (
        <div className="animate-in fade-in space-y-4 duration-200">
          <MovementTimeline items={player.movements} title="سوابق ترانسفر باشگاهی" />
          <CareerSection
            kind="player"
            seasonRows={player.seasonRows}
            movements={player.movements}
            seasons={player.seasons}
            currentClubId={player.teamId}
            currentClubName={player.teamName}
          />
          <h3 className="border-r-4 border-emerald-500 pr-2 text-base font-black text-white">تاریخچه سوابق باشگاهی بازیکن</h3>
          {player.careerHistory && player.careerHistory.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#131317] p-2">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-slate-400">
                    <th className="px-2 py-3 font-bold">فصل کاری</th>
                    <th className="px-2 py-3 font-bold">باشگاه</th>
                    <th className="px-2 py-3 text-center font-bold">حضور رسمی</th>
                    <th className="px-2 py-3 text-center font-bold">گل‌ها</th>
                    <th className="px-2 py-3 text-center font-bold">پاس گل</th>
                    <th className="px-2 py-3 text-center font-bold">کلین‌شیت</th>
                    <th className="px-2 py-3 text-center font-bold">نمره میانگین</th>
                  </tr>
                </thead>
                <tbody>
                  {player.careerHistory.map((history: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-white/5">
                      <td className="px-2 py-3 font-mono font-bold text-slate-300">{formatStatNumber(history.season)}</td>
                      <td className="px-2 py-3 font-semibold text-white">{history.club}</td>
                      <td className="px-2 py-3 text-center font-mono text-slate-400">{formatStatNumber(history.apps || 0)} بازی</td>
                      <td className="px-2 py-3 text-center font-mono font-bold text-emerald-400">{formatStatNumber(history.goals || 0)} گل</td>
                      <td className="px-2 py-3 text-center font-mono font-bold text-sky-600">{formatStatNumber(history.assists || 0)} پاس</td>
                      <td className="px-2 py-3 text-center font-mono font-bold text-indigo-400">{formatStatNumber(history.cleanSheets || 0)} کلین</td>
                      <td className="px-2 py-3 text-center font-mono font-bold text-amber-400">
                        {history.averageRating ? formatStatNumber(parseFloat(history.averageRating).toFixed(1)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/5 bg-white/5 p-6 text-center text-xs text-slate-400">
              اطلاعات ثبت شده‌ای در مورد سوابق گذشته در دست نیست.
            </div>
          )}
        </div>
      )}

      {/* ================= RATINGS ================= */}
      {activeTab === "ratings" && (
        <div className="animate-in fade-in space-y-4 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="border-r-4 border-emerald-500 pr-2 text-base font-black text-white">ریز نمرات بازیکن در فصل جاری</h3>
            {(player.seasons || []).length > 0 && (
              <SeasonSwitcher seasons={player.seasons} value={seasonId} onChange={setSeasonId} />
            )}
          </div>
          <SectionCard title="نمرات 10 بازی اخیر">
            <RatingsLineChart data={last10Points} />
            {last10Avg != null && (
              <p className="mx-auto mt-2 w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-300">
                میانگین نمره: <span className="font-mono">{formatStatNumber(last10Avg.toFixed(2))}</span>
              </p>
            )}
          </SectionCard>
          <MatchLogList matches={visiblePlayerMatches} onSelectMatch={onSelectMatch} />
        </div>
      )}

      {/* ================= COMPARE ================= */}
      {activeTab === "compare" && (
        <div className="grid animate-in fade-in grid-cols-1 gap-4 duration-200 lg:grid-cols-2">
          <SectionCard title={myAvgNum > 0 ? `بازیکنان مشابه (${player.position})` : "بازیکنان مشابه"}>
            <SimilarPlayers items={similarFull.slice(0, 8)} />
          </SectionCard>
          <div className="space-y-4">
            <SectionCard title="مقایسه رودررو">
              {similarFull.length > 0 ? (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                    <span className="shrink-0">حریف مقایسه:</span>
                    <select
                      value={compareId || ""}
                      onChange={(e) => setCompareId(e.target.value || null)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-2.5 py-2 text-[11px] font-black text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">انتخاب بازیکن...</option>
                      {similarFull.slice(0, 8).map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.teamName})</option>
                      ))}
                    </select>
                  </label>
                  {(() => {
                    const target = (allPlayers || []).find((p: any) => String(p?.id) === String(compareId));
                    if (!target) return <p className="py-3 text-center text-[11px] text-slate-500">یک بازیکن مشابه را انتخاب کنید تا کنار هم مقایسه شوند.</p>;
                    const tAvg = Number(target.seasonStats?.averageRating ?? target.averageRating ?? 0) || null;
                    const rows: [string, string, string][] = [
                      ["باشگاه", String(player.teamName || "—"), String(target.teamName || "—")],
                      ["سن", myAgeNum != null ? formatStatNumber(myAgeNum) : "—", Number(target.age) > 0 ? formatStatNumber(target.age) : "—"],
                      ["بازی", formatStatNumber(displayedMatches), formatStatNumber(Number(target.seasonStats?.matches ?? 0))],
                      ["گل", formatStatNumber(displayedGoals), formatStatNumber(Number(target.seasonStats?.goals ?? 0))],
                      ["پاس گل", formatStatNumber(displayedAssists), formatStatNumber(Number(target.seasonStats?.assists ?? 0))],
                      ["میانگین نمره", displayedAvgRating != null ? formatStatNumber(Number(displayedAvgRating).toFixed(1)) : "—", tAvg != null ? formatStatNumber(tAvg.toFixed(1)) : "—"],
                    ];
                    return (
                      <div className="overflow-x-auto rounded-xl border border-white/5">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="bg-white/5 text-[10px] text-slate-400">
                              <th className="p-2 font-bold">شاخص</th>
                              <th className="p-2 text-center font-black text-emerald-300">{player.name}</th>
                              <th className="p-2 text-center font-black text-sky-300">{target.name}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {rows.map(([label, a, b]) => (
                              <tr key={label}>
                                <td className="p-2 font-bold text-slate-400">{label}</td>
                                <td className="p-2 text-center font-mono font-bold text-slate-100">{a}</td>
                                <td className="p-2 text-center font-mono font-bold text-slate-100">{b}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="py-3 text-center text-[11px] text-slate-500">بازیکن مشابهی برای مقایسه وجود ندارد.</p>
              )}
            </SectionCard>
            <SectionCard title="راهنمای مقایسه">
              <div className="space-y-2 text-[11px] leading-relaxed text-slate-400">
                <p>فهرست مشابه‌ها <b className="text-slate-200">فقط از بین بازیکنان هم‌پست</b> دارای نمره میانگین ساخته می‌شود{player.position ? ` (${player.position})` : ""}.</p>
                <p>درصد شباهت از دو المان به دست می‌آید: <b className="text-slate-200">نزدیکی نمره میانگین</b> و <b className="text-slate-200">نزدیکی سن</b> (هر سال اختلاف سن، ۱.۵ واحد کم می‌کند).</p>
                {myAvgNum <= 0 && <p className="font-bold text-amber-400">برای این بازیکن هنوز نمره میانگینی ثبت نشده است؛ پس از ثبت نمرات، فهرست مشابه‌ها ساخته می‌شود.</p>}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ================= NEWS ================= */}
      {activeTab === "news" && (
        <div className="animate-in fade-in duration-200">
          <SectionCard title={`اخبار ${player.name}`}>
            {loadingNews ? (
              <p className="py-6 text-center text-xs font-bold text-slate-400">در حال بارگذاری اخبار...</p>
            ) : (
              <NewsList items={playerNews} playerName={player.name} onSelectNews={onSelectNews} />
            )}
          </SectionCard>
        </div>
      )}

      {/* footer */}
      <p className="pb-2 text-center text-[10px] text-slate-400">تمامی داده‌ها و آمارها متعلق به تب فوتبال می‌باشد.</p>
    </div>
  );
}
