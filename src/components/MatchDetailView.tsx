import React, { useState } from "react";
import { 
  ArrowLeft, Calendar, MapPin, Clock, Award, Shield, 
  AlertCircle, Sparkles, ChevronLeft, Info, Trophy, Users, TrendingUp 
} from "lucide-react";
import { MatchItem, PlayerItem } from "../types";
import { getSafeImageUrl, convertGregorianToShamsi, toPersianDigits } from "../utils";
import TeamLogo from "./TeamLogo";

interface MatchDetailViewProps {
  match: any;
  allMatches?: any[];
  allTeams?: any[];
  players?: any[];
  onBack: () => void;
  onSelectPlayer?: (playerId: string) => void;
}

export default function MatchDetailView({ 
  match, 
  allMatches = [], 
  allTeams = [], 
  players = [], 
  onBack, 
  onSelectPlayer 
}: MatchDetailViewProps) {
  
  const [activeTab, setActiveTab] = useState<"timeline" | "stats" | "h2h">("timeline");
  const isPlayed = match.status === "live" || match.status === "finished";

  // --- 1. DYNAMIC DATA NORMALIZATION & FALLBACKS ---
  const defaultTimeline = (match.timeline || match.events?.map((ev: any) => {
    const p1 = ev.playerName || "";
    const p2 = ev.player2Name || ev.assistPlayerName || "";
    const details = ev.details || "";
    let desc: string;
    
    switch (ev.type) {
      case "goal":
        desc = `⚽ گل توسط ${p1}${p2 ? ` (پاس گل: ${p2})` : ""}${details ? ` — ${details}` : ""}`;
        break;
      case "assist":
        desc = `👟 پاس گل توسط ${p1}${p2 ? ` برای ${p2}` : ""}${details ? ` — ${details}` : ""}`;
        break;
      case "penalty":
        desc = `🥅 گل پنالتی توسط ${p1}${details ? ` — ${details}` : ""}`;
        break;
      case "missed-penalty":
        desc = `❌ پنالتی از دست رفته توسط ${p1}${details ? ` — ${details}` : ""}`;
        break;
      case "yellow-card":
        desc = `🟨 کارت زرد برای ${p1}${details ? ` — ${details}` : ""}`;
        break;
      case "red-card":
        desc = `🟥 کارت قرمز برای ${p1}${details ? ` — ${details}` : ""}`;
        break;
      case "substitution":
        desc = `🔁 تعویض: خروج ${p1} / ورود ${p2 || "بازیکن جدید"}${details ? ` — ${details}` : ""}`;
        break;
      case "injury":
        desc = `🩹 مصدومیت ${p1}${details ? ` — ${details}` : ""}`;
        break;
      case "var":
        desc = `📺 تصمیم VAR ${p1 ? `برای ${p1}` : ""}${details ? ` — ${details}` : ""}`;
        break;
      case "other":
        desc = `💬 ${details || "رویداد بازی"}${p1 ? ` (${p1})` : ""}`;
        break;
      default:
        desc = `${p1} — ${details || ev.type}`;
        break;
    }

    return {
      minute: ev.minute,
      type: ev.type,
      description: desc,
      team: ev.team === "home" || ev.team === "away" 
        ? ev.team 
        : (ev.teamId === match.teamHomeId ? "home" : "away")
    };
  })) || [];

  const getNumericMinute = (m: any) => {
    if (typeof m === "number") return m;
    const s = String(m || "0").trim();
    if (s.includes("+")) {
      const parts = s.split("+");
      return (parseFloat(parts[0]) || 0) + (parseFloat(parts[1]) || 0);
    }
    return parseFloat(s) || 0;
  };

  // Force sorting of events by minute ascending
  const sortedTimeline = [...defaultTimeline].sort((a, b) => getNumericMinute(a.minute) - getNumericMinute(b.minute));

  // Normalize stats comparisons
  const teamStatsObj = match.teamStats || {};
  const statsObj = match.stats || {};
  const normalizeStats = () => {
    const raw: { label: string; homeValue: string | number; awayValue: string | number }[] = [];
    
    const isUnknown = (val: any) => {
      return val === null || val === undefined || val === -1 || val === "-1" || val === "نامشخص" || val === "undefined";
    };

    // Resolve possession
    const pH = teamStatsObj.possession?.home ?? statsObj.possessionHome;
    const pA = teamStatsObj.possession?.away ?? statsObj.possessionAway;
    if (pH != null && pA != null && !isUnknown(pH) && !isUnknown(pA)) {
      raw.push({ label: "مالکیت توپ", homeValue: `${pH}%`, awayValue: `${pA}%` });
    }

    // Resolve expectedGoals
    const xgH = teamStatsObj.expectedGoals?.home;
    const xgA = teamStatsObj.expectedGoals?.away;
    if (xgH != null && xgA != null && !isUnknown(xgH) && !isUnknown(xgA)) {
      raw.push({ label: "امید به گل (xG)", homeValue: xgH, awayValue: xgA });
    }

    // Resolve shots
    const sH = teamStatsObj.shots?.home ?? statsObj.shotsHome;
    const sA = teamStatsObj.shots?.away ?? statsObj.shotsAway;
    if (sH != null && sA != null && !isUnknown(sH) && !isUnknown(sA)) {
      raw.push({ label: "شوت مجموع", homeValue: sH, awayValue: sA });
    }

    // Resolve shotsOnTarget
    const sotH = teamStatsObj.shotsOnTarget?.home ?? statsObj.shotsOnTargetHome;
    const sotA = teamStatsObj.shotsOnTarget?.away ?? statsObj.shotsOnTargetAway;
    if (sotH != null && sotA != null && !isUnknown(sotH) && !isUnknown(sotA)) {
      raw.push({ label: "شوت داخل چارچوب", homeValue: sotH, awayValue: sotA });
    }

    // Resolve passes
    const psH = teamStatsObj.passes?.home;
    const psA = teamStatsObj.passes?.away;
    if (psH != null && psA != null && !isUnknown(psH) && !isUnknown(psA)) {
      raw.push({ label: "پاس‌های ردوبدل شده", homeValue: psH, awayValue: psA });
    }

    // Resolve accuracy
    const accH = teamStatsObj.passAccuracy?.home;
    const accA = teamStatsObj.passAccuracy?.away;
    if (accH != null && accA != null && !isUnknown(accH) && !isUnknown(accA)) {
      raw.push({ label: "دقت پاس", homeValue: `${accH}%`, awayValue: `${accA}%` });
    }

    // Resolve corners
    const cH = teamStatsObj.corners?.home ?? statsObj.cornersHome;
    const cA = teamStatsObj.corners?.away ?? statsObj.cornersAway;
    if (cH != null && cA != null && !isUnknown(cH) && !isUnknown(cA)) {
      raw.push({ label: "ضربات کرنر", homeValue: cH, awayValue: cA });
    }

    // Resolve saves
    const svH = teamStatsObj.saves?.home;
    const svA = teamStatsObj.saves?.away;
    if (svH != null && svA != null && !isUnknown(svH) && !isUnknown(svA)) {
      raw.push({ label: "مهارها (سیو)", homeValue: svH, awayValue: svA });
    }

    // Resolve fouls
    const fH = teamStatsObj.fouls?.home ?? statsObj.foulsHome;
    const fA = teamStatsObj.fouls?.away ?? statsObj.foulsAway;
    if (fH != null && fA != null && !isUnknown(fH) && !isUnknown(fA)) {
      raw.push({ label: "خطاها", homeValue: fH, awayValue: fA });
    }

    return raw;
  };
  const defaultStats = normalizeStats();

  const defaultLineups = match.lineups || {
    home: [
      { id: "player-1", name: "پیمان حیدری", number: 1, position: "دروازه‌بان", rating: 7.9 },
      { id: "player-2", name: "حسین حیدری", number: 30, position: "مدافع", rating: 8.5, goals: 1 },
      { id: "player-3", name: "میلاد ابراهیمی", number: 39, position: "مدافع", rating: 7.4 },
      { id: "player-6", name: "محمد حیدری", number: 65, position: "هافبک", rating: 7.8 },
      { id: "player-7", name: "سامان صادقی", number: 87, position: "هافبک", rating: 8.2, assists: 1 },
      { id: "player-8", name: "علی احمدی", number: 93, position: "مهاجم", rating: 8.9, goals: 1 }
    ],
    away: [
      { id: "player-12", name: "احمد حیدری", number: 1, position: "دروازه‌بان", rating: 8.2 },
      { id: "player-16", name: "جواد حیدری", number: 92, position: "مدافع", rating: 6.9 },
      { id: "player-18", name: "سامان رحیمی", number: 89, position: "هافبک", rating: 7.5 },
      { id: "player-20", name: "علی عباسی", number: 44, position: "هافبک", rating: 9.0, goals: 1 },
      { id: "player-21", name: "امیر حسینی", number: 11, position: "مهاجم", rating: 7.3 }
    ]
  };

  // --- 2. HEAD TO HEAD (H2H) DYNAMIC MATCH ANALYTICS ---
  const h2hMatches = allMatches.filter(m => 
    m.status === "finished" && 
    ((m.teamHome === match.teamHome && m.teamAway === match.teamAway) || 
     (m.teamHome === match.teamAway && m.teamAway === match.teamHome)) &&
    m.id !== match.id
  );

  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let totalGoals = 0;

  h2hMatches.forEach(m => {
    const isHomePrimary = m.teamHome === match.teamHome;
    const hS = m.scoreHome ?? 0;
    const aS = m.scoreAway ?? 0;
    totalGoals += (hS + aS);

    if (hS === aS) {
      draws++;
    } else if (hS > aS) {
      if (isHomePrimary) homeWins++; else awayWins++;
    } else {
      if (isHomePrimary) awayWins++; else homeWins++;
    }
  });

  const totalEncounters = h2hMatches.length;

  const getPitchPositions = (lineupList: any[], isHomeSide: boolean) => {
    const gks = lineupList.filter(p => p.position.includes("دروازه‌بان"));
    const defs = lineupList.filter(p => p.position.includes("مدافع"));
    const mids = lineupList.filter(p => p.position.includes("هافبک") || p.position.includes("وینگر") || p.position.includes("طراح"));
    const fwds = lineupList.filter(p => p.position.includes("مهاجم") || p.position.includes("هدف"));
    
    return { gks, defs, mids, fwds };
  };

  const homePitch = getPitchPositions(defaultLineups.home, true);
  const awayPitch = getPitchPositions(defaultLineups.away, false);

  return (
    <div className="rounded-2xl bg-[#121215] border border-white/5 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300 relative text-white" dir="rtl">
      
      {/* Cover Banner Graphic Area */}
      <div className="relative h-44 sm:h-52 w-full bg-[#18181c] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c1917]/25 via-black/50 to-[#121215] z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06),transparent_80%)]" />
        
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2 bg-black/55 hover:bg-black/85 rounded-xl text-xs font-extrabold text-slate-300 border border-white/10 shadow-md active:scale-95 transition"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>بازگشت به برنامه مسابقات</span>
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-4 z-25 px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-3 py-1 rounded text-[11px] font-black">
            {match.league === "pro-league" 
              ? "لیگ برتر خلیج فارس" 
              : match.league === "hazfi-cup" 
              ? "جام حذفی فوتبال" 
              : match.league === "league-1"
              ? "لیگ آزادگان"
              : "لیگ فوتبال کشور"}
          </span>
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-350">
            <Calendar className="h-4 w-4 text-emerald-400" />
            <span>{convertGregorianToShamsi(match.date)} ساعت {toPersianDigits(match.time)}</span>
          </div>
        </div>
      </div>

      {/* Main Scoreboard */}
      <div className="p-6 bg-black/15 border-b border-white/5">
        <div className="grid grid-cols-7 items-center justify-center my-4 max-w-3xl mx-auto">
          <div className="col-span-2 flex flex-col items-center text-center gap-2">
            <div className="h-16 sm:h-20 w-16 sm:w-20 text-4xl sm:text-5xl flex items-center justify-center rounded-2xl bg-black/40 border-2 border-emerald-500/20 shadow-md">
              <TeamLogo logo={match.teamHomeLogo} fallback="🔴" size="lg" />
            </div>
            <h4 className="font-black text-sm sm:text-lg text-slate-50 truncate max-w-full">{match.teamHome}</h4>
          </div>

          <div className="col-span-3 flex flex-col items-center justify-center text-center">
            {match.status === "live" ? (
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-950 text-red-450 border border-red-500/35 px-3 py-1 text-[10px] font-black animate-pulse">
                  ● زنده دقیقه {toPersianDigits(match.minutes || "۶۵")}'
                </span>
                <div className="text-3xl sm:text-5xl font-mono font-black text-white tracking-widest leading-none">
                  {toPersianDigits(match.scoreHome)} - {toPersianDigits(match.scoreAway)}
                </div>
              </div>
            ) : match.status === "finished" ? (
              <div className="space-y-1.5">
                <span className="rounded bg-gray-900 border border-white/5 text-slate-400 px-2.5 py-0.5 text-[10px] font-extrabold select-none">
                  پایان‌یافته
                </span>
                <div className="text-3xl sm:text-5xl font-mono font-black text-slate-100 tracking-widest leading-none">
                  {toPersianDigits(match.scoreHome)} - {toPersianDigits(match.scoreAway)}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className="rounded bg-emerald-950/80 text-emerald-400 border border-emerald-900/35 px-3 py-1 text-[10px] font-bold">
                  برنامه‌ریزی شده
                </span>
                <div className="text-2xl sm:text-4xl font-black text-slate-450 select-none tracking-widest">
                  VS
                </div>
              </div>
            )}

            {match.venue && (
              <div className="mt-3 flex items-center justify-center gap-1 text-[10px] sm:text-xs text-slate-400 font-bold bg-[#18181c] px-3 py-1 rounded-full border border-white/5">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                <span>ورزشگاه: {match.venue}</span>
              </div>
            )}
          </div>

          <div className="col-span-2 flex flex-col items-center text-center gap-2">
            <div className="h-16 sm:h-20 w-16 sm:w-20 text-4xl sm:text-5xl flex items-center justify-center rounded-2xl bg-black/40 border-2 border-emerald-500/20 shadow-md">
              <TeamLogo logo={match.teamAwayLogo} fallback="🔵" size="lg" />
            </div>
            <h4 className="font-black text-sm sm:text-lg text-slate-50 truncate max-w-full">{match.teamAway}</h4>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#101012] border-b border-white/5 overflow-x-auto text-xs sm:text-sm font-black select-none px-4 scrollbar-thin">
        {[
          { id: "timeline", label: "گزارش و وقایع" },
          { id: "stats", label: "آمار دقیق بازی" },
          { id: "h2h", label: "مقایسه رودررو (H2H)" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[125px] py-4 text-center transition border-b-2 font-extrabold cursor-pointer ${
              activeTab === tab.id
                ? "border-emerald-500 text-emerald-400 bg-emerald-500/[0.02]"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6 max-w-4xl mx-auto min-h-[350px]">
        
        {/* TAB 1: TIMELINE */}
        {activeTab === "timeline" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {!isPlayed ? (
              <div className="p-8 text-center text-slate-400 bg-black/15 border border-white/5 border-dashed rounded-2xl max-w-md mx-auto space-y-3">
                <Clock className="h-10 w-10 text-emerald-400 mx-auto animate-pulse" />
                <h4 className="font-extrabold text-sm text-white">این مسابقه هنوز آغاز نشده است</h4>
                <p className="text-xs text-slate-400">گزارش لحظه‌به‌لحظه وقایع، کارت‌ها و گل‌های بازی بلافاصله پس از شروع مسابقه در این قسمت نمایش خواهد یافت.</p>
              </div>
            ) : sortedTimeline.length > 0 ? (
              sortedTimeline.map((item, idx) => (
                <div key={idx} className="flex gap-4 relative">
                  {idx < sortedTimeline.length - 1 && (
                    <div className="absolute right-3.5 top-8 bottom-[-20px] w-0.5 bg-white/5" />
                  )}
                  
                  <div className="h-7 w-7 rounded-lg bg-[#1c1c21] border border-white/10 flex items-center justify-center font-mono font-black text-[10px] text-emerald-450 text-emerald-400 shrink-0 select-none shadow">
                    {toPersianDigits(item.minute)}'
                  </div>

                  <div className="p-4 rounded-xl bg-black/15 border border-white/5 flex-1 flex flex-col justify-center gap-1.5 hover:border-white/10 transition">
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-bold text-xs sm:text-sm text-slate-100">{item.description}</span>
                      {item.type === "goal" && <span className="text-base select-none">⚽</span>}
                      {item.type === "yellow-card" && <span className="h-4 w-3 rounded-sm bg-yellow-500 shrink-0 inline-block rotate-3 shadow-inner" />}
                      {item.type === "red-card" && <span className="h-4 w-3 rounded-sm bg-red-500 shrink-0 inline-block rotate-3 shadow-inner" />}
                      {item.type === "sub" && <span className="text-xs select-none">🔄</span>}
                    </div>
                    <span className="text-[10px] text-emerald-400/70 font-semibold">
                      ثبت شده برای: {item.team === "home" ? match.teamHome : match.teamAway}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 bg-black/15 border border-white/5 border-dashed rounded-2xl max-w-md mx-auto space-y-3">
                <AlertCircle className="h-10 w-10 text-slate-500 mx-auto" />
                <h4 className="font-extrabold text-sm text-white">رویدادی برای این مسابقه ثبت نشده است</h4>
                <p className="text-xs text-slate-400">گزارش زنده یا وقایع بازی (کارت‌ها، گل‌ها، تعویض‌ها) در این مسابقه وارد نشده است.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STATS */}
        {activeTab === "stats" && (
          <div className="space-y-5 max-w-xl mx-auto animate-in fade-in duration-200">
            {!isPlayed ? (
              <div className="p-8 text-center text-slate-400 bg-black/15 border border-white/5 border-dashed rounded-2xl max-w-md mx-auto space-y-3">
                 <TrendingUp className="h-10 w-10 text-amber-500 mx-auto" strokeWidth={1.5} />
                 <h4 className="font-extrabold text-sm text-white">آمار بازی پس از شروع فرستاده می‌شود</h4>
                 <p className="text-xs text-slate-400">مالکیت توپ، جزئیات شوت‌ها، دقت پاس و امید به گل پس از سوت آغاز بازی بصورت اتوماتیک استخراج می‌گردند.</p>
              </div>
            ) : defaultStats.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-black/15 border border-white/5 border-dashed rounded-2xl max-w-md mx-auto space-y-3">
                 <TrendingUp className="h-10 w-10 text-slate-500 mx-auto" strokeWidth={1.5} />
                 <h4 className="font-extrabold text-sm text-white">آماری برای این مسابقه ثبت نشده است</h4>
                 <p className="text-xs text-slate-400">اطلاعات آماری تفصیلی (شوت، مالکیت، کرنر و...) برای این مسابقه در سیستم وارد نشده است.</p>
              </div>
            ) : defaultStats.map((stat, idx) => {
              const parseVal = (v: any) => parseFloat(String(v).replace("%", "")) || 0;
              const homeValue = parseVal(stat.homeValue);
              const awayValue = parseVal(stat.awayValue);
              const totalVal = homeValue + awayValue || 1;
              const homePercentage = (homeValue / totalVal) * 100;

              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-extrabold font-mono text-emerald-400">{toPersianDigits(stat.homeValue)}</span>
                    <span className="text-slate-400 font-bold">{stat.label}</span>
                    <span className="font-extrabold font-mono text-cyan-400">{toPersianDigits(stat.awayValue)}</span>
                  </div>
                  
                  <div className="h-2 rounded-full bg-[#18181c] overflow-hidden flex border border-white/5">
                    <div 
                      style={{ width: `${homePercentage}%` }}
                      className="bg-emerald-500 h-full transition-all duration-300" 
                    />
                    <div className="flex-1 bg-cyan-500 h-full transition-all duration-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: H2H */}
        {activeTab === "h2h" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="font-black text-base text-white border-r-4 border-emerald-500 pr-2">تاریخچه رویارویی‌های مستقیم این دو تیم (H2H)</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">بردهای {match.teamHome}</span>
                <span className="text-2xl font-mono font-black text-emerald-400">{toPersianDigits(homeWins)} برد</span>
                <span className="text-[9px] text-slate-550 block">در بازی‌های پیشین</span>
              </div>

              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">تساوی‌ها</span>
                <span className="text-2xl font-mono font-black text-slate-350">{toPersianDigits(draws)} مساوی</span>
                <span className="text-[9px] text-slate-550 block">رقابت پایاپای</span>
              </div>

              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">بردهای {match.teamAway}</span>
                <span className="text-2xl font-mono font-black text-cyan-400">{toPersianDigits(awayWins)} برد</span>
                <span className="text-[9px] text-slate-550 block">در بازی‌های پیشین</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-300 flex items-center gap-1.5 pt-2">
                <Trophy className="h-4.5 w-4.5 text-amber-500" />
                <span>فهرست رقابت‌های رودرروی ثبت‌شده اخیراً ({toPersianDigits(totalEncounters)} مسابقه)</span>
              </h4>

              {h2hMatches.length > 0 ? (
                <div className="grid gap-2.5">
                  {h2hMatches.map((m) => (
                    <div 
                      key={m.id} 
                      className="p-3.5 rounded-xl bg-[#161619]/60 border border-white/5 flex items-center justify-between text-xs hover:border-white/10 transition"
                    >
                      <div className="space-y-1">
                          <span className="text-slate-100 font-bold flex items-center gap-2 flex-wrap">
                            <TeamLogo logo={m.teamHomeLogo} fallback="⚽" size="sm" />
                            <span>{m.teamHome}</span>
                            <span className="text-[10px] text-slate-500 font-medium font-mono">در برابر</span>
                            <TeamLogo logo={m.teamAwayLogo} fallback="⚽" size="sm" />
                            <span>{m.teamAway}</span>
                          </span>
                        <span className="font-mono text-[9px] text-slate-500 block">
                          {convertGregorianToShamsi(m.date)} | ساعت {toPersianDigits(m.time)}
                        </span>
                      </div>

                      <span className="font-mono font-black text-xs bg-black/30 px-3 py-1 rounded-lg border border-white/5 text-slate-50 select-none">
                        {toPersianDigits(m.scoreHome)} - {toPersianDigits(m.scoreAway)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center text-xs text-slate-500 border border-dashed border-white/5 bg-black/10 rounded-xl">
                  تیم‌ها پیش از این مسابقه رویارویی رسمیِ نزدیکی در بانک داده نداشته‌اند.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <div className="p-4 bg-[#0c0c0e] border-t border-white/5 text-center text-[11px] text-gray-500 font-bold select-none flex items-center justify-center gap-1.5">
        <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
        <span>داده‌ها و گزارشات مسابقات به‌طور بومی و بر اساس آخرین آمار فدراسیونی با موتور تب فوتبال همسان‌سازی گشته‌اند.</span>
      </div>
    </div>
  );
}
