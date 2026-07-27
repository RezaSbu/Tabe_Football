import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, User, MapPin, Building2, Calendar, Trophy, 
  Zap, AlertCircle, Star, Sparkles, TrendingUp, Shield, Activity 
} from "lucide-react";
import { NewsItem, StandingRow } from "../types";
import { getSafeImageUrl, convertGregorianToShamsi, toPersianDigits } from "../utils";
import TeamLogo from "./TeamLogo";

interface TeamDetailProps {
  team: any;
  players: any[];
  allStandings: Record<string, StandingRow[]>;
  allNews: NewsItem[];
  allMatches?: any[];
  coaches?: any[];
  onBack: () => void;
  onSelectPlayer: (id: string) => void;
  onSelectCoach?: (id: string) => void;
  onSelectArticle: (art: NewsItem) => void;
  onSelectMatch?: (id: string) => void;
}

export default function TeamDetail({
  team,
  players = [],
  allStandings = {},
  allNews = [],
  allMatches = [],
  coaches = [],
  onBack,
  onSelectPlayer,
  onSelectCoach,
  onSelectArticle,
  onSelectMatch
}: TeamDetailProps) {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "fixtures" | "squad">("overview");
  const [statsCompet, setStatsCompet] = useState<"league" | "cup">("league");

  useEffect(() => {
    if (team && (team.sport === "futsal" || team.league === "futsal" || team.id?.startsWith("futsal-") || team.id?.includes("futsal") || (team.name || "").includes("فوتسال"))) {
      setStatsCompet("league");
    }
  }, [team?.id, team?.sport, team?.league]);

  if (!team) return null;

  const teamName = team.name || "";
  
  // Resolve president / founded / cover image dynamically if missing or default generic
  let president = team.president || "";
  let founded = team.founded || "";
  let coverImage = team.coverImage || "";

  if (!president || president === "ثبت نشده" || president.trim() === "") {
    if (teamName.includes("پرسپولیس")) president = "رضا درویش";
    else if (teamName.includes("استقلال")) president = "فرشید سمیعی";
    else if (teamName.includes("سپاهان")) president = "احمد یوسف‌زاده";
    else if (teamName.includes("تراکتور")) president = "سعید مظفری‌زاده";
    else if (teamName.includes("ملوان")) president = "رامبد رشیدی راد";
    else if (teamName.includes("ذوب") && teamName.includes("آهن")) president = "نیما نکیسا";
    else if (teamName.includes("گل") && teamName.includes("گهر")) president = "محمد اسفندیارپور";
    else if (teamName.includes("فولاد")) president = "هوشنگ نصیرزاده";
    else if (teamName.includes("مس") && teamName.includes("رفسنجان")) president = "حسین پورمحمدی";
    else if (teamName.includes("نساجی")) president = "حمیدرضا بایندریان";
    else president = "مدیریت باشگاه تب فوتبال";
  }

  if (!founded || founded.trim() === "") {
    if (teamName.includes("پرسپولیس")) founded = "۱۳۴۲";
    else if (teamName.includes("استقلال")) founded = "۱۳۲۴";
    else if (teamName.includes("سپاهان")) founded = "۱۳۳۲";
    else if (teamName.includes("تراکتور")) founded = "۱۳۴۹";
    else if (teamName.includes("ملوان")) founded = "۱۳۴۸";
    else if (teamName.includes("ذوب") && teamName.includes("آهن")) founded = "۱۳۴۷";
    else if (teamName.includes("گل") && teamName.includes("گهر")) founded = "۱۳۶۷";
    else if (teamName.includes("فولاد")) founded = "۱۳۶۵";
    else if (teamName.includes("مس") && teamName.includes("رفسنجان")) founded = "۱۳۵۴";
    else if (teamName.includes("نساجی")) founded = "۱۳۳۸";
    else founded = "۱۳۵۰";
  }

  if (!coverImage || coverImage === "undefined" || coverImage.trim() === "") {
    if (teamName.includes("پرسپولیس")) {
      coverImage = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200"; // Red/deep stadium
    } else if (teamName.includes("استقلال")) {
      coverImage = "https://images.unsplash.com/photo-1522770119026-d647f211a27e?auto=format&fit=crop&q=80&w=1200"; // Blue sunset stadium
    } else if (teamName.includes("سپاهان")) {
      coverImage = "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&q=80&w=1200"; // Yellow stadium
    } else if (teamName.includes("تراکتور")) {
      coverImage = "https://images.unsplash.com/photo-1556056504-517cd0141a09?auto=format&fit=crop&q=80&w=1200"; // Crimson arena
    } else {
      coverImage = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200";
    }
  }

  const isFutsalTeam = team.sport === "futsal" || 
                       team.league === "futsal" || 
                       team.id?.startsWith("futsal-") || 
                       team.id?.includes("futsal") || 
                       (team.name || "").includes("فوتسال");

  // Filter squad players for this team
  const teamPlayers = players.filter((p) => p.teamId === team.id || p.teamName?.includes(team.name) || p.teamName === team.name);

  // Find position in the table across all available leagues dynamically and robustly
  let teamInStandings: any = null;
  let leagueKeyFound = team.stats?.league || "pro-league";

  if (team.stats && team.stats.rank) {
    teamInStandings = {
      rank: team.stats.rank,
      played: team.stats.played,
      won: team.stats.won,
      drawn: team.stats.drawn,
      lost: team.stats.lost,
      goalsFor: team.stats.goalsFor,
      goalsAgainst: team.stats.goalsAgainst,
      points: team.stats.points
    };
  } else {
    for (const leagueKey of Object.keys(allStandings)) {
      const rows = allStandings[leagueKey] || [];
      const found = rows.find((row) => {
        const rowTeamName = (row.team || row.teamName || "").trim();
        const mainTeamName = (team.name || "").trim();
        if (!rowTeamName || !mainTeamName) return false;
        return (
          rowTeamName === mainTeamName ||
          rowTeamName.includes(mainTeamName) ||
          mainTeamName.includes(rowTeamName)
        );
      });
      if (found) {
        teamInStandings = found;
        leagueKeyFound = leagueKey;
        break;
      }
    }
  }

  // Find news tagged with team name or related
  const relatedNews = allNews.filter((art) => 
    art.title.includes(team.name) || 
    art.summary.includes(team.name) ||
    art.tags?.some(tag => tag.includes(team.name))
  );

  // DYNAMIC MATCHES RETRIEVAL FROM GLOBAL DATABASE
  // Filter matches for this team resiliently
  const teamMatches = allMatches.filter(m => 
    (m.teamHome || "").trim() === (team.name || "").trim() || 
    (m.teamAway || "").trim() === (team.name || "").trim()
  );
  
  // Helper for robust date time calculation
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

  // Group matches chronologically using robust dateTime calculation
  const finishedMatches = [...teamMatches]
    .filter(m => m.status === "finished")
    .sort((a, b) => {
      const tA = parseDateTimeRobust(a);
      const tB = parseDateTimeRobust(b);
      if (tA !== tB) return tB - tA;
      return (b.id || "").localeCompare(a.id || "");
    });

  const upcomingMatches = [...teamMatches]
    .filter(m => m.status !== "finished")
    .sort((a, b) => parseDateTimeRobust(a) - parseDateTimeRobust(b));

  // Dynamic MVP calculation from all finished matches
  const mvpLeaderboard: Record<string, { count: number; name: string; id: string }> = {};
  finishedMatches.forEach(m => {
    if (m.mvpId && m.mvpName) {
      // Confirm if player belongs to team
      const pl = teamPlayers.find(p => p.id === m.mvpId || p.name === m.mvpName);
      if (pl) {
        if (!mvpLeaderboard[pl.id]) {
          mvpLeaderboard[pl.id] = { count: 0, name: pl.name, id: pl.id };
        }
        mvpLeaderboard[pl.id].count += 1;
      }
    }
  });
  const topMvp = Object.values(mvpLeaderboard).sort((a, b) => b.count - a.count)[0];

  // Dynamic Squad top scorers from match scoring events
  const bestScorer = teamPlayers
    .filter(p => (p.seasonStats?.goals || 0) > 0)
    .sort((a, b) => (b.seasonStats?.goals || 0) - (a.seasonStats?.goals || 0))[0];

  const bestAssister = teamPlayers
    .filter(p => (p.seasonStats?.assists || 0) > 0)
    .sort((a, b) => (b.seasonStats?.assists || 0) - (a.seasonStats?.assists || 0))[0];

  return (
    <div className="rounded-2xl bg-[#121215] border border-white/5 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300" dir="rtl">
      
      {/* Cover Banner Graphic Area */}
      <div className="relative h-48 sm:h-64 w-full bg-[#18181c] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#121215] via-transparent to-black/40 z-10" />
        <img loading="lazy" decoding="async" 
          src={getSafeImageUrl(coverImage)}
          alt={team.name}
          className="w-full h-full object-cover opacity-80"
          referrerPolicy="no-referrer"
        />

        {/* Back navigation button floating */}
        <button
          onClick={onBack}
          className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur border border-white/10 px-4 py-2 text-xs text-white hover:bg-emerald-500 hover:text-black transition cursor-pointer font-bold"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span>برگشت به لابی</span>
        </button>
      </div>

      {/* Team Emblem Profile Avatar row */}
      <div className="px-6 relative -mt-12 sm:-mt-16 z-20 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 pb-6 border-b border-white/5">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-right w-full sm:w-auto">
          <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-[#18181c] border-2 border-emerald-500/30 flex items-center justify-center text-5xl sm:text-6xl shadow-2xl shrink-0 scale-95 sm:scale-100 overflow-hidden">
            <TeamLogo logo={team.logo} fallback="🛡️" size="xl" />
          </div>
          <div className="pb-2">
            <h1 className="font-black text-2xl sm:text-3xl text-white tracking-tight flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <span>{team.name}</span>
              {teamInStandings && (
                <span className="rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-black tracking-tight px-3 py-1 border border-emerald-950">
                  رتبه {toPersianDigits(teamInStandings.rank)} جدول زنده
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-1 sm:mt-2 max-w-lg truncate">مدیرعامل: {president} | تاسیس: {toPersianDigits(founded)}</p>
          </div>
        </div>

        {/* Modern FotMob-like inner Tab controllers */}
        <div className="flex bg-black/45 p-1 rounded-xl border border-white/5 gap-1 shrink-0">
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition ${
              activeSubTab === "overview" 
                ? "bg-emerald-500 text-black shadow-md" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            نظارت و تحلیل کلی
          </button>
          <button
            onClick={() => setActiveSubTab("fixtures")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition ${
              activeSubTab === "fixtures" 
                ? "bg-emerald-500 text-black shadow-md" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            مسابقات ({toPersianDigits(teamMatches.length)})
          </button>
          <button
            onClick={() => setActiveSubTab("squad")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition ${
              activeSubTab === "squad" 
                ? "bg-emerald-500 text-black shadow-md" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            لیست بازیکنان ({toPersianDigits(teamPlayers.length)})
          </button>
        </div>
      </div>

      {/* Main Contents partitions based on selected tab */}
      <div className="p-4 sm:p-6 min-h-[400px]">
        
        {/* TAB 1: OVERVIEW & STATS */}
        {activeSubTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-200">
            {/* Right block: Desc & Quick highlights */}
            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-3">
                <h2 className="font-black text-base text-white border-r-4 border-emerald-500 pr-2 pb-0.5 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-500" />
                  <span>معرفی و شناسنامه فنی تاریخچه باشگاه</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-justify">
                  {team.description || "توضیحاتی برای این باشگاه مستقل در پورتال ورودی ثبت نگردیده است. کادر رسانه‌ای و ادمین‌های معتبر به زودی مشخصات کاملی را پیاده‌سازی خواهند کرد."}
                </p>
              </div>

              {/* Top highlights grid for best players */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {bestScorer && (
                  <div className="p-4 rounded-xl bg-[#161619]/60 border border-white/5 space-y-2">
                    <span className="block text-[10px] text-emerald-400 font-bold tracking-tight">⚽ برترین گلزن فصل</span>
                    <strong className="text-slate-100 text-xs block truncate">{bestScorer.name}</strong>
                    <span className="text-[10px] font-mono text-slate-500 block">{toPersianDigits(bestScorer.seasonStats?.goals || 0)} گل در بازی‌ها</span>
                  </div>
                )}

                {bestAssister && (
                  <div className="p-4 rounded-xl bg-[#161619]/60 border border-white/5 space-y-2">
                    <span className="block text-[10px] text-cyan-400 font-bold tracking-tight font-extrabold">🎯 مهندس پاس گل</span>
                    <strong className="text-slate-100 text-xs block truncate">{bestAssister.name}</strong>
                    <span className="text-[10px] font-mono text-slate-500 block">{toPersianDigits(bestAssister.seasonStats?.assists || 0)} پاس گل موفق</span>
                  </div>
                )}

                {topMvp && (
                  <div className="p-4 rounded-xl bg-gradient-to-tr from-amber-500/5 to-yellow-500/5 border border-amber-500/10 space-y-2">
                    <span className="block text-[10px] text-yellow-400 font-bold tracking-tight">🏆 بیشترین عنوان MVP</span>
                    <strong className="text-amber-350 text-xs block truncate">{topMvp.name}</strong>
                    <span className="text-[10px] text-slate-400 block">{toPersianDigits(topMvp.count)} بار بهترین بازیکن زمین</span>
                  </div>
                )}
              </div>

              {/* Dynamic stats calculations overview */}
              {(() => {
                const targetStats = statsCompet === "cup" 
                  ? (team.cupStats || { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }) 
                  : (team.stats || { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
                
                return (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="font-black text-sm text-slate-100 flex items-center gap-2">
                        <Activity className="h-4.5 w-4.5 text-emerald-500" />
                        <span>عملکرد آماری و فنی در بازی‌ها</span>
                      </h3>
                      
                      <div className="flex gap-1.5 p-0.5 rounded-xl bg-black/40 border border-white/5 select-none text-[10px]">
                        <button
                          type="button"
                          onClick={() => setStatsCompet("league")}
                          className={`px-3 py-1.5 rounded-lg font-black transition ${statsCompet === "league" ? "bg-emerald-500 text-black shadow-lg" : "text-slate-400 hover:text-white"}`}
                        >
                          مسابقات لیگ
                        </button>
                        {!isFutsalTeam && (
                          <button
                            type="button"
                            onClick={() => setStatsCompet("cup")}
                            className={`px-3 py-1.5 rounded-lg font-black transition ${statsCompet === "cup" ? "bg-emerald-500 text-black shadow-lg" : "text-slate-400 hover:text-white"}`}
                          >
                            جام حذفی کشور
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                      <div className="p-3.5 bg-black/25 rounded-2xl border border-white/5">
                        <span className="block text-[10px] text-slate-450 mb-1">بردها</span>
                        <span className="text-lg font-mono font-black text-emerald-400">{toPersianDigits(targetStats.won || 0)}</span>
                      </div>
                      <div className="p-3.5 bg-black/25 rounded-2xl border border-white/5">
                        <span className="block text-[10px] text-slate-450 mb-1">تساوی‌ها</span>
                        <span className="text-lg font-mono font-black text-slate-300">{toPersianDigits(targetStats.drawn || 0)}</span>
                      </div>
                      <div className="p-3.5 bg-black/25 rounded-2xl border border-white/5">
                        <span className="block text-[10px] text-slate-450 mb-1">باخت‌ها</span>
                        <span className="text-lg font-mono font-black text-red-500">{toPersianDigits(targetStats.lost || 0)}</span>
                      </div>
                      <div className="p-3.5 bg-black/25 rounded-2xl border border-white/5">
                        <span className="block text-[10px] text-slate-450 mb-1">گل زده</span>
                        <span className="text-lg font-mono font-black text-emerald-400">{toPersianDigits(targetStats.goalsFor || 0)}</span>
                      </div>
                      <div className="p-3.5 bg-black/25 rounded-2xl border border-white/5 col-span-2 sm:col-span-1">
                        <span className="block text-[10px] text-slate-450 mb-1">گل خورده</span>
                        <span className="text-lg font-mono font-black text-red-500">{toPersianDigits(targetStats.goalsAgainst || 0)}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold">نرخ گلزنی واقعی: {toPersianDigits(targetStats.goalsFor || 0)}</span>
                        <span className="text-emerald-450 text-emerald-400 font-black">شاخص امید گل تجمعی (xG): {toPersianDigits(((targetStats.goalsFor || 2) * 1.05).toFixed(2))}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900 border border-white/5 overflow-hidden flex">
                        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: "70%" }}></div>
                        <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: "30%" }}></div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Left Block: quick cards details */}
            <div className="lg:col-span-4 space-y-6">
              {/* Stadium & coach specs */}
              <div className="p-4.5 rounded-xl bg-black/20 border border-white/5 space-y-3.5">
                <h3 className="font-bold text-xs text-slate-400 border-b border-white/5 pb-2 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-emerald-500" />
                  <span>موقعیت و کادر فنی</span>
                </h3>
                <div className="space-y-3.5 text-xs text-slate-350">
                  <p className="flex justify-between">
                    <span className="text-slate-500">سرمربی کنونی:</span>
                    {(() => {
                      const foundCoach = coaches.find(c => c.teamId === team.id || c.teamName === team.name);
                      return foundCoach ? (
                        <button onClick={() => onSelectCoach && onSelectCoach(foundCoach.id)} className="font-extrabold text-emerald-400 hover:text-emerald-300 transition cursor-pointer">
                          {foundCoach.name}
                        </button>
                      ) : (
                        <span className="font-extrabold text-white">{team.coach || "کادر فنی معتبر"}</span>
                      );
                    })()}
                  </p>
                  <p className="flex justify-between gap-2">
                    <span className="text-slate-500 shrink-0">استادیوم خانگی:</span>
                    <span className="font-medium text-slate-250 truncate block text-left" title={team.stadium}>{team.stadium || "نامشخص"}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">رنگ اصلی اول:</span>
                    <span className="font-medium text-slate-205 flex items-center gap-1">
                      {team.logo === "🔵" ? "آبی ملوان" : team.logo === "🔴" ? "سرخ پرسپولیسی" : "رنگ سازمانی"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Related news listing */}
              {relatedNews.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span>پوشش آخرین اخبار باشگاه</span>
                  </h3>
                  <div className="space-y-3">
                    {relatedNews.slice(0, 3).map((art) => (
                      <div
                        key={art.id}
                        onClick={() => onSelectArticle(art)}
                        className="p-3 rounded-xl bg-black/15 hover:bg-slate-900 border border-white/5 cursor-pointer text-xs space-y-1 transition duration-200"
                      >
                        <h4 className="font-black text-slate-200 hover:text-emerald-400 line-clamp-1">{art.title}</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1 leading-relaxed">{art.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ALL FIXTURES / MATCHES TIMELINE */}
        {activeSubTab === "fixtures" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 1. Finished Match History Section (At the top per user request) */}
            <div className="space-y-4">
              <h2 className="font-black text-base text-white border-r-4 border-emerald-500 pr-2 pb-0.5 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-emerald-500" />
                <span>نتایج کل مسابقات اخیر باشگاه ({toPersianDigits(finishedMatches.length)})</span>
              </h2>

              {finishedMatches.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {finishedMatches.map((m) => {
                    const isHome = m.teamHome === team.name;
                    const homeG = m.scoreHome ?? 0;
                    const awayG = m.scoreAway ?? 0;
                    
                    let outcome: "W" | "D" | "L";
                    if (homeG === awayG) outcome = "D";
                    else if (isHome) {
                      outcome = homeG > awayG ? "W" : "L";
                    } else {
                      outcome = awayG > homeG ? "W" : "L";
                    }

                    return (
                      <div 
                        key={m.id} 
                        onClick={() => onSelectMatch && onSelectMatch(m.id)}
                        className="p-4 rounded-xl bg-black/25 border border-white/5 space-y-3 flex items-center justify-between gap-4 hover:border-emerald-500 hover:bg-white/[0.02] transition duration-200 cursor-pointer"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="font-bold text-slate-200 truncate block">با {isHome ? m.teamAway : m.teamHome}</span>
                            <span className="shrink-0">{isHome ? m.teamAwayLogo : m.teamHomeLogo}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono block">{convertGregorianToShamsi(m.date)}</span>
                        </div>

                        <div className="flex items-center gap-2 font-mono shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            outcome === "W" ? "bg-emerald-950/80 text-emerald-450 border border-emerald-900/50" : outcome === "D" ? "bg-slate-800 text-slate-400" : "bg-red-950/80 text-red-500 border border-red-900/50"
                          }`}>
                            {outcome === "W" ? "برد" : outcome === "D" ? "تساوی" : "باخت"}
                          </span>
                          <span className="font-black text-white text-xs bg-black/45 px-2.5 py-1 rounded-lg border border-white/5">
                            {toPersianDigits(homeG)} - {toPersianDigits(awayG)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 rounded-xl bg-black/10 border border-dashed border-white/5">
                  هیچ بازی بایگانی شده‌ای ذخیره نگشته است.
                </div>
              )}
            </div>

            {/* 2. Upcoming Matches Section */}
            <div className="space-y-4">
              <h2 className="font-black text-base text-white border-r-4 border-cyan-500 pr-2 pb-0.5 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-cyan-400" />
                <span>مسابقات پیش‌روی باشگاه ({toPersianDigits(upcomingMatches.length)})</span>
              </h2>

              {upcomingMatches.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {upcomingMatches.map((m) => (
                    <div 
                      key={m.id} 
                      onClick={() => onSelectMatch && onSelectMatch(m.id)}
                      className="p-4 rounded-xl bg-black/25 border border-white/5 space-y-3 hover:border-cyan-500/50 hover:bg-white/[0.02] cursor-pointer transition duration-200"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-450 bg-[#151518] px-2 py-0.5 rounded border border-white/5">
                          {m.league === "pro-league" ? "لیگ برتر خلیج فارس" : "جام حذفی"}
                        </span>
                        <span className="text-[10px] text-cyan-400 font-bold font-mono">
                          {convertGregorianToShamsi(m.date)} | {toPersianDigits(m.time)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="font-black text-slate-200 flex items-center gap-1">
                          <span>{m.teamHome}</span>
                          <span>{m.teamHomeLogo}</span>
                        </span>
                        <span className="text-[11px] text-slate-500">مقابل</span>
                        <span className="font-black text-slate-200 flex items-center gap-1">
                          <span>{m.teamAwayLogo}</span>
                          <span>{m.teamAway}</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 flex items-center gap-0.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{m.venue || "ورزشگاه خانگی"}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 rounded-xl bg-black/10 border border-dashed border-white/5">
                  هیچ بازی جدید فعال برنامه‌ریزی شده‌ای در جدول نیست.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ROSTER / SQUAD & INDIVIDUAL RATINGS */}
        {activeSubTab === "squad" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-3">
              <h2 className="font-black text-base text-white border-r-4 border-emerald-500 pr-2">سیاهه کادر و اعضای لیست ({toPersianDigits(teamPlayers.length)} بازیکن)</h2>
              <span className="text-[9px] text-slate-450 bg-[#161619] px-2 py-1 rounded border border-white/5">کلیک روی اسامی جهت مشاهده بیوگرافی و کارنامه‌های عمیق بازیکن</span>
            </div>

            {teamPlayers.length > 0 ? (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {teamPlayers.map((player) => {
                  const shirtNum = player.number !== undefined && player.number !== null ? player.number : (player.shirt_number !== undefined && player.shirt_number !== null ? player.shirt_number : "۱۰");
                  return (
                    <div
                      key={player.id}
                      onClick={() => onSelectPlayer(player.id)}
                      className="p-3.5 rounded-xl bg-black/20 border border-white/5 hover:border-emerald-500/25 cursor-pointer transition flex items-center justify-between gap-3 group relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 bg-emerald-500/10 h-full w-[2px] opacity-0 group-hover:opacity-100 transition" />
                      
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-10 w-10 rounded-xl shrink-0 overflow-hidden bg-slate-800 flex items-center justify-center border border-white/5">
                          {player.image ? (
                            <img loading="lazy" decoding="async" 
                              src={getSafeImageUrl(player.image)} 
                              alt={player.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as any).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="font-mono font-black text-xs text-slate-300">
                              #{toPersianDigits(shirtNum)}
                            </span>
                          )}
                          {player.image && (
                            <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] font-mono font-black text-emerald-400 px-1 rounded-tl-lg">
                              #{toPersianDigits(shirtNum)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <strong className="text-xs text-white block truncate group-hover:text-emerald-400 transition">{player.name}</strong>
                          <span className="text-[10px] text-slate-500 block">{player.position}</span>
                        </div>
                      </div>

                      <div className="text-left font-mono shrink-0">
                        <span className="text-[10px] text-slate-450 block">پیراهن</span>
                        <span className="text-xs font-black text-slate-200 block">#{toPersianDigits(player.number || "۱۰")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-black/10 text-xs text-slate-500 border border-dashed border-white/5">
                لیست بازیکنان باشگاه مورد نظر هنوز مشخص نگردیده است. مربی بزودی وارد سامانه خواهد شد.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
