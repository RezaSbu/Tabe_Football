import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, Calendar, MapPin, Clock, Shield, 
  AlertCircle, Sparkles, Trophy, ListOrdered, Shirt, GitCompareArrows, Newspaper 
} from "lucide-react";
import { StandingRow } from "../types";
import { convertGregorianToShamsi, formatStatNumber, normalizePersianString, getSafeImageUrl } from "../utils";
import { minuteSortKey } from "../shared/matchMinute";
import TeamLogo from "./TeamLogo";
import MatchPitch from "../matchcenter/MatchPitch";

interface MatchDetailViewProps {
  match: any;
  allMatches?: any[];
  allTeams?: any[];
  players?: any[];
  coaches?: any[];
  standings?: Record<string, StandingRow[]>;
  onBack: () => void;
  onSelectPlayer?: (playerId: string) => void;
  onSelectNews?: (newsId: string) => void;
  onSelectCoach?: (coachId: string) => void;
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
  coaches = [],
  standings = {},
  onBack, 
  onSelectPlayer,
  onSelectNews,
  onSelectCoach
}: MatchDetailViewProps) {
  
  const [activeTab, setActiveTab] = useState<"timeline" | "news" | "lineups" | "h2h">("timeline");
  const [matchNews, setMatchNews] = useState<any[]>([]);
  const isPlayed = match.status === "live" || match.status === "finished";
  const isLive = match.status === "live";

  // Match news: only items whose TEXT mentions BOTH teams (fetched server-side).
  useEffect(() => {
    if (!match?.id) return;
    let cancelled = false;
    fetch(`/api/related-news/match/${match.id}?limit=10`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.success && Array.isArray(data.data)) {
          setMatchNews(data.data);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [match?.id]);

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

  const defaultTimeline: any[] = rawEvents.map((ev: any) => {
    const p1 = ev.playerName || ev.player1 || "";
    const p2 = ev.player2Name || ev.assistPlayerName || ev.player2 || "";
    const details = ev.details || "";
    const type = ev.type || "other";
    const team = ev.team === "home" || ev.team === "away"
      ? ev.team
      : (ev.teamId === match.teamHomeId ? "home" : "away");
    return {
      minute: ev.minute,
      type,
      team,
      description: ev.description || describeEvent(type, p1, p2, details),
      playerName: p1,
      player2Name: p2,
      details,
    };
  });

  const sortedTimeline = [...defaultTimeline].sort((a, b) => minuteSortKey(a.minute) - minuteSortKey(b.minute));

  // --- 2. LINEUPS ---
  const defaultLineups = match.lineups || { home: [], away: [], homeSubs: [], awaySubs: [] };

  const homeLineup = defaultLineups.home || [];
  const awayLineup = defaultLineups.away || [];
  const homeSubs = defaultLineups.homeSubs || [];
  const awaySubs = defaultLineups.awaySubs || [];

  // --- 3b. Extract events per player from match.events (single source of truth) ---
  // Identity-first: an event carrying a playerId only ever belongs to that
  // id. Bare names are used solely for legacy events without any ids, so two
  // same-name players can never share one event.
  const getPlayerEvents = (playerId: string, playerName: string) => {
    const events = match.events || [];
    return events.filter((ev: any) => {
      if (!ev) return false;
      if (ev.playerId === playerId || ev.player2Id === playerId) return true;
      if (ev.playerId != null || ev.player2Id != null) return false;
      return ev.playerName === playerName || ev.player2Name === playerName;
    });
  };

  // --- 3c. Pitch enrichment: photo, events, sub-in minute, MVP, coords ---
  const photoById = (id: string) => (players || []).find((pl: any) => String(pl.id) === String(id))?.image;
  const toPitchPlayer = (p: any) => {
    const evs = getPlayerEvents(p.id, p.name);
    const subIn = (match.events || []).find((e: any) =>
      e.type === "substitution" &&
      (e.player2Id === p.id || (e.player2Id == null && e.player2Name === p.name))
    );
    const rating = typeof p.rating === "number" ? p.rating : (p.rating ? parseFloat(p.rating) : null);
    return {
      id: String(p.id || ""),
      name: p.name,
      position: p.position,
      rating: rating != null && !isNaN(rating) ? rating : null,
      image: photoById(p.id),
      captain: !!p.captain,
      x: typeof p.x === "number" ? p.x : undefined,
      y: typeof p.y === "number" ? p.y : undefined,
      events: evs.map((e: any) => ({ type: e.type, minute: e.minute, player2Name: e.player2Name })),
      subInMinute: subIn?.minute,
      isMvp: match.mvpId != null && String(match.mvpId) === String(p.id),
    };
  };

  const pitchCoaches = (() => {
    const out: { id: string; name: string; side: "home" | "away" }[] = [];
    const findCoach = (id: any) => (coaches || []).find((c: any) => String(c.id) === String(id));
    if (match.coachHomeId) {
      const c = findCoach(match.coachHomeId);
      if (c) out.push({ id: String(c.id), name: c.name, side: "home" });
    }
    if (match.coachAwayId) {
      const c = findCoach(match.coachAwayId);
      if (c) out.push({ id: String(c.id), name: c.name, side: "away" });
    }
    return out;
  })();

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

  // Scorer side resolution for the goals strip (using match.events as single source)
  const scorerSide = (sc: any): "home" | "away" | null => {
    const name = sc.scorerName || sc.name || "";
    // First check if scorer has a team in the event
    const goalEvent = (match.events || []).find((ev: any) => 
      (ev.type === "goal" || ev.type === "penalty") && 
      (ev.playerId === sc.scorerId || ((ev.playerId == null) && ev.playerName === name))
    );
    if (goalEvent?.team) return goalEvent.team;
    // Fallback: check lineup (id first, bare name only when the row has no id)
    if (homeLineup.some((p: any) => String(p.id) === String(sc.scorerId) || (p.id == null && p.name === name))) return "home";
    if (awayLineup.some((p: any) => String(p.id) === String(sc.scorerId) || (p.id == null && p.name === name))) return "away";
    return null;
  };

  const extraResult = match.halfTimeScore || match.halftime || match.ht;
  const infoChips: { icon: React.ReactNode; text: string }[] = [
    { icon: <Trophy className="h-3.5 w-3.5" />, text: leagueName },
    ...(match.week ? [{ icon: <ListOrdered className="h-3.5 w-3.5" />, text: `هفته ${formatStatNumber(match.week)}` }] : []),
    { icon: <Calendar className="h-3.5 w-3.5" />, text: `${convertGregorianToShamsi(match.date)} | ساعت ${formatStatNumber(match.time)}` },
    ...(match.venue ? [{ icon: <MapPin className="h-3.5 w-3.5" />, text: `ورزشگاه: ${match.venue}` }] : []),
    ...(match.referee ? [{ icon: <Shield className="h-3.5 w-3.5" />, text: `داور: ${match.referee}` }] : []),
  ];

  const tabs = [
    { id: "timeline" as const, label: "گزارش و وقایع", icon: ListOrdered },
    { id: "news" as const, label: "اخبار بازی", icon: Newspaper },
    { id: "lineups" as const, label: "ترکیب و نمرات دو تیم", icon: Shirt },
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
                    رتبه {formatStatNumber(homeRank.rank)} جدول
                  </span>
                )}
              </div>
            </div>

            {/* center score */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              {isLive ? (
                match.period === "HT" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 px-3 py-1 text-[10px] font-black">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    بین دو نیمه
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 text-white px-3 py-1 text-[10px] font-black animate-pulse shadow-lg">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    زنده · دقیقه {formatStatNumber(match.minutes || "65")}'
                  </span>
                )
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
                  <span className="text-emerald-400">{formatStatNumber(match.scoreHome)}</span>
                  <span className="text-slate-300/60">-</span>
                  <span className="text-cyan-400">{formatStatNumber(match.scoreAway)}</span>
                </div>
              ) : (
                <div className="text-3xl sm:text-5xl font-black text-white/80 tracking-widest select-none">VS</div>
              )}

              {extraResult && (
                <span className="text-[10px] text-slate-300 bg-white/10 border border-white/10 rounded-full px-2.5 py-0.5 font-bold">
                  نیمه اول: {formatStatNumber(extraResult)}
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
                    رتبه {formatStatNumber(awayRank.rank)} جدول
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
                      return (
                        <span key={idx} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border ${
                          side === "away"
                            ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400"
                            : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                        }`}>
                          ⚽ {name}
                          {sc.minute && <span className="font-mono text-[10px] opacity-80">{formatStatNumber(sc.minute)}'</span>}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Center-split timeline */}
                <div className="relative">
                  {/* Vertical center line */}
                  <div className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-px bg-white/10" />
                  <div className="space-y-2.5">
                    {sortedTimeline.map((item, idx) => {
                      const meta = EVENT_META[item.type] || EVENT_META.other;
                      const isHome = item.team === "home";

                      let title = item.playerName || meta.label;
                      let subtitle = meta.label;
                      if (item.type === "goal" || item.type === "penalty") {
                        if (item.player2Name) subtitle += ` — پاس گل: ${item.player2Name}`;
                      } else if (item.type === "substitution") {
                        title = "تعویض";
                        subtitle = `خروج ${item.playerName || "—"} / ورود ${item.player2Name || "—"}`;
                      }
                      if (item.details) subtitle += ` — ${item.details}`;

                      const minuteBadge = (
                        <div className="flex justify-center">
                          <span className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full border flex items-center justify-center font-mono font-black text-[10px] shadow-md ${
                            item.type === "goal" || item.type === "penalty"
                              ? "bg-emerald-500/90 border-emerald-400/40 text-black"
                              : item.type === "yellow-card"
                              ? "bg-amber-500/90 border-amber-400/40 text-black"
                              : item.type === "red-card"
                              ? "bg-red-500/90 border-red-400/40 text-white"
                              : "bg-[#1c1c21] border-white/10 text-slate-200"
                          }`}>
                            {formatStatNumber(item.minute)}'
                          </span>
                        </div>
                      );

                      const card = (
                        <div className={`rounded-xl border p-2 sm:p-2.5 break-words ${
                          item.type === "goal" || item.type === "penalty"
                            ? (isHome ? "bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_20px_-6px_rgba(16,185,129,0.45)]" : "bg-cyan-500/15 border-cyan-500/30 shadow-[0_0_20px_-6px_rgba(6,182,212,0.45)]")
                            : (isHome ? "bg-emerald-500/[0.06] border-emerald-500/15" : "bg-cyan-500/[0.06] border-cyan-500/15")
                        }`}>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-sm sm:text-base shrink-0">{meta.icon}</span>
                            <div className="min-w-0">
                              <span className="block text-[11px] sm:text-xs font-black text-white">{title}</span>
                              <span className="block text-[9px] sm:text-[10px] text-slate-400 font-semibold">{subtitle}</span>
                            </div>
                          </div>
                        </div>
                      );

                      return (
                        <div key={idx} className="grid grid-cols-[1fr_36px_1fr] sm:grid-cols-[1fr_40px_1fr] items-center gap-1.5 sm:gap-2">
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

        {/* ===== TAB 2: MATCH NEWS ===== */}
        {activeTab === "news" && (
          <div className="space-y-3 max-w-xl mx-auto animate-in fade-in duration-200">
            {matchNews.length > 0 ? (
              matchNews.map((nw: any) => (
                <button
                  key={nw.id}
                  onClick={() => onSelectNews && onSelectNews(nw.id)}
                  className="w-full flex items-start gap-3 text-right p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-emerald-500/30 transition cursor-pointer group"
                >
                  {nw.image ? (
                    <img
                      src={getSafeImageUrl(nw.image)}
                      alt={nw.title}
                      loading="lazy"
                      className="w-16 h-16 rounded-lg object-cover shrink-0 bg-slate-800"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg shrink-0 bg-slate-800 flex items-center justify-center text-lg">📰</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white leading-snug line-clamp-2 group-hover:text-emerald-400 transition">
                      {nw.title}
                    </h4>
                    {nw.summary && (
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {nw.summary}
                      </p>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 bg-black/15 border border-white/5 border-dashed rounded-2xl max-w-md mx-auto space-y-3">
                <Newspaper className="h-10 w-10 text-slate-500 mx-auto" strokeWidth={1.5} />
                <h4 className="font-extrabold text-sm text-white">خبری برای این مسابقه ثبت نشده است</h4>
                <p className="text-xs text-slate-400">اخباری که همزمان از هر دو تیم نام برده باشند، اینجا نمایش داده می‌شوند.</p>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB 3: LINEUPS (pitch) ===== */}
        {activeTab === "lineups" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {homeLineup.length === 0 && awayLineup.length === 0 && homeSubs.length === 0 && awaySubs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-black/15 border border-white/5 border-dashed rounded-2xl max-w-md mx-auto space-y-3">
                <Shirt className="h-10 w-10 text-slate-500 mx-auto" />
                <h4 className="font-extrabold text-sm text-white">ترکیب و نمرات دو تیم ثبت نشده است</h4>
                <p className="text-xs text-slate-400">اطلاعات یازده‌نفر اصلی و ذخیره‌های این مسابقه پس از تأیید توسط کادر فنی در این بخش نمایش داده می‌شود.</p>
              </div>
            ) : (
              <MatchPitch
                home={homeLineup.map(toPitchPlayer)}
                away={awayLineup.map(toPitchPlayer)}
                homeSubs={homeSubs.map(toPitchPlayer)}
                awaySubs={awaySubs.map(toPitchPlayer)}
                homeName={match.teamHome}
                awayName={match.teamAway}
                formationHome={defaultLineups.formationHome}
                formationAway={defaultLineups.formationAway}
                onSelectPlayer={onSelectPlayer}
                coaches={pitchCoaches}
                onSelectCoach={onSelectCoach}
              />
            )}
          </div>
        )}

        {/* ===== TAB 4: H2H ===== */}
        {activeTab === "h2h" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="font-black text-base text-white border-r-4 border-emerald-500 pr-2">تاریخچه رویارویی‌های مستقیم این دو تیم (H2H)</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block truncate">بردهای {match.teamHome}</span>
                <span className="text-2xl font-mono font-black text-emerald-400">{formatStatNumber(homeWins)} برد</span>
                <span className="text-[9px] text-slate-500 block">در بازی‌های پیشین</span>
              </div>

              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">تساوی‌ها</span>
                <span className="text-2xl font-mono font-black text-slate-100">{formatStatNumber(draws)} مساوی</span>
                <span className="text-[9px] text-slate-500 block">رقابت پایاپای</span>
              </div>

              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block truncate">بردهای {match.teamAway}</span>
                <span className="text-2xl font-mono font-black text-cyan-400">{formatStatNumber(awayWins)} برد</span>
                <span className="text-[9px] text-slate-500 block">در بازی‌های پیشین</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1 text-center">
                <span className="text-[10px] text-slate-500 font-bold block">کل رویارویی‌ها</span>
                <span className="text-2xl font-mono font-black text-white">{formatStatNumber(totalEncounters)}</span>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1 text-center">
                <span className="text-[10px] text-slate-500 font-bold block">گل‌های ردوبدل‌شده</span>
                <span className="text-2xl font-mono font-black text-amber-400">{formatStatNumber(totalGoals)}</span>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1 text-center">
                <span className="text-[10px] text-slate-500 font-bold block">میانگین گل هر بازی</span>
                <span className="text-2xl font-mono font-black text-cyan-300">{formatStatNumber(totalEncounters ? (totalGoals / totalEncounters).toFixed(1) : "—")}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-300 flex items-center gap-1.5 pt-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>فهرست رقابت‌های رودرروی ثبت‌شده اخیراً ({formatStatNumber(totalEncounters)} مسابقه)</span>
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
                          {convertGregorianToShamsi(m.date)} | ساعت {formatStatNumber(m.time)}
                        </span>
                      </div>

                      <span className="font-mono font-black text-xs bg-black/30 px-3 py-1 rounded-lg border border-white/5 text-slate-50 select-none">
                        {formatStatNumber(m.scoreHome)} - {formatStatNumber(m.scoreAway)}
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
