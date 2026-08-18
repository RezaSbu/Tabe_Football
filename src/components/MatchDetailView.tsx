import React, { useState } from "react";
import { 
  ArrowLeft, Calendar, MapPin, Clock, Shield, 
  AlertCircle, Sparkles, Trophy, TrendingUp, ListOrdered, Shirt, GitCompareArrows, RefreshCw 
} from "lucide-react";
import { StandingRow } from "../types";
import { convertGregorianToShamsi, toPersianDigits, normalizePersianString } from "../utils";
import { minuteSortKey } from "../shared/matchMinute";
import TeamLogo from "./TeamLogo";
import FormationPitch from "./FormationPitch";

interface MatchDetailViewProps {
  match: any;
  allMatches?: any[];
  allTeams?: any[];
  players?: any[];
  standings?: Record<string, StandingRow[]>;
  onBack: () => void;
  onSelectPlayer?: (playerId: string) => void;
}

const EVENT_META: Record<string, { label: string; icon: string }> = {
  goal: { label: "گل", icon: "⚽" },
  penalty: { label: "گل پنالتی", icon: "🥅" },
  "own-goal": { label: "گل به خودی", icon: "🎯" },
  assist: { label: "پاس گل", icon: "👟" },
  "yellow-card": { label: "کارت زرد", icon: "🟨" },
  "red-card": { label: "کارت قرمز", icon: "🟥" },
  substitution: { label: "تعویض", icon: "🔄" },
  "missed-penalty": { label: "پنالتی از دست رفته", icon: "❌" },
  injury: { label: "مصدومیت", icon: "🩹" },
  var: { label: "بررسی VAR", icon: "📺" },
  other: { label: "رویداد", icon: "💬" },
};

const LEAGUE_NAMES: Record<string, string> = {
  "pro-league": "لیگ برتر خلیج فارس",
  "hazfi-cup": "جام حذفی فوتبال",
  "league-1": "لیگ آزادگان",
  "league-2": "لیگ دسته دوم",
  futsal: "لیگ برتر فوتسال",
};

