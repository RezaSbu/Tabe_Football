import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, Award, Calendar, Zap, Heart, ShieldCheck, 
  Star, Activity, Trophy, Clock, UserRound, Sparkles, Newspaper
} from "lucide-react";
import { getSafeImageUrl, isTeamInDb, convertGregorianToShamsi, toPersianDigits, normalizePersianString } from "../utils";
import { resolveTeam } from "../shared/teamMatch";
import { realMinute } from "../shared/matchMinute";

interface PlayerDetailProps {
  player: any;
  allMatches?: any[];
  allTeams?: any[];
  news?: any[];
  onBack: () => void;
  onSelectTeam?: (name: string) => void;
  onSelectMatch?: (id: string) => void;
  onSelectNews?: (id: string) => void;
}

export default function PlayerDetail({ 
  player, 
  allMatches = [], 
  allTeams = [], 
  news = [],
  onBack, 
  onSelectTeam,
  onSelectMatch,
  onSelectNews
}: PlayerDetailProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "matches" | "career">("overview");
  const [imageError, setImageError] = useState(false);
  const [lastPlayerId, setLastPlayerId] = useState<string | undefined>(undefined);
  const [selectedCompet, setSelectedCompet] = useState<"all" | "league" | "cup">("all");

  useEffect(() => {
    if (player) {
      const isFutsal = player.id?.startsWith("futsal-") || player.teamId?.startsWith("futsal-") || player.teamId?.includes("futsal") || (player.teamName || "").includes("فوتسال");
      setSelectedCompet(isFutsal ? "league" : "all");
    }
  }, [player?.id]);

  if (!player) return null;

  if (player?.id !== lastPlayerId) {
    setImageError(false);
    setLastPlayerId(player?.id);
  }

  const isFutsalPlayer = player.id?.startsWith("futsal-") || 
                         player.teamId?.startsWith("futsal-") || 
                         player.teamId?.includes("futsal") || 
                         (player.teamName || "").includes("فوتسال");

  // Latest 3 news mentioning this player (matched on normalized name)
  const playerNews = [...(news || [])]
    .filter((n: any) => {
      if (!n) return false;
      const haystack = normalizePersianString(`${n.title || ""} ${n.summary || ""} ${n.content || ""}`);
      return haystack.includes(normalizePersianString(player.name || ""));
    })
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 3);

  const getPlayerMinutesAndPlayed = (m: any, p: any) => {
    const isFutsal = m.sport === "futsal" || m.league === "futsal";
    const fullDuration = isFutsal ? 40 : 90;

    const normalize = (str: string) => {
      if (!str) return "";
      return String(str)
        .trim()
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[\s\t]+/g, " ")
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .toLowerCase();
    };

    const normPName = normalize(p.name || "");
    const normPId = String(p.id || "");

    const checkMatch = (key?: any) => {
      if (!key) return false;
      const normKey = normalize(String(key));
      return normKey === normPName || normKey === normPId;
    };

    const lineups = m.lineups || { home: [], away: [] };
    const homeLineup = lineups.home || [];
    const awayLineup = lineups.away || [];

    const inHome = homeLineup.find((x: any) => checkMatch(x.id) || checkMatch(x.name));
    const inAway = awayLineup.find((x: any) => checkMatch(x.id) || checkMatch(x.name));
    const lp = inHome || inAway;

    const events = m.events || [];

    const subInEvent = events.find((ev: any) => ev && ev.type === "substitution" && checkMatch(ev.player2Name));
    const subOutEvent = events.find((ev: any) => ev && ev.type === "substitution" && checkMatch(ev.playerName));
    const redCardEvent = events.find((ev: any) => ev && ev.type === "red-card" && checkMatch(ev.playerName));

    const hasOtherEvent = events.some((ev: any) => ev && ev.type !== "substitution" && (checkMatch(ev.playerName) || checkMatch(ev.player2Name)));
    const inScorersList = (m.scorersList || []).some((sc: any) => sc && (checkMatch(sc.scorerName) || checkMatch(sc.scorerId) || checkMatch(sc.name) || checkMatch(sc.assist)));

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

    const lineups = match.lineups || { home: [], away: [] };
    const homeLineup = lineups.home || [];
    const awayLineup = lineups.away || [];

    const normalize = (str: string) => {
      if (!str) return "";
      return String(str)
        .trim()
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[\s\t]+/g, " ")
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .toLowerCase();
    };

    const isMatch = (pl: any) => {
      return pl && (normalize(pl.id) === normalize(player.id) || normalize(pl.name) === normalize(player.name));
    };

    const lpHome = homeLineup.find(isMatch);
    const lpAway = awayLineup.find(isMatch);

    let playerGoals = 0;
    let playerAssists = 0;
    let playerYellow = 0;
    let playerRed = 0;
    const playerRating = lpHome?.rating || lpAway?.rating || player.averageRating || 7.0;

    // Sum from events:
    const matchEvents = match.events || [];
    matchEvents.forEach((ev: any) => {
      if (!ev) return;
      if (normalize(ev.playerName) === normalize(player.name) || normalize(ev.playerName) === normalize(player.id)) {
        if (ev.type === "goal" || ev.type === "penalty") playerGoals += 1;
        else if (ev.type === "yellow-card") playerYellow += 1;
        else if (ev.type === "red-card") playerRed += 1;
      }
      if (normalize(ev.player2Name) === normalize(player.name) || normalize(ev.player2Name) === normalize(player.id)) {
        if (ev.type === "assist" || ev.type === "goal") playerAssists += 1;
      }
    });

    if (lpHome) {
      playerGoals = Math.max(playerGoals, parseInt(lpHome.goals) || 0);
      playerAssists = Math.max(playerAssists, parseInt(lpHome.assists) || 0);
    }
    if (lpAway) {
      playerGoals = Math.max(playerGoals, parseInt(lpAway.goals) || 0);
      playerAssists = Math.max(playerAssists, parseInt(lpAway.assists) || 0);
    }

    let inHome = lpHome;
    let inAway = lpAway;

    if (!inHome && !inAway) {
      const sameTeam = (a?: string, b?: string) => !!a && !!b && normalize(a) === normalize(b);
      const isHomeTeam = sameTeam(player.teamName, match.teamHome);
      const isAwayTeam = sameTeam(player.teamName, match.teamAway);

      let assumedTeam: "home" | "away" | null = null;
      if (isHomeTeam) assumedTeam = "home";
      else if (isAwayTeam) assumedTeam = "away";
      else {
        const matchingEv = matchEvents.find((ev: any) => ev && ev.team && (normalize(ev.playerName) === normalize(player.name) || normalize(ev.playerName) === normalize(player.id)));
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
        const isPlayer1 = ev.playerName === player.name || ev.playerName === player.id || (ev.playerName && player.name && normalizePersianString(ev.playerName) === normalizePersianString(player.name));
        const isPlayer2 = ev.player2Name === player.name || ev.player2Name === player.id || (ev.player2Name && player.name && normalizePersianString(ev.player2Name) === normalizePersianString(player.name));

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
          rating: inHome.rating || 7.0,
          minutesPlayed: calculatedMins || inHome.minutesPlayed || 90,
          isMvp: match.mvpId === player.id || match.mvpId === player.name || inHome.rating >= 8.5,
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
          rating: inAway.rating || 7.0,
          minutesPlayed: calculatedMins || inAway.minutesPlayed || 90,
          isMvp: match.mvpId === player.id || match.mvpId === player.name || inAway.rating >= 8.5,
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
  const leagueMatches = player.leagueStats?.matches || 0;
  const leagueGoals = player.leagueStats?.goals || 0;
  const leagueAssists = player.leagueStats?.assists || 0;
  const leagueClean = player.leagueStats?.cleanSheets || 0;
  const leagueYellow = player.leagueStats?.yellowCards || 0;
  const leagueRed = player.leagueStats?.redCards || 0;
  const leagueMinutes = player.leagueStats?.minutes || (leagueMatches * 90);
  const leagueMvps = player.leagueStats?.mvps || player.ratingsHistory?.filter((h: any) => !h.isCup && h.isMvp).length || 0;
  const leagueAvgRating = player.leagueStats?.averageRating || player.rating || 7.0;

  const cupMatches = player.cupStats?.matches || 0;
  const cupGoals = player.cupStats?.goals || 0;
  const cupAssists = player.cupStats?.assists || 0;
  const cupClean = player.cupStats?.cleanSheets || 0;
  const cupYellow = player.cupStats?.yellowCards || 0;
  const cupRed = player.cupStats?.redCards || 0;
  const cupMinutes = player.cupStats?.minutes || (cupMatches * 90);
  const cupMvps = player.cupStats?.mvps || player.ratingsHistory?.filter((h: any) => h.isCup && h.isMvp).length || 0;
  const cupAvgRating = player.cupStats?.averageRating || 0;

  const displayedMatches = player.seasonStats?.matches || 0;
  const displayedGoals = player.seasonStats?.goals || 0;
  const displayedAssists = player.seasonStats?.assists || 0;
  const displayedClean = player.seasonStats?.cleanSheets || 0;
  const displayedYellow = player.seasonStats?.yellowCards || 0;
  const displayedRed = player.seasonStats?.redCards || 0;
  const displayedMinutes = player.seasonStats?.minutes || playerMatches.reduce((acc, m) => acc + m.minutesPlayed, 0) || (displayedMatches * 90);
  const displayedMvps = player.seasonStats?.mvps || player.ratingsHistory?.filter((h: any) => h.isMvp).length || playerMatches.filter(m => m.isMvp).length || 0;
  const displayedAvgRating = player.seasonStats?.averageRating || player.averageRating || player.rating || 7.0;

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Modern Compact Floating Navigation Header */}
      <div className="flex items-center justify-between bg-[#131317]/80 backdrop-blur border border-white/5 p-3 rounded-2xl sticky top-2 z-40 select-none shadow-xl">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white bg-white/5 active:bg-white/10 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>برگشت به خانه</span>
        </button>
        
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
          <span className="text-[10px] text-slate-450 font-black">پروفایل فنی و سلامت بازیکن</span>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black px-1.5 py-0.5 rounded font-mono">
            ID: {player.id || "Unresolved"}
          </span>
        </div>
      </div>

      {/* Main Profile Showcase Frame */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-[#131317] to-slate-950 shadow-2xl p-4 sm:p-6">
        
        {/* Subtle radial backdrop ambient light */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Avatar and Essential Branding */}
          <div className="lg:col-span-4 flex flex-col items-center text-center space-y-4">
            <div className="relative group select-none">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur opacity-15" />
              <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden border-2 border-white/10 bg-slate-900 flex items-center justify-center">
                {!imageError && player.image ? (
                  <img loading="lazy" decoding="async" 
                    src={getSafeImageUrl(player.image)} 
                    alt={player.name}
                    className="h-full w-full object-cover"
                    onError={() => setImageError(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserRound className="h-14 w-14 text-slate-600" />
                )}
              </div>
              <span className="absolute bottom-1 right-1 h-5 w-5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight flex items-center justify-center gap-1.5">
                {player.name}
              </h2>
              <div className="flex items-center gap-2 justify-center mt-1.5 text-[10px] flex-wrap">
                <span className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-slate-300 font-bold">
                  {player.position || "بازیکن آزاد"}
                </span>
                
                {myClubRef ? (
                  <button 
                    onClick={() => onSelectTeam && onSelectTeam(myClubRef.name)}
                    className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-400 font-bold hover:bg-emerald-500/20 transition cursor-pointer"
                  >
                    <span>{player.teamName}</span>
                  </button>
                ) : (
                  <span className="text-slate-450">{player.teamName || "بدون باشگاه"}</span>
                )}
                
                <span className="font-mono text-slate-450">#{toPersianDigits(player.number || "۱۰")}</span>
              </div>
            </div>
          </div>

          {/* Quick Vital Specs Card Grid */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <div className="p-3.5 rounded-2xl bg-black/35 border border-white/5 text-center">
              <span className="block text-[9px] text-[#808092] font-black mb-1">سن بازیکن</span>
              <span className="text-sm font-black text-slate-100 font-mono">{toPersianDigits(player.age || "۲۴")} سال</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/35 border border-white/5 text-center">
              <span className="block text-[9px] text-[#808092] font-black mb-1">قد</span>
              <span className="text-sm font-black text-slate-100 font-mono">{toPersianDigits(player.height || "۱۸۰")} cm</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/35 border border-white/5 text-center">
              <span className="block text-[9px] text-[#808092] font-black mb-1">وزن</span>
              <span className="text-sm font-black text-slate-100 font-mono">{toPersianDigits(player.weight || "۷۵")} kg</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/35 border border-white/5 text-center">
              <span className="block text-[9px] text-[#808092] font-black mb-1">پای تخصصی</span>
              <span className="text-sm font-black text-emerald-400">{player.foot || "راست‌پا"}</span>
            </div>

          </div>

        </div>
      </div>

      {/* Secondary Tab Switchers (Overview , detailed Matches, Career History) */}
      <div className="flex gap-1 p-1 bg-[#131317] border border-white/5 rounded-2xl text-xs select-none shadow-lg">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 py-3 rounded-xl font-black text-center transition cursor-pointer ${
            activeTab === "overview" ? "bg-emerald-500 text-black shadow font-black" : "text-slate-400 hover:text-white"
          }`}
        >
          خلاصه فصل فنی و آماری
        </button>
        <button
          onClick={() => setActiveTab("matches")}
          className={`flex-1 py-3 rounded-xl font-black text-center transition cursor-pointer ${
            activeTab === "matches" ? "bg-emerald-500 text-black shadow font-black" : "text-slate-400 hover:text-white"
          }`}
        >
          ریز نمایه بازی‌ها ({toPersianDigits(playerMatches.length)})
        </button>
        <button
          onClick={() => setActiveTab("career")}
          className={`flex-1 py-3 rounded-xl font-black text-center transition cursor-pointer ${
            activeTab === "career" ? "bg-emerald-500 text-black shadow font-black" : "text-slate-400 hover:text-white"
          }`}
        >
          سوابق ترنسفر باشگاهی
        </button>
      </div>

      <div className="space-y-6">
        
        {/* TAB 1: OVERVIEW STATS */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
            
            {/* Left Column: Player Bio card */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-4.5 rounded-2xl bg-[#131317] border border-white/5 space-y-4 shadow-lg text-xs leading-relaxed">
                <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  <span>درباره و شرح ویژگی‌های فیزیکی</span>
                </h3>
                
                <p className="text-slate-400 font-medium">
                  {player.bio || "توضیحات و نمایه فیزیکی یا خلاصه عملکرد فنی ترنسفر این بازیکن در سیستم فوتبال کشور به طور تفصیلی ثبت نشده است."}
                </p>

                <div className="space-y-2 border-t border-white/5 pt-3 font-medium">
                  <p className="flex justify-between border-b border-white/[0.02] pb-1.5">
                    <span className="text-slate-500">تابعیت ملی:</span>
                    <span className="text-white font-bold">{player.nationality || "ایران"}</span>
                  </p>
                </div>
              </div>

              {playerNews.length > 0 && (
                <div className="p-4.5 rounded-2xl bg-[#131317] border border-white/5 space-y-3 shadow-lg">
                  <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                    <Newspaper className="h-4 w-4 text-emerald-500" />
                    <span>آخرین اخبار {player.name}</span>
                  </h3>
                  <div className="space-y-2">
                    {playerNews.map((nw: any) => (
                      <button
                        key={nw.id}
                        onClick={() => onSelectNews && onSelectNews(nw.id)}
                        className="w-full flex items-start gap-2.5 text-right p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-emerald-500/30 transition cursor-pointer group"
                      >
                        {nw.image ? (
                          <img
                            src={getSafeImageUrl(nw.image)}
                            alt={nw.title}
                            loading="lazy"
                            className="w-14 h-14 rounded-lg object-cover shrink-0 bg-slate-800"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg shrink-0 bg-slate-800 flex items-center justify-center text-base">📰</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-white leading-snug line-clamp-2 group-hover:text-emerald-400 transition">
                            {nw.title}
                          </h4>
                          {nw.summary && (
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{nw.summary}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Key Stats Bento Grid */}
            <div className="lg:col-span-8 space-y-6">

              {/* Competition Selector Toggle for Overview Stats */}
              <div className="flex items-center justify-between gap-3 p-3.5 bg-black/20 rounded-2xl border border-white/5 flex-wrap">
                <div className="text-right">
                  <h4 className="font-black text-xs text-slate-200">فیلتر عملکرد و نرخ‌های آماری بازیکن</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">تفکیک فنی نمرات، دقایق بازی، کارت‌ها و نمرات MVP بر اساس تورنمنت</p>
                </div>
                
                <div className="flex gap-1 p-0.5 rounded-xl bg-black/40 border border-white/5 select-none text-[10px]">
                  {!isFutsalPlayer && (
                    <button
                      type="button"
                      onClick={() => setSelectedCompet("all")}
                      className={`px-3 py-1.5 rounded-lg font-black transition ${selectedCompet === "all" ? "bg-emerald-500 text-black shadow-lg" : "text-slate-400 hover:text-white"}`}
                    >
                      کل فصل جاری
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedCompet("league")}
                    className={`px-3 py-1.5 rounded-lg font-black transition ${selectedCompet === "league" ? "bg-emerald-500 text-black shadow-lg" : "text-slate-450 hover:text-white"}`}
                  >
                    {isFutsalPlayer ? "لیگ برتر فوتسال" : "لیگ برتر"}
                  </button>
                  {!isFutsalPlayer && (
                    <button
                      type="button"
                      onClick={() => setSelectedCompet("cup")}
                      className={`px-3 py-1.5 rounded-lg font-black transition ${selectedCompet === "cup" ? "bg-emerald-500 text-black shadow-lg" : "text-slate-450 hover:text-white"}`}
                    >
                      جام حذفی
                    </button>
                  )}
                </div>
              </div>

              {/* Sofa/MVP/Minutes Ratings Grid summaries */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4.5 rounded-2xl bg-[#131317] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] text-gray-400 font-bold mb-1">
                      شماره پیراهن رسمی
                    </span>
                    <span className="text-2xl font-mono font-black text-emerald-400"># {toPersianDigits(player.number || "۱۰")}</span>
                    <span className="block text-[9px] text-slate-500 mt-1 font-medium">پیراهن اول باشگاه</span>
                  </div>
                  <ShieldCheck className="h-9 w-9 text-emerald-400 bg-emerald-500/10 p-2 rounded-full shrink-0" />
                </div>

                <div className="p-4.5 rounded-2xl bg-[#131317] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] text-gray-400 font-bold mb-1">
                      {selectedCompet === "all" ? "مجموع بهترین بازیکن زمین" : selectedCompet === "league" ? (isFutsalPlayer ? "بهترین بازیکن زمین در لیگ فوتسال" : "بهترین بازیکن زمین در لیگ") : "بهترین بازیکن زمین در جام حذفی"}
                    </span>
                    <span className="text-2xl font-mono font-black text-red-500">{toPersianDigits(activeMvps)} بار</span>
                    <span className="block text-[9px] text-slate-500 mt-1 font-medium">افتخار بهترین عملکرد زمین (MVP)</span>
                  </div>
                  <Award className="h-9 w-9 text-red-400 bg-red-500/10 p-2 rounded-full shrink-0" />
                </div>

                <div className="p-4.5 rounded-2xl bg-[#131317] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] text-gray-400 font-bold mb-1">
                      {selectedCompet === "all" ? "کل دقایق بازی در فصل" : selectedCompet === "league" ? (isFutsalPlayer ? "دقایق بازی در لیگ فوتسال" : "دقایق بازی در لیگ برتر") : "دقایق بازی در جام حذفی"}
                    </span>
                    <span className="text-xl font-mono font-black text-slate-200">
                      {toPersianDigits(activeMinutes)}'
                    </span>
                    <span className="block text-[9px] text-slate-500 mt-1 font-medium">زمان مفید حضور در میدان</span>
                  </div>
                  <Clock className="h-9 w-9 text-[#808092] p-2 bg-white/5 rounded-full shrink-0" />
                </div>
              </div>

              {/* Season Stats Records lists */}
              <div className="space-y-4">
                <h3 className="font-black text-base text-white border-r-4 border-emerald-500 pr-2">رکوردهای تفکیکی بازیکن در این فصل</h3>
                
                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20 text-xs">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-slate-400 font-bold border-b border-white/5 select-none">
                        <th className="p-3">رقابت</th>
                        <th className="p-3 text-center">بازی</th>
                        <th className="p-3 text-center">گل زده</th>
                        <th className="p-3 text-center">پاس گل</th>
                        {typeof player.position === "string" && player.position.includes("دروازه") && (
                          <th className="p-3 text-center">کلین‌شیت</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-bold">
                      <tr className={`hover:bg-white/[0.02] ${selectedCompet === "league" ? "bg-emerald-500/5 text-emerald-300" : ""}`}>
                        <td className="p-3 text-slate-200 flex items-center gap-1.5">
                          <span>{isFutsalPlayer ? "لیگ برتر فوتسال" : "مسابقات لیگ برتر"}</span>
                          {selectedCompet === "league" && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-black">فعال</span>}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-300">{toPersianDigits(leagueMatches)}</td>
                        <td className="p-3 text-center font-mono text-emerald-400">{toPersianDigits(leagueGoals)}</td>
                        <td className="p-3 text-center font-mono text-cyan-400">{toPersianDigits(leagueAssists)}</td>
                        {typeof player.position === "string" && player.position.includes("دروازه") && (
                          <td className="p-3 text-center font-mono text-amber-500">{toPersianDigits(leagueClean)}</td>
                        )}
                      </tr>
                      {!isFutsalPlayer && (
                        <>
                          <tr className={`hover:bg-white/[0.02] ${selectedCompet === "cup" ? "bg-emerald-500/5 text-emerald-300" : ""}`}>
                            <td className="p-3 text-slate-200 flex items-center gap-1.5">
                              <span>جام حذفی کشور</span>
                              {selectedCompet === "cup" && <span className="text-[9px] bg-emerald-500/20 text-[#10b981] px-1 py-0.5 rounded font-black">فعال</span>}
                            </td>
                            <td className="p-3 text-center font-mono text-slate-300">{toPersianDigits(cupMatches)}</td>
                            <td className="p-3 text-center font-mono text-emerald-400">{toPersianDigits(cupGoals)}</td>
                            <td className="p-3 text-center font-mono text-cyan-400">{toPersianDigits(cupAssists)}</td>
                            {typeof player.position === "string" && player.position.includes("دروازه") && (
                              <td className="p-3 text-center font-mono text-amber-500">{toPersianDigits(cupClean)}</td>
                            )}
                          </tr>
                          <tr className={`bg-emerald-500/5 text-emerald-500 font-extrabold ${selectedCompet === "all" ? "bg-emerald-500/10" : ""}`}>
                            <td className="p-3 text-emerald-500 flex items-center gap-1.5">
                              <span>جمع کل کارنامه</span>
                              {selectedCompet === "all" && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-black">فعال</span>}
                            </td>
                            <td className="p-3 text-center font-mono text-white">{toPersianDigits(displayedMatches)}</td>
                            <td className="p-3 text-center font-mono text-emerald-300">{toPersianDigits(displayedGoals)}</td>
                            <td className="p-3 text-center font-mono text-cyan-300">{toPersianDigits(displayedAssists)}</td>
                            {typeof player.position === "string" && player.position.includes("دروازه") && (
                              <td className="p-3 text-center font-mono text-amber-400">{toPersianDigits(displayedClean)}</td>
                            )}
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Cards / Miscellaneous */}
                <div className="flex gap-4 justify-end text-xs font-bold pt-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/10 px-3 py-1.5 rounded-xl">
                    <span className="text-[#a0a0ab] text-[10px]">
                      {selectedCompet === "all" ? "کارت زرد کل فصل:" : selectedCompet === "league" ? (isFutsalPlayer ? "کارت زرد در لیگ فوتسال:" : "کارت زرد در لیگ:") : "کارت زرد در حذفی:"}
                    </span>
                    <span className="font-mono text-amber-400 font-black text-sm">{toPersianDigits(activeYellow)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-red-500/5 border border-red-500/10 px-3 py-1.5 rounded-xl">
                    <span className="text-[#a0a0ab] text-[10px]">
                      {selectedCompet === "all" ? "کارت قرمز کل فصل:" : selectedCompet === "league" ? (isFutsalPlayer ? "کارت قرمز در لیگ فوتسال:" : "کارت قرمز در لیگ:") : "کارت قرمز در حذفی:"}
                    </span>
                    <span className="font-mono text-red-500 font-black text-sm">{toPersianDigits(activeRed)}</span>
                  </div>
                </div>

                {/* statsByTeam segmented stats */}
                {player.statsByTeam && player.statsByTeam.length > 0 && (
                  <div className="space-y-3 pt-4">
                    <h4 className="font-black text-xs text-slate-300">تفکیک عملکرد آماری به تفکیک باشگاه‌ها در این فصل</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {player.statsByTeam.map((st: any, idx: number) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col justify-between space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-xs text-white">{st.teamName}</span>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded">
                              {toPersianDigits(st.matches || 0)} بازی
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono font-bold">
                            <div className="p-1 rounded bg-black/20 text-emerald-400">
                              <span className="block text-[8px] text-slate-500 font-sans font-normal mb-0.5">گل زده</span>
                              {toPersianDigits(st.goals || 0)}
                            </div>
                            <div className="p-1 rounded bg-black/20 text-cyan-400">
                              <span className="block text-[8px] text-slate-500 font-sans font-normal mb-0.5">پاس گل</span>
                              {toPersianDigits(st.assists || 0)}
                            </div>
                            <div className="p-1 rounded bg-black/20 text-amber-500">
                              <span className="block text-[8px] text-slate-500 font-sans font-normal mb-0.5">کلین‌شیت</span>
                              {toPersianDigits(st.cleanSheets || 0)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Achievements Showcase */}
              {player.honors && player.honors.length > 0 && (
                <div className="space-y-3 pt-3">
                  <h3 className="font-black text-base text-white border-r-4 border-emerald-500 pr-2">کابین افتخارات و گنجینه‌های باشگاهی</h3>
                  <div className="space-y-2">
                    {player.honors.map((honor: string, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-amber-950/10 border border-amber-500/10 text-xs text-slate-200 flex items-center gap-2.5">
                        <Trophy className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                        <span className="font-bold">{honor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 2: DETAILED MATCH LOGS */}
        {activeTab === "matches" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="font-black text-base text-white border-r-4 border-emerald-500 pr-2">ریز کارنامه مسابقات حضور یافته بازیکن در فصل جاری</h3>
            
            {playerMatches.length > 0 ? (
              <div className="grid gap-3">
                {playerMatches.map((m, idx) => (
                  <div key={idx} onClick={() => onSelectMatch && onSelectMatch(m.matchId)} className="p-3 sm:p-4 rounded-xl bg-[#161619] border border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.01] cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition">
                    
                    {/* Club match label / Opponent details */}
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                        m.result === "W" ? "bg-emerald-950/80 text-[#6ee7b7] border border-emerald-900/50" : m.result === "D" ? "bg-[#1e293b] text-[#cbd5e1]" : "bg-red-950/80 text-[#fca5a5] border border-red-900/50"
                      }`}>
                        {m.result === "W" ? "برد" : m.result === "D" ? "تساوی" : "باخت"}
                      </span>
                      <div className="flex items-center gap-1 text-[13px] text-white font-bold">
                        <span>{m.teamName}</span>
                        <span className="text-slate-500 text-xs">مقابل</span>
                        <span>{m.opponent}</span>
                      </div>
                    </div>

                    {/* Score detail */}
                    <div className="text-center sm:text-right">
                      <span className="text-[10px] text-slate-500 block mb-0.5">نتیجه کلی مسابقه</span>
                      <strong className="font-mono text-slate-200 font-bold bg-black/40 px-2 py-1 rounded">
                        {toPersianDigits(m.scoreHome)} - {toPersianDigits(m.scoreAway)}
                      </strong>
                    </div>

                    {/* Stats registered in match */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {m.goals > 0 && (
                        <span className="bg-emerald-950 text-emerald-400 px-2 py-1 rounded text-[10px] font-black border border-emerald-900/30">
                          ⚽ {toPersianDigits(m.goals)} گل زده
                        </span>
                      )}
                      {m.assists > 0 && (
                        <span className="bg-cyan-950 text-cyan-400 px-2 py-1 rounded text-[10px] font-black border border-cyan-900/30">
                          🎯 {toPersianDigits(m.assists)} پاس گل
                        </span>
                      )}
                      {m.penalties > 0 && (
                        <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-1 rounded text-[10px] font-black">
                          ⚽ پنالتی {toPersianDigits(m.penalties)}
                        </span>
                      )}
                      {m.ownGoals > 0 && (
                        <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-1 rounded text-[10px] font-black">
                          🥅 گل به خودی
                        </span>
                      )}
                      {m.yellowCards > 0 && (
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded text-[10px] font-black">
                          🟨 {toPersianDigits(m.yellowCards)} اخطار
                        </span>
                      )}
                      {m.redCards > 0 && (
                        <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1 rounded text-[10px] font-black">
                          🟥 {toPersianDigits(m.redCards)} اخراج
                        </span>
                      )}
                      {m.subbedIn && (
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[10px] font-black">
                          🔄 تعویضی
                        </span>
                      )}
                      {m.subbedOut && (
                        <span className="bg-slate-500/10 border border-slate-500/20 text-slate-400 px-2 py-1 rounded text-[10px] font-black">
                          🔄 تعویض شد
                        </span>
                      )}

                      <span className="text-slate-500 font-mono">
                        {toPersianDigits(m.minutesPlayed)}' بازی
                      </span>
                    </div>

                    {/* Match MVP badge only */}
                    <div className="flex items-center gap-2 shrink-0">
                      {m.isMvp && (
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black px-2.5 py-1 rounded-xl">
                          MVP زمین
                        </span>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-white/5 rounded-xl bg-black/10">
                هیچ لاگ بازی یا عملکردی برای این بازیکن در سیستم به عنوان بازیکن فیکس ثبت نشده است. مربی اطلاعات را به معتبرساز خواهد سپرد.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CAREER HISTORY */}
        {activeTab === "career" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="font-black text-base text-white border-r-4 border-emerald-500 pr-2">تاریخچه سوابق ترنسفر باشگاهی و سوابق فعالیت بازیکن در فوتبال کشور</h3>
            
            {player.careerHistory && player.careerHistory.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/15 p-2">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-slate-500 text-[10px] border-b border-white/[0.04]">
                      <th className="py-3 px-2 font-bold">فصل کاری</th>
                      <th className="py-3 px-2 font-bold">نام تفصیلی باشگاه قبلی</th>
                      <th className="py-3 px-2 text-center font-bold">حضور رسمی</th>
                      <th className="py-3 px-2 text-center font-bold">تعداد گل‌ها</th>
                      <th className="py-3 px-2 text-center font-bold">پاس گل</th>
                      <th className="py-3 px-2 text-center font-bold">کلین‌شیت</th>
                      <th className="py-3 px-2 text-center font-bold">نمره میانگین</th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.careerHistory.map((history: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01]">
                        <td className="py-3 px-2 font-mono font-bold text-slate-300">{toPersianDigits(history.season)}</td>
                        <td className="py-3 px-2 font-semibold text-white">{history.club}</td>
                        <td className="py-3 px-2 text-center font-mono text-slate-400">{toPersianDigits(history.apps || 0)} بازی</td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400">{toPersianDigits(history.goals || 0)} گل</td>
                        <td className="py-3 px-2 text-center font-mono text-cyan-400 font-bold">{toPersianDigits(history.assists || 0)} پاس</td>
                        <td className="py-3 px-2 text-center font-mono text-indigo-400 font-bold">{toPersianDigits(history.cleanSheets || 0)} کلین</td>
                        <td className="py-3 px-2 text-center font-mono text-amber-400 font-bold">
                          {history.averageRating ? toPersianDigits(parseFloat(history.averageRating).toFixed(1)) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-white/5 bg-black/10 rounded-xl">
                اطلاعات ثبت شده‌ای در مورد سوابق گذشته در دست نیست. بازیکن احتمالا از ستاره‌های آکادمی این باشگاه است.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
