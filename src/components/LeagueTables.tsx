import React, { useState, useEffect } from "react";
import { StandingRow, NewsItem, MatchItem, TeamItem, PlayerItem, StatsData } from "../types";
import { Trophy, Award, Newspaper, Calendar, BarChart3, List, ChevronLeft, Star, Flame, Zap, Target, Search, X } from "lucide-react";
import { isTeamInDb } from "../utils";
import HazfiCupBracket from "./HazfiCupBracket";

interface LeagueTablesProps {
  leagueKey?: "pro-league" | "league-1" | "league-2" | "hazfi-cup";
  standings: Record<string, StandingRow[]>;
  news: NewsItem[];
  matches?: MatchItem[];
  teams?: TeamItem[];
  players?: PlayerItem[];
  stats?: Record<string, StatsData>;
  onSelectNews?: (article: NewsItem) => void;
  onSelectTeam?: (teamNameOrId: string) => void;
  onSelectPlayer?: (playerId: string) => void;
  onSelectMatch?: (match: MatchItem) => void;
  bracket?: any;
  historicalData?: any;
  archives?: any[];
  currentSeason?: string;
}

export default function LeagueTables({
  leagueKey = "pro-league",
  standings,
  news,
  matches = [],
  teams = [],
  players = [],
  stats = {},
  onSelectNews,
  onSelectTeam,
  onSelectPlayer,
  onSelectMatch,
  bracket,
  historicalData,
  archives = [],
  currentSeason = "1404"
}: LeagueTablesProps) {
  const [subTab, setSubTab] = useState<"standings" | "matches" | "stats" | "news">("standings");
  const [selectedSeason, setSelectedSeason] = useState<string>(currentSeason);
  const [activeL2Group, setActiveL2Group] = useState<"league-2-group-a" | "league-2-group-b">("league-2-group-a");
  const [matchSearch, setMatchSearch] = useState<string>("");

  useEffect(() => {
    if (currentSeason) {
      setSelectedSeason(currentSeason);
    }
  }, [currentSeason]);

  const toPersianDigits = (num: number | string): string => {
    const numStr = String(num);
    const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return numStr.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
  };

  const getAvailableArchiveSeasons = (): string[] => {
    if (!archives || !Array.isArray(archives)) return [];
    let filtered: any[] = [];
    if (subTab === "standings" || subTab === "matches") {
      if (leagueKey === "hazfi-cup") {
        filtered = archives.filter(a => a.type === "bracket");
      } else {
        filtered = archives.filter(a => a.type === "standings");
      }
    } else if (subTab === "stats") {
      filtered = archives.filter(a => a.type === "stats");
    }
    const tags = filtered.map(a => a.season_tag);
    return Array.from(new Set(tags));
  };

  const getDeduplicatedSeasons = (): string[] => {
    const dynamicTags = getAvailableArchiveSeasons();
    const staticTags = Object.keys((historicalData as any)?.[getHistoryLeagueKey()] || {}).filter(s => s !== currentSeason);
    return Array.from(new Set([...dynamicTags, ...staticTags])).sort((a, b) => b.localeCompare(a));
  };

  const getActiveBracket = () => {
    if (selectedSeason === currentSeason) {
      return bracket;
    }
    const bracketArchive = archives?.find(a => a.type === "bracket" && a.season_tag === selectedSeason);
    if (bracketArchive && bracketArchive.data) {
      return bracketArchive.data;
    }
    return bracket;
  };

  const activeBracket = getActiveBracket();

  // Colors and texts depending on league key
  const getLeagueConfig = () => {
    switch (leagueKey) {
      case "pro-league":
        return {
          badge: "مسابقات فوتبال کشور کشوری",
          title: "لیگ برتر فوتبال ایران",
          desc: "بالاترین دپارتمان رسمی فوتبال حرفه‌ای ایران، میزبان ۱۶ مدعی با کلاس قهرمانی فوتبال آسیا",
          colorTheme: "red",
          btnColor: "bg-red-650 hover:bg-red-500 text-white",
          activeBtn: "bg-red-600 text-white",
          textAccent: "text-red-500",
          borderAccent: "border-red-500/20",
          pillBg: "bg-red-500/10 border-red-500/20 text-red-400"
        };
      case "league-1":
        return {
          badge: "مسابقات فوتبال کشور کشوری",
          title: "لیگ یک فوتبال ایران",
          desc: "بالاترین دپارتمان رسمی فوتبال حرفه‌ای ایران، میزبان ۱۸ مدعی با کلاس هیجان صعود فوتبال آسیا",
          colorTheme: "red",
          btnColor: "bg-red-650 hover:bg-red-500 text-white",
          activeBtn: "bg-red-600 text-white",
          textAccent: "text-red-500",
          borderAccent: "border-red-500/20",
          pillBg: "bg-red-500/10 border-red-500/20 text-red-400"
        };
      case "league-2":
        return {
          badge: "مسابقات فوتبال کشور کشوری",
          title: "لیگ دو فوتبال ایران",
          desc: "بالاترین دپارتمان رسمی فوتبال حرفه‌ای ایران، میزبان ۲۸ مدعی با کلاس تقابل صعود فوتبال آسیا",
          colorTheme: "red",
          btnColor: "bg-red-650 hover:bg-red-500 text-white",
          activeBtn: "bg-red-600 text-white",
          textAccent: "text-red-500",
          borderAccent: "border-red-500/20",
          pillBg: "bg-red-500/10 border-red-500/20 text-red-400"
        };
      case "hazfi-cup":
        return {
          badge: "مسابقات جام حذفی فوتبال کشور",
          title: "جام حذفی فوتبال ایران (جام شگفتی‌ها)",
          desc: "نبردهای مهیج و تک‌حذفی فوتبال باشگاهی ایران، از مرحله یک‌شانزدهم تا فینال بزرگ طوفانی آزادی",
          colorTheme: "purple",
          btnColor: "bg-purple-600 hover:bg-purple-500 text-white",
          activeBtn: "bg-purple-600 text-white",
          textAccent: "text-purple-400",
          borderAccent: "border-purple-500/20",
          pillBg: "bg-purple-500/10 border-purple-500/20 text-purple-400"
        };
      default:
        return {
          badge: "مسابقات لیگ حرفه‌ای کشور",
          title: "لیگ برتر فوتبال ایران",
          desc: "جدول، نتایج، آمار و اخبار مربوط به برترین لیگ فوتبال ایران زمین",
          colorTheme: "emerald",
          btnColor: "bg-emerald-600 text-black",
          activeBtn: "bg-emerald-600 text-black",
          textAccent: "text-emerald-400",
          borderAccent: "border-emerald-500/20",
          pillBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        };
    }
  };

  const config = getLeagueConfig();

  // Get active lookup key for historical standings
  const getHistoryLeagueKey = () => {
    if (leagueKey === "pro-league") return "pro-league";
    if (leagueKey === "league-1") return "league-1";
    if (leagueKey === "league-2") {
      return activeL2Group === "league-2-group-a" ? "league-2-group-a" : "league-2-group-b";
    }
    return "pro-league";
  };

  const getStandingsKey = () => {
    if (leagueKey === "league-2") {
      return activeL2Group;
    }
    return leagueKey;
  };

  // Standings computer
  const isCurrentSeason = selectedSeason === currentSeason;
  const rawCurrentStandings = standings[getStandingsKey()] || [];

  const getActiveStandings = (): StandingRow[] => {
    if (isCurrentSeason) {
      if (leagueKey === "hazfi-cup") return [];
      return rawCurrentStandings;
    }
    // Try to fetch from dynamic archives first
    const standingArchive = archives?.find(a => a.type === "standings" && a.season_tag === selectedSeason);
    if (standingArchive && standingArchive.data && standingArchive.data[getStandingsKey()]) {
      return standingArchive.data[getStandingsKey()];
    }
    // Fallback to historical data passed from server database
    const leagueKeyHistory = getHistoryLeagueKey();
    const historicalSource = (historicalData as any)?.[leagueKeyHistory] || {};
    return historicalSource[selectedSeason] || [];
  };

  const currentStandings = getActiveStandings();

  // Match items filtering
  const getActiveMatches = (): MatchItem[] => {
    if (isCurrentSeason) {
      return matches.filter(m => m.league === leagueKey && m.status !== "archived");
    }
    const seasonArchives = archives?.filter(a => a.season_tag === selectedSeason) || [];
    const allMatches: MatchItem[] = [];
    const seenIds = new Set<string>();

    // 1. Try to fetch from dedicated matches archive first!
    const dedicatedMatchesArc = seasonArchives.find(a => a.type === "matches");
    if (dedicatedMatchesArc && dedicatedMatchesArc.data && Array.isArray(dedicatedMatchesArc.data)) {
      const matchesInArc = dedicatedMatchesArc.data.filter((m: any) => m.league === leagueKey);
      for (const m of matchesInArc) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          allMatches.push(m);
        }
      }
    }

    // 2. Fallback: Search nested matches inside standings/bracket archives for legacy support
    const preferredType = leagueKey === "hazfi-cup" ? "bracket" : "standings";
    const sortedArchives = [...seasonArchives].sort((a, b) => {
      if (a.type === preferredType && b.type !== preferredType) return -1;
      if (a.type !== preferredType && b.type === preferredType) return 1;
      return 0;
    });

    for (const arc of sortedArchives) {
      if (arc.data && arc.data.matches && Array.isArray(arc.data.matches)) {
        const matchesInArc = arc.data.matches.filter((m: any) => m.league === leagueKey);
        for (const m of matchesInArc) {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            allMatches.push(m);
          }
        }
      }
    }
    return allMatches;
  };

  const filteredMatches = getActiveMatches();
  const searchedMatches = filteredMatches.filter(m => 
    m.teamHome?.toLowerCase().includes(matchSearch.toLowerCase()) || 
    m.teamAway?.toLowerCase().includes(matchSearch.toLowerCase())
  );

  // News items filtering
  const filteredNews = news.filter(n => {
    const isCategory = n.category === leagueKey;
    const isTagged = n.tags?.some(t => {
      if (leagueKey === "pro-league") return t.includes("لیگ برتر") || t.includes("پرسپولیس") || t.includes("استقلال") || t.includes("سپاهان") || t.includes("تراکتور");
      if (leagueKey === "league-1") return t.includes("لیگ یک") || t.includes("آزادگان") || t.includes("خیبر");
      if (leagueKey === "league-2") return t.includes("لیگ دو") || t.includes("لیگ ۲");
      if (leagueKey === "hazfi-cup") return t.includes("حذفی") || t.includes("جام حذفی");
      return false;
    });
    return isCategory || isTagged;
  });

  // Calculate league players and stats dynamically
  const isPlayerInLeague = (player: PlayerItem) => {
    if (leagueKey === "pro-league") {
      return standings["pro-league"]?.some(row => row.team === player.teamName) || ["پرسپولیس", "استقلال", "سپاهان", "تراکتور", "ملوان", "ذوب آهن", "فولاد", "گل گهر", "نساجی"].includes(player.teamName);
    }
    if (leagueKey === "league-1") {
      return standings["league-1"]?.some(row => row.team === player.teamName) || ["خیبر خرم‌آباد", "سایپا", "چادرملو", "فجرسپاسی"].includes(player.teamName);
    }
    if (leagueKey === "league-2") {
      return (
        standings["league-2-group-a"]?.some(row => row.team === player.teamName) ||
        standings["league-2-group-b"]?.some(row => row.team === player.teamName) ||
        ["نیروی زمینی", "کویر مقوا", "شهرداری نوشهر", "بعثت کرمانشاه", "داماش گیلان"].includes(player.teamName)
      );
    }
    if (leagueKey === "hazfi-cup") {
      // In cup, any player can be in league representation
      return true;
    }
    return false;
  };

  const leaguePlayers = players.filter(isPlayerInLeague);

  const getActiveStats = (): StatsData => {
    const defaultStats = { scorers: [], assists: [], cleansheets: [], ratings: [] };
    if (isCurrentSeason) {
      return stats[leagueKey] || defaultStats;
    }
    const seasonArchives = archives?.filter(a => a.season_tag === selectedSeason) || [];
    for (const arc of seasonArchives) {
      // 1. Direct leagueKey match (from dedicated stats archive)
      if (arc.data && arc.data[leagueKey]) {
        const d = arc.data[leagueKey];
        if (d.scorers || d.assists || d.cleansheets || d.ratings) {
          return d;
        }
      }
      // 2. Hazfi cup fallback (stats bundled inside bracket archive)
      if (leagueKey === "hazfi-cup" && arc.data && arc.data.stats) {
        const d = arc.data.stats;
        if (d.scorers || d.assists || d.cleansheets || d.ratings) {
          return d;
        }
      }
    }
    return defaultStats;
  };

  const leagueStats = getActiveStats();

  // Top players by average Sofascore rating - preferentially read from stats database table
  const topSofaPlayers = leagueStats.ratings && leagueStats.ratings.length > 0
    ? [...leagueStats.ratings]
        .sort((a: any, b: any) => {
          const valA = a.rating !== undefined ? a.rating : (a.averageRating || 0);
          const valB = b.rating !== undefined ? b.rating : (b.averageRating || 0);
          return Number(valB || 0) - Number(valA || 0);
        })
        .slice(0, 5).map((p: any) => {
          const matchingPlayer = players.find(x => x.name === p.name || x.name?.includes(p.name));
          return {
            id: matchingPlayer?.id || `${leagueKey}-rating-${p.name}`,
            name: p.name,
            teamName: p.team,
            averageRating: p.rating !== undefined ? p.rating : p.averageRating
          };
        })
    : isCurrentSeason
      ? [...leaguePlayers]
          .filter(p => p.averageRating !== undefined)
          .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
          .slice(0, 5)
      : [];

  return (
    <div className="space-y-6 animate-in fade-in" dir="rtl" id={`league-page-${leagueKey}`}>
      {/* 1. Header Hero Banner */}
      <div className={`rounded-2xl bg-gradient-to-l from-gray-900 via-gray-900 to-gray-900 p-5 border border-white/5 relative overflow-hidden`}>
        {/* Decorative corner glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black border ${config.pillBg}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              {config.badge}
            </span>
            <h2 className="font-extrabold text-2xl text-white flex items-center gap-2 mt-1.5">
              <Trophy className={`h-6 w-6 ${config.textAccent}`} />
              {config.title}
            </h2>
            <p className="text-xs text-gray-450 mt-1 leading-relaxed">
              {config.desc}
            </p>

            {/* Season Selector */}
            {(subTab === "standings" || subTab === "stats" || subTab === "matches") && (
              <div className="flex items-center gap-2 mt-3 bg-slate-950/50 border border-white/5 rounded-xl px-3 py-1.5 w-fit text-xs text-slate-300">
                <span className="text-gray-405 font-bold">فصل رقابت‌ها:</span>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="bg-transparent focus:outline-none text-white font-extrabold cursor-pointer pr-1"
                >
                  <option value={currentSeason} className="bg-slate-900 text-white">فصل جاری ({toPersianDigits(currentSeason)})</option>
                  {getDeduplicatedSeasons().map((season) => (
                    <option key={season} value={season} className="bg-slate-900 text-white">
                      فصل {toPersianDigits(season)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex bg-[#121215] p-1 rounded-xl border border-white/5 text-xs font-bold gap-1 self-stretch md:self-auto overflow-x-auto">
            <button
              onClick={() => setSubTab("standings")}
              className={`rounded-lg px-3.5 py-1.5 transition shrink-0 ${
                subTab === "standings" ? config.activeBtn : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {leagueKey === "hazfi-cup" ? "نمودار جام حذفی" : "جدول رده‌بندی"}
            </button>
            <button
              onClick={() => setSubTab("matches")}
              className={`rounded-lg px-3.5 py-1.5 transition shrink-0 ${
                subTab === "matches" ? config.activeBtn : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              برنامه و نتایج
            </button>
            <button
              onClick={() => setSubTab("stats")}
              className={`rounded-lg px-3.5 py-1.5 transition shrink-0 ${
                subTab === "stats" ? config.activeBtn : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              آمار انفرادی
            </button>
            <button
              onClick={() => setSubTab("news")}
              className={`rounded-lg px-3.5 py-1.5 transition shrink-0 ${
                subTab === "news" ? config.activeBtn : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              اخبار اختصاصی
            </button>
          </div>
        </div>
      </div>

      {/* 2. Content sections based on selected Subtab */}
      {subTab === "standings" && (
        leagueKey === "hazfi-cup" ? (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Top Row: Info Column */}
            <div className="lg:col-span-12">
              <div className="bg-[#0b0c10]/90 border border-white/5 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                    <Trophy className="h-4 w-4 text-yellow-500 animate-pulse" />
                    <h3 className="font-black text-sm text-white">درخت قرعه‌کشی و اطلاعات جام حذفی کشور</h3>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed text-justify font-medium">
                    مراحل پایانی جام حذفی فوتبال کشور به صورت تک‌حذفی برگزار شده و برنده نهایی علاوه بر کسب جام قهرمانی، سهمیه مستقیم صعود به لیگ قهرمانان آسیا را دریافت می‌کند. در نمودار زیر تمامی مراحل از یک‌هشتم، یک‌چهارم، نیمه‌نهایی تا فینال بزرگ قابل رهگیری است.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed text-justify font-medium">
                    تیم صعودکننده در نمودار با رنگ سبز متمایز شده است. با کلیک بر روی بازی می‌توانید آمار تکمیلی، رویدادها و اطلاعات جامع هر مسابقه را دنبال کنید.
                  </p>
                </div>
                <div className="text-[10px] font-bold text-slate-400 flex justify-between items-center bg-black/20 px-3 py-2 rounded-lg border border-white/[0.02]">
                  <span>بروزرسانی داده‌های نمودار: زنده و آنی</span>
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
              </div>
            </div>

            {/* Bottom Row / Section: Full Bracket */}
            <div className="bg-[#0b0c10]/90 border border-white/5 rounded-3xl p-5 shadow-lg overflow-x-auto w-full lg:col-span-12">
              <HazfiCupBracket 
                bracket={activeBracket} 
                onSelectTeam={onSelectTeam} 
                onSelectMatch={onSelectMatch} 
                teams={teams}
                matches={isCurrentSeason ? matches : filteredMatches}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            
            {/* Main standouts / tabular area */}
            <div className="lg:col-span-12 space-y-4">
              
              {/* Group Switcher for League 2 */}
              {leagueKey === "league-2" && (
                <div className="flex bg-[#121215] p-1 rounded-xl border border-white/5 text-xs font-bold gap-1 w-fit">
                  <button
                    onClick={() => setActiveL2Group("league-2-group-a")}
                    className={`rounded-lg px-4 py-1.5 transition ${
                      activeL2Group === "league-2-group-a" ? "bg-teal-900/60 text-teal-400 border border-teal-950" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    گروه الف (۱۴ مدعی)
                  </button>
                  <button
                    onClick={() => setActiveL2Group("league-2-group-b")}
                    className={`rounded-lg px-4 py-1.5 transition ${
                      activeL2Group === "league-2-group-b" ? "bg-teal-900/60 text-teal-400 border border-teal-950" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    گروه ب (۱۴ مدعی)
                  </button>
                </div>
              )}

              {/* Standard Table View */}
              <div className="bg-gray-900 border border-white/5 rounded-2xl p-4 shadow overflow-x-auto space-y-4">
                
                <div className="flex items-center gap-1.5 border-b border-white/5 pb-3">
                  <Trophy className={`h-5 w-5 ${config.textAccent}`} />
                  <h3 className="font-black text-sm text-white">
                    جدول رده‌بندی {config.title} ({selectedSeason}-{parseInt(selectedSeason)+1})
                  </h3>
                </div>

                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-white/5 font-semibold">
                      <th className="py-2.5 text-center w-10">رتبه</th>
                      <th className="py-2.5">باشگاه</th>
                      <th className="py-2.5 text-center">بازی</th>
                      <th className="py-2.5 text-center">برد</th>
                      <th className="py-2.5 text-center">مساوی</th>
                      <th className="py-2.5 text-center">باخت</th>
                      <th className="py-2.5 text-center">گل‌زده/خورده</th>
                      <th className="py-2.5 text-center">تفاضل</th>
                      <th className="py-2.5 text-center text-white">امتیاز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {currentStandings.map((row, i) => {
                      const correlatedTeam = teams.find(t => t.name.includes(row.team) || row.team.includes(t.name));
                      const isTopTeam = i < 3;
                      const isBottomTeam = currentStandings.length >= 10 && i >= currentStandings.length - 2;

                      return (
                        <tr
                          key={`${row.team}-${i}`}
                          onClick={() => {
                            if (correlatedTeam && onSelectTeam) {
                              onSelectTeam(correlatedTeam.id);
                            } else if (onSelectTeam) {
                              onSelectTeam(row.team);
                            }
                          }}
                          className="hover:bg-white/[0.02] cursor-pointer transition"
                        >
                          <td className="py-3 text-center">
                            <span className={`inline-flex items-center justify-center font-mono font-bold h-6 w-6 rounded-md text-[11px] ${
                              isTopTeam 
                                ? "bg-amber-500/15 text-amber-500 border border-amber-500/20" 
                                : isBottomTeam 
                                  ? "bg-red-500/15 text-red-500 border border-red-500/10" 
                                  : "bg-slate-800/40 text-slate-400"
                            }`}>
                              {row.rank || i + 1}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-slate-100 flex items-center gap-2">
                            <span className="text-base">{correlatedTeam?.logo || "⚽"}</span>
                            <span>{row.team}</span>
                          </td>
                          <td className="py-3 text-center font-mono text-slate-300">{row.played}</td>
                          <td className="py-3 text-center font-mono text-slate-400">{row.won}</td>
                          <td className="py-3 text-center font-mono text-slate-400">{row.drawn}</td>
                          <td className="py-3 text-center font-mono text-slate-400">{row.lost}</td>
                          <td className="py-3 text-center font-mono text-slate-400">
                            {row.goalsFor} - {row.goalsAgainst}
                          </td>
                          <td className={`py-3 text-center font-mono font-bold ${row.goalDifference > 0 ? "text-emerald-400" : row.goalDifference < 0 ? "text-red-400" : "text-gray-400"}`}>
                            {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                          </td>
                          <td className="py-3 text-center font-mono font-black text-white bg-slate-950/20">{row.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend guide */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] text-gray-500 font-bold bg-[#121215]/50 border border-white/5 p-3 rounded-xl">
                <span className="flex items-center gap-1.5">
                  <span className="block h-2 w-2 rounded bg-amber-500"></span>
                  طلایی: صعود مستقیم / رتبه‌های برتر صدرنشین
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="block h-2 w-2 rounded bg-red-500"></span>
                  قرمز: خطر سقوط یا پلی‌آف سقوط
                </span>
              </div>
            </div>
          </div>
        )
      )}

      {/* 2.2 TAB - MATCHES / RESULTS */}
      {subTab === "matches" && (
        <div className="space-y-4">
          {filteredMatches.length > 0 && (
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="جستجوی مسابقه با نام تیم..."
                value={matchSearch}
                onChange={(e) => setMatchSearch(e.target.value)}
                className="w-full rounded-xl bg-gray-900 px-4 py-2.5 pr-10 text-xs text-white placeholder-gray-500 border border-white/5 focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-650/30"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-550 pointer-events-none" />
              {matchSearch && (
                <button
                  onClick={() => setMatchSearch("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {filteredMatches.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/5 text-xs text-slate-500 font-bold bg-[#121215]">
              هیچ برنامه مسابقاتی یا نتایج اخیری برای این لیگ ثبت نشده است.
            </div>
          ) : searchedMatches.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/5 text-xs text-slate-500 font-bold bg-[#121215]">
              هیچ مسابقه‌ای با نام تیم وارد شده یافت نشد.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {searchedMatches.map((match) => (
                <div 
                  key={match.id} 
                  className="relative group cursor-pointer hover:scale-[1.01] transition-all duration-200"
                  onClick={() => onSelectMatch?.(match)}
                >
                  <div className="rounded-xl border border-white/5 bg-gray-900 overflow-hidden relative shadow hover:border-red-500/20">
                    
                    {/* Small Match Subheader Banner */}
                    <div className="flex justify-between items-center text-[10px] text-gray-500 bg-black/25 px-3 py-1 bg-slate-950/40 border-b border-white/[0.02]">
                      <span className="font-mono">{match.date}</span>
                      <span className={`font-bold ${config.textAccent}`}>{config.title}</span>
                    </div>

                    <div className="p-4 space-y-3.5">
                      
                      {/* Home team */}
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl shrink-0">{match.teamHomeLogo || "⚽"}</span>
                          <span className="text-xs text-slate-100 font-semibold">{match.teamHome}</span>
                        </div>
                        {match.status !== "not-started" ? (
                          <span className="text-sm font-mono font-black text-white shrink-0 bg-black/40 px-2.5 py-0.5 rounded">
                            {match.scoreHome}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-500 shrink-0 select-none">VS</span>
                        )}
                      </div>

                      {/* Away team */}
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl shrink-0">{match.teamAwayLogo || "⚽"}</span>
                          <span className="text-xs text-slate-100 font-semibold">{match.teamAway}</span>
                        </div>
                        {match.status !== "not-started" && (
                          <span className="text-sm font-mono font-black text-white shrink-0 bg-black/40 px-2.5 py-0.5 rounded">
                            {match.scoreAway}
                          </span>
                        )}
                      </div>

                      {/* Status / venue bar */}
                      <div className="flex justify-between items-center pt-3 border-t border-white/5 text-[10px] text-gray-400">
                        <span>مکان: {match.venue}</span>
                        {match.status === "live" ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            زنده - دقیقه {match.minutes}
                          </span>
                        ) : match.status === "finished" ? (
                          <span className="text-gray-500 font-bold bg-gray-950/50 px-2 py-0.5 rounded">پایان یافته</span>
                        ) : (
                          <span className="text-amber-400 font-bold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">{match.time}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2.3 TAB - INDIVIDUAL STATISTICS */}
      {subTab === "stats" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Scorers leadercard */}
          <div className="rounded-2xl bg-gray-900 p-4 border border-white/5 shadow space-y-3">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
              <Flame className="h-5 w-5 text-red-500 animate-pulse" />
              <h3 className="font-black text-sm text-white">گلزنان برتر (آقای گل)</h3>
            </div>
            <div className="space-y-2.5 font-bold">
              {!leagueStats.scorers || leagueStats.scorers.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-6">جدول گلزنان به‌زودی اضافه می‌شود.</p>
              ) : (
                leagueStats.scorers.map((p, idx) => {
                  const matchingPlayer = players.find(x => x.name === p.name || x.name?.includes(p.name));
                  return (
                    <div
                      key={`${p.name}-${idx}`}
                      onClick={() => matchingPlayer && onSelectPlayer && onSelectPlayer(matchingPlayer.id)}
                      className={`flex justify-between items-center text-xs text-gray-300 border-b border-white/5 pb-2 last:border-0 last:pb-0 ${matchingPlayer ? "cursor-pointer hover:bg-white/[0.01]" : "cursor-default"} rounded`}
                    >
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="text-gray-550 font-mono text-[10px]">{idx + 1}.</span>
                        <span className={matchingPlayer ? "hover:text-amber-450 text-white" : ""}>{p.name}</span>
                        <span className="text-[10px] text-gray-500">({p.team})</span>
                      </span>
                      <span className="font-mono font-black text-red-500 bg-gray-950 border border-white/5 px-2.5 py-0.5 rounded text-[11px] shrink-0">
                        {p.goals} گل
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Assists leadercard */}
          <div className="rounded-2xl bg-gray-900 p-4 border border-white/5 shadow space-y-3">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
              <Zap className="h-5 w-5 text-sky-400" />
              <h3 className="font-black text-sm text-white">مهندسان پاسِ گل</h3>
            </div>
            <div className="space-y-2.5 font-bold">
              {!leagueStats.assists || leagueStats.assists.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-6">جدول پاس‌گلها به‌زودی آماده می‌شود.</p>
              ) : (
                leagueStats.assists.map((p, idx) => {
                  const matchingPlayer = players.find(x => x.name === p.name || x.name?.includes(p.name));
                  return (
                    <div
                      key={`${p.name}-${idx}`}
                      onClick={() => matchingPlayer && onSelectPlayer && onSelectPlayer(matchingPlayer.id)}
                      className={`flex justify-between items-center text-xs text-gray-300 border-b border-white/5 pb-2 last:border-0 last:pb-0 ${matchingPlayer ? "cursor-pointer hover:bg-white/[0.01]" : "cursor-default"} rounded`}
                    >
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="text-gray-550 font-mono text-[10px]">{idx + 1}.</span>
                        <span className={matchingPlayer ? "hover:text-sky-405 text-white" : ""}>{p.name}</span>
                        <span className="text-[10px] text-gray-500">({p.team})</span>
                      </span>
                      <span className="font-mono font-black text-sky-400 bg-gray-950 border border-white/5 px-2.5 py-0.5 rounded text-[11px] shrink-0">
                        {p.assists} پاس
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cleansheets leadercard */}
          <div className="rounded-2xl bg-gray-900 p-4 border border-white/5 shadow space-y-3">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
              <Award className="h-5 w-5 text-amber-500" />
              <h3 className="font-black text-sm text-white">دستکش طلایی (کلین‌شیت دروازه‌بان)</h3>
            </div>
            <div className="space-y-2.5 font-bold">
              {!leagueStats.cleansheets || leagueStats.cleansheets.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-6">جدول کلین‌شیت‌ها آماده به رندر نیست.</p>
              ) : (
                leagueStats.cleansheets.map((p, idx) => {
                  const matchingPlayer = players.find(x => x.name === p.name || x.name?.includes(p.name));
                  return (
                    <div
                      key={`${p.name}-${idx}`}
                      onClick={() => matchingPlayer && onSelectPlayer && onSelectPlayer(matchingPlayer.id)}
                      className={`flex justify-between items-center text-xs text-gray-300 border-b border-white/5 pb-2 last:border-0 last:pb-0 ${matchingPlayer ? "cursor-pointer hover:bg-white/[0.01]" : "cursor-default"} rounded`}
                    >
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="text-gray-550 font-mono text-[10px]">{idx + 1}.</span>
                        <span className={matchingPlayer ? "hover:text-[#fff] text-white" : ""}>{p.name}</span>
                        <span className="text-[10px] text-gray-500">({p.team})</span>
                      </span>
                      <span className="font-mono font-black text-amber-550 bg-gray-950 border border-white/5 px-2.5 py-0.5 rounded text-[11px] shrink-0">
                        {p.cleanSheets} کلین‌شیت
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* 2.4 TAB - DEDICATED NEWS */}
      {subTab === "news" && (
        <div>
          {filteredNews.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/5 text-xs text-slate-500 font-bold bg-gray-900">
              هیچ مقاله، تحلیل فنی یا شایعه خبری داغ مرتبط با این لیگ یافت نگردید.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNews.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectNews && onSelectNews(item)}
                  className={`group rounded-2xl border border-white/5 bg-gray-900 overflow-hidden hover:border-emerald-500/20 transition shadow cursor-pointer flex flex-col justify-between`}
                >
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition duration-500 group-hover:scale-104"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1 bg-black/5">
                      <h4 className={`font-black text-xs ${config.textAccent} flex items-center gap-1`}>
                        <span># {config.badge.split(" ").slice(-1)[0]} داغ</span>
                      </h4>
                      <h3 className="font-black text-sm text-slate-100 group-hover:text-emerald-450 group-hover:text-emerald-400 transition leading-snug text-justify line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-gray-400 leading-relaxed text-indigo-120 text-justify line-clamp-2">
                        {item.summary}
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-extrabold block text-left">← مطالعه خبر و آمار مینیاتوری</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