export default function MatchDetailView({ 
  match, 
  allMatches = [], 
  allTeams = [], 
  players = [], 
  standings = {},
  onBack, 
  onSelectPlayer 
}: MatchDetailViewProps) {
  
  const [activeTab, setActiveTab] = useState<"timeline" | "stats" | "lineups" | "h2h">("timeline");
  const isPlayed = match.status === "live" || match.status === "finished";
  const isLive = match.status === "live";

  const leagueName = LEAGUE_NAMES[match.league] || (match.league ? match.league : "لیگ فوتبال کشور");

  // --- 1. DYNAMIC TIMELINE ---
  const describeEvent = (type: string, p1: string, p2: string, details: string): string => {
    switch (type) {
      case "goal":
        return `⚽ گل توسط ${p1}${p2 ? ` (پاس گل: ${p2})` : ""}${details ? ` — ${details}` : ""}`;
      case "assist":
        return `👟 پاس گل توسط ${p1}${p2 ? ` برای ${p2}` : ""}${details ? ` — ${details}` : ""}`;
      case "penalty":
        return `🥅 گل پنالتی توسط ${p1}${details ? ` — ${details}` : ""}`;
      case "own-goal":
        return `🎯 گل به خودی توسط ${p1}${details ? ` — ${details}` : ""}`;
      case "missed-penalty":
        return `❌ پنالتی از دست رفته توسط ${p1}${details ? ` — ${details}` : ""}`;
      case "yellow-card":
        return `🟨 کارت زرد برای ${p1}${details ? ` — ${details}` : ""}`;
      case "red-card":
        return `🟥 کارت قرمز برای ${p1}${details ? ` — ${details}` : ""}`;
      case "substitution":
        return `🔁 تعویض: خروج ${p1} / ورود ${p2 || "بازیکن جدید"}${details ? ` — ${details}` : ""}`;
      case "injury":
        return `🩹 مصدومیت ${p1}${details ? ` — ${details}` : ""}`;
      case "var":
        return `📺 تصمیم VAR ${p1 ? `برای ${p1}` : ""}${details ? ` — ${details}` : ""}`;
      case "other":
        return `💬 ${details || "رویداد بازی"}${p1 ? ` (${p1})` : ""}`;
      default:
        return `${p1} — ${details || type}`;
    }
  };

  const rawEvents = (match.events && match.events.length)
    ? match.events
    : ((match.timeline && match.timeline.length) ? match.timeline : []);

  const resolvePlayer = (name: string, _fallbackId?: string): string => {
    if (!name) return "";
    const nName = normalizePersianString(name);
    const found = players.find((p: any) => normalizePersianString(p.name || "") === nName);
    return found ? String(found.id) : "";
  };

  const defaultTimeline: any[] = rawEvents.map((ev: any) => {
    const p1 = ev.playerName || ev.player1 || "";
    const p2 = ev.player2Name || ev.assistPlayerName || ev.player2 || "";
    const details = ev.details || "";
    const type = ev.type || "other";
    const team = ev.team === "home" || ev.team === "away"
      ? ev.team
      : (ev.teamId === match.teamHomeId ? "home" : "away");
    const resolvedId1 = resolvePlayer(p1, ev.playerId);
    const resolvedId2 = resolvePlayer(p2, ev.player2Id);
    return {
      minute: ev.minute,
      type,
      team,
      description: ev.description || describeEvent(type, p1, p2, details),
      playerName: p1,
      playerId: resolvedId1,
      player2Name: p2,
      playerId2: resolvedId2,
      details,
    };
  });

  const sortedTimeline = [...defaultTimeline].sort((a, b) => minuteSortKey(a.minute) - minuteSortKey(b.minute));

  // --- 2. NORMALIZE STATS ---
  const teamStatsObj = match.teamStats || {};
  const statsObj = match.stats || {};
  const normalizeStats = () => {
    const raw: { label: string; homeValue: string | number; awayValue: string | number }[] = [];

    const isUnknown = (val: any) => {
      return val === null || val === undefined || val === -1 || val === "-1" || val === "نامشخص" || val === "undefined";
    };

    const pH = teamStatsObj.possession?.home ?? statsObj.possessionHome;
    const pA = teamStatsObj.possession?.away ?? statsObj.possessionAway;
    if (pH != null && pA != null && !isUnknown(pH) && !isUnknown(pA)) {
      raw.push({ label: "مالکیت توپ", homeValue: `${pH}%`, awayValue: `${pA}%` });
    }

    const xgH = teamStatsObj.expectedGoals?.home;
    const xgA = teamStatsObj.expectedGoals?.away;
    if (xgH != null && xgA != null && !isUnknown(xgH) && !isUnknown(xgA)) {
      raw.push({ label: "امید به گل (xG)", homeValue: xgH, awayValue: xgA });
    }

    const sH = teamStatsObj.shots?.home ?? statsObj.shotsHome;
    const sA = teamStatsObj.shots?.away ?? statsObj.shotsAway;
    if (sH != null && sA != null && !isUnknown(sH) && !isUnknown(sA)) {
      raw.push({ label: "شوت مجموع", homeValue: sH, awayValue: sA });
    }

    const sotH = teamStatsObj.shotsOnTarget?.home ?? statsObj.shotsOnTargetHome;
    const sotA = teamStatsObj.shotsOnTarget?.away ?? statsObj.shotsOnTargetAway;
    if (sotH != null && sotA != null && !isUnknown(sotH) && !isUnknown(sotA)) {
      raw.push({ label: "شوت داخل چارچوب", homeValue: sotH, awayValue: sotA });
    }

    const psH = teamStatsObj.passes?.home;
    const psA = teamStatsObj.passes?.away;
    if (psH != null && psA != null && !isUnknown(psH) && !isUnknown(psA)) {
      raw.push({ label: "پاس‌های ردوبدل شده", homeValue: psH, awayValue: psA });
    }

    const accH = teamStatsObj.passAccuracy?.home;
    const accA = teamStatsObj.passAccuracy?.away;
    if (accH != null && accA != null && !isUnknown(accH) && !isUnknown(accA)) {
      raw.push({ label: "دقت پاس", homeValue: `${accH}%`, awayValue: `${accA}%` });
    }

    const cH = teamStatsObj.corners?.home ?? statsObj.cornersHome;
    const cA = teamStatsObj.corners?.away ?? statsObj.cornersAway;
    if (cH != null && cA != null && !isUnknown(cH) && !isUnknown(cA)) {
      raw.push({ label: "ضربات کرنر", homeValue: cH, awayValue: cA });
    }

    const svH = teamStatsObj.saves?.home;
    const svA = teamStatsObj.saves?.away;
    if (svH != null && svA != null && !isUnknown(svH) && !isUnknown(svA)) {
      raw.push({ label: "مهارها (سیو)", homeValue: svH, awayValue: svA });
    }

    const fH = teamStatsObj.fouls?.home ?? statsObj.foulsHome;
    const fA = teamStatsObj.fouls?.away ?? statsObj.foulsAway;
    if (fH != null && fA != null && !isUnknown(fH) && !isUnknown(fA)) {
      raw.push({ label: "خطاها", homeValue: fH, awayValue: fA });
    }

    return raw;
  };
  const defaultStats = normalizeStats();

  // --- 3. LINEUPS ---
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

  const homeLineup = defaultLineups.home || [];
  const awayLineup = defaultLineups.away || [];
  const homeSubs = defaultLineups.homeSubs || [];
  const awaySubs = defaultLineups.awaySubs || [];
  const homeFormation = defaultLineups.homeFormation || "";
  const awayFormation = defaultLineups.awayFormation || "";

  // --- 4. HEAD TO HEAD ---
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

  // --- 5. LIVE STANDINGS RANK LOOKUP (varzesh3-style "رتبه در جدول") ---
  const getTeamRank = (teamName: string, teamId?: string): { rank: number; total: number } | null => {
    if (!teamName) return null;
    for (const key of Object.keys(standings)) {
      const rows = standings[key] || [];
      const idx = rows.findIndex((row: any) =>
        String(row.id) === String(teamId) ||
        normalizePersianString((row.team || row.teamName || "").trim()) === normalizePersianString(String(teamName).trim())
      );
      if (idx >= 0) return { rank: idx + 1, total: rows.length };
    }
    return null;
  };

  const homeRank = getTeamRank(match.teamHome, match.teamHomeId);
  const awayRank = getTeamRank(match.teamAway, match.teamAwayId);

  // Scorer side resolution for the goals strip
  const scorerSide = (sc: any): "home" | "away" | null => {
    const name = sc.scorerName || sc.name || "";
    if (homeLineup.some((p: any) => p.name === name || String(p.id) === String(sc.scorerId))) return "home";
    if (awayLineup.some((p: any) => p.name === name || String(p.id) === String(sc.scorerId))) return "away";
    return null;
  };

  // Lineup rendering helpers
  const positionOrder = (pos: string) => {
    if (pos.includes("دروازه")) return 0;
    if (pos.includes("مدافع")) return 1;
    if (pos.includes("هافبک") || pos.includes("وینگر")) return 2;
    return 3;
  };

  const renderLineupColumn = (players: any[], subs: any[], teamName: string, accent: "emerald" | "cyan") => {
    const sorted = [...players].sort(
      (a, b) => positionOrder(a.position || "") - positionOrder(b.position || "") || (Number(a.number) || 99) - (Number(b.number) || 99)
    );
    const sortedSubs = [...subs].sort((a, b) => (Number(a.number) || 99) - (Number(b.number) || 99));

    const renderRow = (p: any) => {
      const rating = typeof p.rating === "number" ? p.rating : parseFloat(p.rating) || 0;
      return (
        <button
          key={String(p.id || p.name)}
          onClick={() => onSelectPlayer && onSelectPlayer(p.id)}
          className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 hover:bg-white/[0.04] transition cursor-pointer text-right"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-7 w-7 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center font-mono text-[10px] font-black text-slate-200 shrink-0">
              {toPersianDigits(p.number || "—")}
            </span>
            <div className="min-w-0">
              <span className="block text-xs font-bold text-white truncate">{p.name}</span>
              <span className="block text-[10px] text-slate-500">{p.position || "بازیکن"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {Number(p.goals) > 0 && <span className="text-[10px] font-black text-emerald-400">⚽{toPersianDigits(p.goals)}</span>}
            {Number(p.assists) > 0 && <span className="text-[10px] font-black text-cyan-400">🎯{toPersianDigits(p.assists)}</span>}
            {rating > 0 && (
              <span className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded ${
                rating >= 7.5 ? "bg-emerald-500/10 text-emerald-400" : rating >= 6.5 ? "bg-amber-500/10 text-amber-400" : "bg-white/5 text-slate-400"
              }`}>
                {toPersianDigits(rating.toFixed(1))}
              </span>
            )}
          </div>
        </button>
      );
    };

    return (
      <div className="rounded-2xl bg-[#141418] border border-white/5 overflow-hidden">
        <div className={`px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2 bg-gradient-to-l ${accent === "emerald" ? "from-emerald-500/10" : "from-cyan-500/10"}`}>
          <span className="text-xs font-black text-white truncate">{teamName}</span>
          <span className={`text-[10px] font-bold shrink-0 ${accent === "emerald" ? "text-emerald-400" : "text-cyan-400"}`}>
            {toPersianDigits(sorted.length)} بازیکن
          </span>
        </div>

        <div className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto scrollbar-thin">
          {sorted.map(renderRow)}
          {sortedSubs.length > 0 && (
            <>
              <div className="px-3.5 py-2 text-[10px] font-black text-slate-500 bg-white/[0.02] flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3" /> بازیکنان ذخیره
              </div>
              {sortedSubs.map(renderRow)}
            </>
          )}
        </div>
      </div>
    );
  };

  const extraResult = match.halfTimeScore || match.halftime || match.ht;
  const infoChips: { icon: React.ReactNode; text: string }[] = [
    { icon: <Trophy className="h-3.5 w-3.5" />, text: leagueName },
    ...(match.week ? [{ icon: <ListOrdered className="h-3.5 w-3.5" />, text: `هفته ${toPersianDigits(match.week)}` }] : []),
    { icon: <Calendar className="h-3.5 w-3.5" />, text: `${convertGregorianToShamsi(match.date)} | ساعت ${toPersianDigits(match.time)}` },
    ...(match.venue ? [{ icon: <MapPin className="h-3.5 w-3.5" />, text: `ورزشگاه: ${match.venue}` }] : []),
    ...(match.referee ? [{ icon: <Shield className="h-3.5 w-3.5" />, text: `داور: ${match.referee}` }] : []),
  ];

  const tabs = [
    { id: "timeline" as const, label: "گزارش و وقایع", icon: ListOrdered },
    { id: "stats" as const, label: "آمار دقیق بازی", icon: TrendingUp },
    { id: "lineups" as const, label: "ترکیب دو تیم", icon: Shirt },
    { id: "h2h" as const, label: "رویارویی‌ها (H2H)", icon: GitCompareArrows },
  ];

  return (
    <div className="match-scope rounded-2xl bg-[#121215] border border-white/5 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300 relative text-white" dir="rtl">
      
      {/* ===== HERO : real stadium photo + scoreboard ===== */}
      <div className="match-hero relative overflow-hidden bg-[#0c0f14]">
        <img
          src="/covers/match-cover.webp"
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-[#0c0f14]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08),transparent_75%)]" />

        {/* top bar */}
        <div className="relative z-10 flex items-center justify-between gap-3 p-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2 bg-black/55 hover:bg-black/80 rounded-xl text-xs font-extrabold text-slate-100 border border-white/15 shadow-md active:scale-95 transition backdrop-blur"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>بازگشت به برنامه مسابقات</span>
          </button>

          <span className="hidden sm:flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/15 text-slate-100 px-3 py-1.5 rounded-full text-[11px] font-black">
            <Trophy className="h-3.5 w-3.5 text-emerald-400" />
            {leagueName}
          </span>
        </div>

        {/* scoreboard */}
        <div className="relative z-10 px-4 sm:px-8 pb-6 pt-2 sm:pt-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6 max-w-4xl mx-auto">

            {/* home team */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-white/15 to-white/5 border-2 border-white/20 shadow-2xl backdrop-blur flex items-center justify-center overflow-hidden">
                <TeamLogo logo={match.teamHomeLogo} fallback="🛡️" size="lg" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-white text-sm sm:text-lg leading-tight max-w-[120px] sm:max-w-[180px] truncate">{match.teamHome}</h4>
                {homeRank && (
                  <span className="inline-block text-[10px] rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-slate-200 font-bold">
                    رتبه {toPersianDigits(homeRank.rank)} جدول
                  </span>
                )}
              </div>
            </div>

            {/* center score */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 text-white px-3 py-1 text-[10px] font-black animate-pulse shadow-lg">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  زنده · دقیقه {toPersianDigits(match.minutes || "۶۵")}'
                </span>
              ) : match.status === "finished" ? (
                <span className="rounded-full bg-white/15 border border-white/15 text-slate-100 px-3 py-1 text-[10px] font-black backdrop-blur">
                  پایان یافته
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 px-3 py-1 text-[10px] font-black backdrop-blur">
                  برنامه‌ریزی شده
                </span>
              )}

              {isPlayed ? (
                <div className="text-4xl sm:text-6xl font-mono font-black text-white tracking-widest drop-shadow-lg flex items-center gap-2 sm:gap-3">
                  <span className="text-emerald-400">{toPersianDigits(match.scoreHome)}</span>
                  <span className="text-slate-300/60">-</span>
                  <span className="text-cyan-400">{toPersianDigits(match.scoreAway)}</span>
                </div>
              ) : (
                <div className="text-3xl sm:text-5xl font-black text-white/80 tracking-widest select-none">VS</div>
              )}

              {extraResult && (
                <span className="text-[10px] text-slate-300 bg-white/10 border border-white/10 rounded-full px-2.5 py-0.5 font-bold">
                  نیمه اول: {toPersianDigits(extraResult)}
                </span>
              )}

              {match.venue && (
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-300 font-bold mt-1">
                  <MapPin className="h-3.5 w-3.5 text-rose-400" />
                  <span>{match.venue}</span>
                </div>
              )}
            </div>

            {/* away team */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-white/15 to-white/5 border-2 border-white/20 shadow-2xl backdrop-blur flex items-center justify-center overflow-hidden">
                <TeamLogo logo={match.teamAwayLogo} fallback="⚔️" size="lg" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-white text-sm sm:text-lg leading-tight max-w-[120px] sm:max-w-[180px] truncate">{match.teamAway}</h4>
                {awayRank && (
                  <span className="inline-block text-[10px] rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-slate-200 font-bold">
                    رتبه {toPersianDigits(awayRank.rank)} جدول
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MATCH INFO CHIPS ===== */}
      {infoChips.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-b border-white/5 bg-black/10">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-2 text-[11px]">
            {infoChips.map((chip, idx) => (
              <span key={idx} className="flex items-center gap-1.5 rounded-full bg-black/30 border border-white/5 px-3 py-1.5 text-slate-300 font-bold">
                <span className="text-emerald-400">{chip.icon}</span>
                {chip.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ===== TABS ===== */}
      <div className="flex bg-[#101012] border-b border-white/5 overflow-x-auto text-xs sm:text-sm font-black select-none px-4 scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[130px] py-3.5 px-2 text-center transition border-b-2 font-extrabold cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === tab.id
                ? "border-emerald-500 text-emerald-400 bg-emerald-500/[0.03]"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5 shrink-0" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6 max-w-4xl mx-auto min-h-[350px]">

        {/* ===== TAB 1: TIMELINE ===== */}
        {activeTab === "timeline" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {!isPlayed ? (
              <div className="p-8 text-center text-slate-400 bg-black/15 border border-white/5 border-dashed rounded-2xl max-w-md mx-auto space-y-3">
                <Clock className="h-10 w-10 text-emerald-400 mx-auto animate-pulse" />
                <h4 className="font-extrabold text-sm text-white">این مسابقه هنوز آغاز نشده است</h4>
                <p className="text-xs text-slate-400">گزارش لحظه‌به‌لحظه وقایع، کارت‌ها و گل‌های بازی بلافاصله پس از شروع مسابقه در این قسمت نمایش خواهد یافت.</p>
              </div>
            ) : sortedTimeline.length > 0 ? (
              <>
                {/* Goals strip (FotMob-style) */}
                {match.scorersList && match.scorersList.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {match.scorersList.map((sc: any, idx: number) => {
                      const side = scorerSide(sc);
                      const name = sc.scorerName || sc.name || "";
                      const resolvedScorerId = resolvePlayer(name, sc.scorerId);
                      return (
                        <span key={idx} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border ${
                          side === "away"
                            ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400"
                            : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                        }`}>
                          ⚽ {resolvedScorerId && onSelectPlayer ? (
                            <button onClick={() => onSelectPlayer(resolvedScorerId)} className="hover:underline cursor-pointer">{name}</button>
                          ) : name}
                          {sc.minute && <span className="font-mono text-[10px] opacity-80">{toPersianDigits(sc.minute)}'</span>}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Center-split timeline */}
                <div className="relative">
                  <div className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-px bg-white/10" />
                  <div className="space-y-2.5">
                    {sortedTimeline.map((item, idx) => {
                      const meta = EVENT_META[item.type] || EVENT_META.other;
                      const isHome = item.team === "home";

                      let titleText = item.playerName || meta.label;
                      let subtitle = meta.label;
                      if (item.type === "goal" || item.type === "penalty") {
                        if (item.player2Name) subtitle = `پاس گل`;
                      } else if (item.type === "substitution") {
                        titleText = "تعویض";
                        subtitle = `خروج / ورود`;
                      }
                      if (item.details) subtitle += ` — ${item.details}`;

                      const PlayerLink = ({ name, pid }: { name: string; pid?: string }) => {
                        if (pid && onSelectPlayer) {
                          return (
                            <button onClick={() => onSelectPlayer(pid)} className="hover:text-emerald-400 transition cursor-pointer">
                              {name}
                            </button>
                          );
                        }
                        return <>{name}</>;
                      };

                      const card = (
                        <div className={`max-w-[210px] sm:max-w-xs rounded-xl border p-2.5 ${
                          item.type === "goal" || item.type === "penalty"
                            ? (isHome ? "bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_20px_-6px_rgba(16,185,129,0.45)]" : "bg-cyan-500/15 border-cyan-500/30 shadow-[0_0_20px_-6px_rgba(6,182,212,0.45)]")
                            : (isHome ? "bg-emerald-500/[0.06] border-emerald-500/15" : "bg-cyan-500/[0.06] border-cyan-500/15")
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-base shrink-0">{meta.icon}</span>
                            <div className="min-w-0">
                              <span className="block text-xs font-black text-white truncate">
                                {item.type === "substitution" ? (
                                  <>
                                    <PlayerLink name={item.playerName || "—"} pid={item.playerId} />
                                    {" → "}
                                    <PlayerLink name={item.player2Name || "—"} pid={item.playerId2} />
                                  </>
                                ) : (
                                  <PlayerLink name={titleText} pid={item.playerId} />
                                )}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-semibold truncate">
                                {subtitle}
                                {(item.type === "goal" || item.type === "penalty") && item.player2Name && (
                                  <> — <PlayerLink name={item.player2Name} pid={item.playerId2} /></>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );

                      const minuteBadge = (
                        <div className="flex justify-center">
                          <span className={`h-9 w-9 rounded-full border flex items-center justify-center font-mono font-black text-[10px] shadow-md ${
                            item.type === "goal" || item.type === "penalty"
                              ? "bg-emerald-500/90 border-emerald-400/40 text-black"
                              : item.type === "yellow-card"
                              ? "bg-amber-500/90 border-amber-400/40 text-black"
                              : item.type === "red-card"
                              ? "bg-red-500/90 border-red-400/40 text-white"
                              : "bg-[#1c1c21] border-white/10 text-slate-200"
                          }`}>
                            {toPersianDigits(item.minute)}'
                          </span>
                        </div>
                      );

                      return (
                        <div key={idx} className="grid grid-cols-[1fr_40px_1fr] items-center gap-2">
                          {isHome ? (
                            <>
                              <div className="flex justify-end">{card}</div>
                              {minuteBadge}
                              <div />
                            </>
                          ) : (
                            <>
                              <div />
                              {minuteBadge}
                              <div className="flex justify-start">{card}</div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-black/15 border border-white/5 border-dashed rounded-2xl max-w-md mx-auto space-y-3">
                <AlertCircle className="h-10 w-10 text-slate-500 mx-auto" />
                <h4 className="font-extrabold text-sm text-white">رویدادی برای این مسابقه ثبت نشده است</h4>
                <p className="text-xs text-slate-400">گزارش زنده یا وقایع بازی (کارت‌ها، گل‌ها، تعویض‌ها) در این مسابقه وارد نشده است.</p>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB 2: STATS ===== */}
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
            ) : (
              <div className="rounded-2xl bg-[#141418] border border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2 text-xs font-black">
                  <span className="flex items-center gap-1.5 text-slate-100 min-w-0">
                    <TeamLogo logo={match.teamHomeLogo} fallback="🛡️" size="xs" />
                    <span className="truncate">{match.teamHome}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold shrink-0">مهمترین آمار بازی</span>
                  <span className="flex items-center gap-1.5 text-slate-100 min-w-0">
                    <span className="truncate">{match.teamAway}</span>
                    <TeamLogo logo={match.teamAwayLogo} fallback="⚔️" size="xs" />
                  </span>
                </div>

                <div className="divide-y divide-white/[0.04]">
                  {defaultStats.map((stat, idx) => {
                    const parseVal = (v: any) => parseFloat(String(v).replace("%", "")) || 0;
                    const homeValue = parseVal(stat.homeValue);
                    const awayValue = parseVal(stat.awayValue);
                    const totalVal = homeValue + awayValue || 1;
                    const homePercentage = (homeValue / totalVal) * 100;
                    const homeLead = homeValue > awayValue;
                    const awayLead = awayValue > homeValue;

                    return (
                      <div key={idx} className="px-4 py-4 space-y-2">
                        <div className="flex justify-between items-center text-xs sm:text-sm gap-3">
                          <span className={`font-extrabold font-mono ${homeLead ? "text-emerald-400" : "text-slate-400"}`}>
                            {toPersianDigits(stat.homeValue)}
                          </span>
                          <span className="text-slate-400 font-bold">{stat.label}</span>
                          <span className={`font-extrabold font-mono ${awayLead ? "text-cyan-400" : "text-slate-400"}`}>
                            {toPersianDigits(stat.awayValue)}
                          </span>
                        </div>

                        <div className="h-2.5 rounded-full bg-[#18181c] overflow-hidden flex border border-white/5">
                          <div 
                            style={{ width: `${homePercentage}%` }}
                            className={`h-full transition-all duration-300 ${homeLead ? "bg-emerald-400" : "bg-emerald-600/80"}`}
                          />
                          <div className={`flex-1 h-full transition-all duration-300 ${awayLead ? "bg-cyan-400" : "bg-cyan-600/80"}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB 3: LINEUPS ===== */}
        {activeTab === "lineups" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {homeLineup.length === 0 && awayLineup.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-black/15 border border-white/5 border-dashed rounded-2xl max-w-md mx-auto space-y-3">
                <Shirt className="h-10 w-10 text-slate-500 mx-auto" />
                <h4 className="font-extrabold text-sm text-white">ترکیب دو تیم ثبت نشده است</h4>
                <p className="text-xs text-slate-400">اطلاعات یازده‌نفر اصلی و ذخیره‌های این مسابقه پس از تأیید توسط کادر فنی در این بخش نمایش داده می‌شود.</p>
              </div>
            ) : (
              <FormationPitch
                homeLineup={homeLineup}
                awayLineup={awayLineup}
                homeSubs={homeSubs}
                awaySubs={awaySubs}
                homeFormation={homeFormation}
                awayFormation={awayFormation}
                homeName={match.teamHome}
                awayName={match.teamAway}
                onSelectPlayer={onSelectPlayer}
                players={players}
              />
            )}

            {/* List view below pitch as secondary */}
            {homeLineup.length > 0 || awayLineup.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderLineupColumn(homeLineup, homeSubs, match.teamHome, "emerald")}
                {renderLineupColumn(awayLineup, awaySubs, match.teamAway, "cyan")}
              </div>
            ) : null}
          </div>
        )}

        {/* ===== TAB 4: H2H ===== */}
        {activeTab === "h2h" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="font-black text-base text-white border-r-4 border-emerald-500 pr-2">تاریخچه رویارویی‌های مستقیم این دو تیم (H2H)</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block truncate">بردهای {match.teamHome}</span>
                <span className="text-2xl font-mono font-black text-emerald-400">{toPersianDigits(homeWins)} برد</span>
                <span className="text-[9px] text-slate-500 block">در بازی‌های پیشین</span>
              </div>

              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">تساوی‌ها</span>
                <span className="text-2xl font-mono font-black text-slate-100">{toPersianDigits(draws)} مساوی</span>
                <span className="text-[9px] text-slate-500 block">رقابت پایاپای</span>
              </div>

              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block truncate">بردهای {match.teamAway}</span>
                <span className="text-2xl font-mono font-black text-cyan-400">{toPersianDigits(awayWins)} برد</span>
                <span className="text-[9px] text-slate-500 block">در بازی‌های پیشین</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1 text-center">
                <span className="text-[10px] text-slate-500 font-bold block">کل رویارویی‌ها</span>
                <span className="text-2xl font-mono font-black text-white">{toPersianDigits(totalEncounters)}</span>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1 text-center">
                <span className="text-[10px] text-slate-500 font-bold block">گل‌های ردوبدل‌شده</span>
                <span className="text-2xl font-mono font-black text-amber-400">{toPersianDigits(totalGoals)}</span>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1 text-center">
                <span className="text-[10px] text-slate-500 font-bold block">میانگین گل هر بازی</span>
                <span className="text-2xl font-mono font-black text-cyan-300">{toPersianDigits(totalEncounters ? (totalGoals / totalEncounters).toFixed(1) : "—")}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-300 flex items-center gap-1.5 pt-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>فهرست رقابت‌های رودرروی ثبت‌شده اخیراً ({toPersianDigits(totalEncounters)} مسابقه)</span>
              </h4>

              {h2hMatches.length > 0 ? (
                <div className="grid gap-2.5">
                  {h2hMatches.map((m) => (
                    <div 
                      key={m.id} 
                      className="p-3.5 rounded-xl bg-[#161619]/60 border border-white/5 flex items-center justify-between text-xs hover:border-emerald-500/30 transition"
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
