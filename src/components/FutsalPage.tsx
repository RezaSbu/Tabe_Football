import React, { useState } from "react";
import { MatchItem, StandingRow, NewsItem, TeamItem, PlayerItem } from "../types";
import { Trophy, Calendar, Users, Newspaper, Award, Star, Zap, Flame, BarChart3, Shuffle, ChevronLeft, Search, X } from "lucide-react";
import MatchCard from "./MatchCard";

interface FutsalPageProps {
  standings: Record<string, StandingRow[]>;
  news: NewsItem[];
  matches: MatchItem[];
  teams: TeamItem[];
  players: PlayerItem[];
  stats?: Record<string, any>;
  onSelectNews: (art: NewsItem) => void;
  onSelectTeam: (teamId: string) => void;
  onSelectPlayer: (playerId: string) => void;
  onSelectMatch?: (match: MatchItem) => void;
  historicalData?: any;
  archives?: any[];
  currentSeason?: string;
}

export default function FutsalPage({
  standings,
  news,
  matches,
  teams,
  players,
  stats,
  onSelectNews,
  onSelectTeam,
  onSelectPlayer,
  onSelectMatch,
  historicalData,
  archives = [],
  currentSeason = "1404"
}: FutsalPageProps) {
  const [subTab, setSubTab] = useState<"standings" | "matches" | "stats" | "news">("standings");
  const [selectedSeason, setSelectedSeason] = useState<string>(currentSeason);
  const [matchSearch, setMatchSearch] = useState<string>("");

  React.useEffect(() => {
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
      filtered = archives.filter(a => a.type === "standings" && a.data && a.data.futsal);
    } else if (subTab === "stats") {
      filtered = archives.filter(a => a.type === "stats" && a.data && a.data.futsal);
    }
    const tags = filtered.map(a => a.season_tag);
    return Array.from(new Set(tags));
  };

  const getDeduplicatedSeasons = (): string[] => {
    const dynamicTags = getAvailableArchiveSeasons();
    const staticTags = Object.keys((historicalData as any)?.[ "futsal" ] || {}).filter(s => s !== currentSeason);
    return Array.from(new Set([...dynamicTags, ...staticTags])).sort((a, b) => b.localeCompare(a));
  };

  const isCurrentSeason = selectedSeason === currentSeason;

  // Filter entities specifically for Futsal
  const getActiveStandings = (): StandingRow[] => {
    if (isCurrentSeason) {
      return standings["futsal"] || [];
    }
    const standingArchive = archives?.find(a => a.type === "standings" && a.season_tag === selectedSeason);
    if (standingArchive && standingArchive.data && standingArchive.data["futsal"]) {
      return standingArchive.data["futsal"];
    }
    const historicalSource = (historicalData as any)?.[ "futsal" ] || {};
    return historicalSource[selectedSeason] || [];
  };

  const futsalStandings = getActiveStandings();
  const futsalTeams = teams.filter(t => t.id.startsWith("futsal-"));
  const futsalPlayers = players.filter(p => p.id.startsWith("futsal-"));

  const getActiveMatches = (): MatchItem[] => {
    if (isCurrentSeason) {
      return matches.filter(m => m.league === "futsal" && m.status !== "archived");
    }
    const seasonArchives = archives?.filter(a => a.season_tag === selectedSeason) || [];
    const allMatches: MatchItem[] = [];
    const seenIds = new Set<string>();

    // 1. Try to fetch from dedicated matches archive first!
    const dedicatedMatchesArc = seasonArchives.find(a => a.type === "matches");
    if (dedicatedMatchesArc && dedicatedMatchesArc.data && Array.isArray(dedicatedMatchesArc.data)) {
      const matchesInArc = dedicatedMatchesArc.data.filter((m: any) => m.league === "futsal");
      for (const m of matchesInArc) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          allMatches.push(m);
        }
      }
    }

    // 2. Fallback: Search nested matches inside older archives for legacy support
    for (const arc of seasonArchives) {
      if (arc.data && arc.data.matches && Array.isArray(arc.data.matches)) {
        const matchesInArc = arc.data.matches.filter((m: any) => m.league === "futsal");
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

  const futsalMatches = getActiveMatches();
  const searchedMatches = futsalMatches.filter(m => 
    m.teamHome?.toLowerCase().includes(matchSearch.toLowerCase()) || 
    m.teamAway?.toLowerCase().includes(matchSearch.toLowerCase())
  );
  const futsalNews = news.filter(n => n.category === "futsal" || n.tags?.includes("فوتسال"));

  const getActiveStats = () => {
    const defaultStats = { scorers: [], assists: [], cleansheets: [], ratings: [] };
    if (isCurrentSeason) {
      return stats && stats["futsal"] ? stats["futsal"] : defaultStats;
    }
    const seasonArchives = archives?.filter(a => a.season_tag === selectedSeason) || [];
    for (const arc of seasonArchives) {
      if (arc.data && arc.data["futsal"]) {
        const d = arc.data["futsal"];
        if (d.scorers || d.assists || d.cleansheets || d.ratings) {
          return d;
        }
      }
    }
    return defaultStats;
  };

  const futsalStatsTable = getActiveStats();

  // Sorting stats for Futsal leaderboards
  const futsalTopScorers = futsalStatsTable && futsalStatsTable.scorers && futsalStatsTable.scorers.length > 0
    ? futsalStatsTable.scorers.slice(0, 5).map((p: any) => {
        const matchingPlayer = players.find(x => x.name === p.name || x.name?.includes(p.name));
        return {
          id: matchingPlayer?.id || `futsal-scorer-${p.name}`,
          name: p.name,
          teamName: p.team,
          goals: p.goals
        };
      })
    : isCurrentSeason
      ? [...futsalPlayers]
          .sort((a, b) => (b.seasonStats.goals || 0) - (a.seasonStats.goals || 0))
          .slice(0, 5).map(p => ({
            id: p.id,
            name: p.name,
            teamName: p.teamName,
            goals: p.seasonStats.goals || 0
          }))
      : [];

  const futsalTopAssists = futsalStatsTable && futsalStatsTable.assists && futsalStatsTable.assists.length > 0
    ? futsalStatsTable.assists.slice(0, 5).map((p: any) => {
        const matchingPlayer = players.find(x => x.name === p.name || x.name?.includes(p.name));
        return {
          id: matchingPlayer?.id || `futsal-assist-${p.name}`,
          name: p.name,
          teamName: p.team,
          assists: p.assists
        };
      })
    : isCurrentSeason
      ? [...futsalPlayers]
          .sort((a, b) => (b.seasonStats.assists || 0) - (a.seasonStats.assists || 0))
          .slice(0, 5).map(p => ({
            id: p.id,
            name: p.name,
            teamName: p.teamName,
            assists: p.seasonStats.assists || 0
          }))
      : [];

  const futsalTopGoalkeepers = futsalStatsTable && futsalStatsTable.cleansheets && futsalStatsTable.cleansheets.length > 0
    ? futsalStatsTable.cleansheets.slice(0, 5).map((p: any) => {
        const matchingPlayer = players.find(x => x.name === p.name || x.name?.includes(p.name));
        return {
          id: matchingPlayer?.id || `futsal-gk-${p.name}`,
          name: p.name,
          teamName: p.team,
          cleanSheets: p.cleanSheets || p.cleansheets || 0
        };
      })
    : isCurrentSeason
      ? [...futsalPlayers]
          .filter(p => p.position.includes("دروازه"))
          .sort((a, b) => (b.seasonStats.cleanSheets || 0) - (a.seasonStats.cleanSheets || 0))
          .slice(0, 5).map(p => ({
            id: p.id,
            name: p.name,
            teamName: p.teamName,
            cleanSheets: p.seasonStats.cleanSheets || 0
          }))
      : [];

  // Top Players by Average Rating
  const futsalTopRatings = futsalStatsTable && futsalStatsTable.ratings && futsalStatsTable.ratings.length > 0
    ? futsalStatsTable.ratings.slice(0, 5).map((p: any) => {
        const matchingPlayer = players.find(x => x.name === p.name || x.name?.includes(p.name));
        return {
          id: matchingPlayer?.id || `futsal-rating-${p.name}`,
          name: p.name,
          teamName: p.team,
          averageRating: p.rating
        };
      })
    : isCurrentSeason
      ? [...futsalPlayers]
          .filter(p => p.averageRating !== undefined)
          .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
          .slice(0, 5)
      : [];

  return (
    <div className="space-y-6 animate-in fade-in" dir="rtl">
      {/* 1. Header Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-l from-[#221010]/30 via-gray-900 to-gray-900 p-5 border border-white/5 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-[10px] font-black text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              مسابقات فوتسال کشور کشوری
            </span>
            <h2 className="font-extrabold text-2xl text-white flex items-center gap-2 mt-1.5">
              <Trophy className="h-6 w-6 text-red-500" />
              لیگ برتر فوتسال ایران
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              بالاترین دپارتمان رسمی فوتسال حرفه‌ای ایران، میزبان ۱۴ مدعی با کلاس قهرمانی فوتبال تحت سالن آسیا
            </p>

            {/* Season Selector */}
            {(subTab === "standings" || subTab === "stats" || subTab === "matches") && (
              <div className="flex items-center gap-2 mt-3 bg-slate-950/50 border border-white/5 rounded-xl px-3 py-1.5 w-fit text-xs text-slate-300">
                <span className="text-gray-400 font-bold">فصل رقابت‌ها:</span>
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

          <div className="flex bg-[#121215] p-1 rounded-xl border border-white/5 text-xs font-bold gap-1">
            <button
              onClick={() => setSubTab("standings")}
              className={`rounded-lg px-4 py-1.5 transition ${
                subTab === "standings" ? "bg-red-555 bg-red-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              جدول رده‌بندی
            </button>
            <button
              onClick={() => setSubTab("matches")}
              className={`rounded-lg px-4 py-1.5 transition ${
                subTab === "matches" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              برنامه و نتایج
            </button>
            <button
              onClick={() => setSubTab("stats")}
              className={`rounded-lg px-4 py-1.5 transition ${
                subTab === "stats" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              آمار انفرادی
            </button>
            <button
              onClick={() => setSubTab("news")}
              className={`rounded-lg px-4 py-1.5 transition ${
                subTab === "news" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              اخبار اختصاصی
            </button>
          </div>
        </div>
      </div>

      {/* 2. Content Sections based on selected Subtab */}
      {subTab === "standings" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Standings Table (12/12) */}
          <div className="lg:col-span-12 bg-gray-900 border border-white/5 rounded-2xl p-4 shadow overflow-x-auto">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-3 mb-4">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h3 className="font-black text-sm text-white">
                جدول {isCurrentSeason ? "زنده" : "آرشیوی"} لیگ برتر فوتسال {isCurrentSeason ? "(۱۴۰۴-۱۴۰۵)" : `(فصل ${toPersianDigits(selectedSeason)})`}
              </h3>
            </div>

            <table className="w-full text-right text-xs">
              <thead>
                <tr className="text-gray-450 border-b border-white/5 font-semibold">
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
                {futsalStandings.map((row, i) => {
                  const correlatedTeam = futsalTeams.find(t => t.name === row.team);
                  const isTopTeam = i < 1;
                  const isBottomTeam = i >= 12;

                  return (
                    <tr
                      key={row.team}
                      onClick={() => correlatedTeam && onSelectTeam(correlatedTeam.id)}
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
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-slate-100 flex items-center gap-2">
                        <span className="text-base">{correlatedTeam?.logo || "🔴"}</span>
                        <span>{row.team}</span>
                      </td>
                      <td className="py-3 text-center font-mono text-slate-300">{row.played}</td>
                      <td className="py-3 text-center font-mono text-slate-400">{row.won}</td>
                      <td className="py-3 text-center font-mono text-slate-400">{row.drawn}</td>
                      <td className="py-3 text-center font-mono text-slate-400">{row.lost}</td>
                      <td className="py-3 text-center font-mono text-slate-400">{row.goalsFor} - {row.goalsAgainst}</td>
                      <td className={`py-3 text-center font-mono font-bold ${row.goalDifference > 0 ? "text-emerald-450 text-emerald-400" : row.goalDifference < 0 ? "text-red-400" : "text-gray-400"}`}>
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </td>
                      <td className="py-3 text-center font-mono font-black text-white bg-slate-950/20">{row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Program & Matches Tab */}
      {subTab === "matches" && (
        <div className="space-y-4">
          {futsalMatches.length > 0 && (
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="جستجوی مسابقه فوتسال با نام تیم..."
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

          {futsalMatches.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/5 text-xs text-slate-500 font-bold">
              هیچ برنامه مسابقاتی تاکنون برای فوتسال تعریف نشده است.
            </div>
          ) : searchedMatches.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/5 text-xs text-slate-500 font-bold">
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
                    {/* Tiny metadata header */}
                    <div className="flex justify-between items-center text-[10px] text-gray-500 bg-black/25 px-3 py-1 bg-slate-950/40">
                      <span className="font-mono">{match.date}</span>
                      <span className="font-bold text-red-400">لیگ برتر فوتسال</span>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Teams & Scores */}
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl shrink-0">{match.teamHomeLogo}</span>
                          <span className="text-xs text-slate-100 font-semibold">{match.teamHome}</span>
                        </div>
                        {match.status !== "not-started" ? (
                          <span className="text-sm font-mono font-black text-white shrink-0 bg-black/40 px-2 py-0.5 rounded">
                            {match.scoreHome}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-500 shrink-0 select-none">VS</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl shrink-0">{match.teamAwayLogo}</span>
                          <span className="text-xs text-slate-100 font-semibold">{match.teamAway}</span>
                        </div>
                        {match.status !== "not-started" && (
                          <span className="text-sm font-mono font-black text-white shrink-0 bg-black/40 px-2 py-0.5 rounded">
                            {match.scoreAway}
                          </span>
                        )}
                      </div>

                      {/* Status row */}
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

      {/* Individual Statistics Tab */}
      {subTab === "stats" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Top Scorer Card */}
          <div className="rounded-2xl bg-gray-900 p-4 border border-white/5 shadow space-y-3">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
              <Flame className="h-5 w-5 text-red-500 animate-pulse" />
              <h3 className="font-black text-sm text-white">گلزنان برتر (آقای گل)</h3>
            </div>
            <div className="space-y-2.5 font-bold">
              {futsalTopScorers.map((p: any, idx: number) => (
                <div
                  key={p.id}
                  onClick={() => p.id && onSelectPlayer(p.id)}
                  className="flex justify-between items-center text-xs text-gray-300 border-b border-white/5 pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-white/[0.01] rounded"
                >
                  <span className="font-bold flex items-center gap-1.5">
                    <span className="text-gray-550 font-mono text-[10px]">{idx + 1}.</span>
                    <span>{p.name}</span>
                    <span className="text-[10px] text-gray-500 font-normal">({p.teamName})</span>
                  </span>
                  <span className="font-mono font-black text-red-500 bg-gray-950 border border-white/5 px-2.5 py-0.5 rounded text-[11px] shrink-0">
                    {p.goals !== undefined ? p.goals : 0} گل
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Assists Card */}
          <div className="rounded-2xl bg-gray-900 p-4 border border-white/5 shadow space-y-3">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
              <Zap className="h-5 w-5 text-sky-400" />
              <h3 className="font-black text-sm text-white">مهندسان پاسِ گل</h3>
            </div>
            <div className="space-y-2.5 font-bold">
              {futsalTopAssists.map((p: any, idx: number) => (
                <div
                  key={p.id}
                  onClick={() => p.id && onSelectPlayer(p.id)}
                  className="flex justify-between items-center text-xs text-gray-300 border-b border-white/5 pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-white/[0.01] rounded"
                >
                  <span className="font-bold flex items-center gap-1.5">
                    <span className="text-gray-550 font-mono text-[10px]">{idx + 1}.</span>
                    <span>{p.name}</span>
                    <span className="text-[10px] text-gray-500 font-normal">({p.teamName})</span>
                  </span>
                  <span className="font-mono font-black text-sky-400 bg-gray-950 border border-white/5 px-2.5 py-0.5 rounded text-[11px] shrink-0">
                    {p.assists !== undefined ? p.assists : 0} پاس
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Goalkeepers (Clean sheets) Card */}
          <div className="rounded-2xl bg-gray-900 p-4 border border-white/5 shadow space-y-3">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
              <Award className="h-5 w-5 text-amber-500" />
              <h3 className="font-black text-sm text-white">دستکش طلایی (کلین‌شیت دروازه‌بان)</h3>
            </div>
            <div className="space-y-2.5 font-bold">
              {futsalTopGoalkeepers.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-4 font-normal">آماری ثبت نشده است.</p>
              ) : (
                futsalTopGoalkeepers.map((p: any, idx: number) => (
                  <div
                    key={p.id}
                    onClick={() => p.id && onSelectPlayer(p.id)}
                    className="flex justify-between items-center text-xs text-gray-300 border-b border-white/5 pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-white/[0.01] rounded"
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <span className="text-gray-550 font-mono text-[10px]">{idx + 1}.</span>
                      <span>{p.name}</span>
                      <span className="text-[10px] text-gray-500 font-normal">({p.teamName})</span>
                    </span>
                    <span className="font-mono font-black text-amber-550 bg-gray-950 border border-white/5 px-2.5 py-0.5 rounded text-[11px] shrink-0">
                      {p.cleanSheets !== undefined ? p.cleanSheets : 0} کلین‌شیت
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dedicated News Tab */}
      {subTab === "news" && (
        <div>
          {futsalNews.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/5 text-xs text-slate-500 font-bold bg-gray-900">
              هیچ مقاله یا شایعه خبری اختصاصی فوتسال تا این لحظه یافت نگردید.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {futsalNews.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectNews(item)}
                  className="group rounded-2xl border border-white/5 bg-gray-900 overflow-hidden hover:border-red-500/30 transition shadow cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                    <img loading="lazy" decoding="async" 
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition duration-500 group-hover:scale-104"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h4 className="font-black text-xs text-red-400 flex items-center gap-1">
                        <span># فوتسال برتر</span>
                      </h4>
                      <h3 className="font-black text-sm text-slate-100 group-hover:text-red-400 transition leading-snug text-justify">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-gray-400 leading-relaxed text-justify line-clamp-2">
                        {item.summary}
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-extrabold block text-left">← مطالعه خبر و آنالیز داغ</span>
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
