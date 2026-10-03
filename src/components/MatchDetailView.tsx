import React, { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, Calendar, MapPin, Clock, Shield, 
  AlertCircle, Sparkles, Trophy, ListOrdered, Shirt, GitCompareArrows, Newspaper 
} from "lucide-react";
import { StandingRow } from "../types";
import { convertGregorianToShamsi, formatStatNumber, normalizePersianString, getSafeImageUrl } from "../utils";
import { minuteSortKey } from "../shared/matchMinute";
import TeamLogo from "./TeamLogo";
import MatchPitch from "../matchcenter/MatchPitch";
import { enrichMatchForPitch } from "../matchcenter/toPitchPlayer";
import { inferFormation } from "../matchcenter/MatchPitch";
import { EventIcon } from "../matchcenter/EventIcon";

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

const EVENT_META: Record<string, { label: string }> = {
  goal: { label: "گل" },
  penalty: { label: "گل پنالتی" },
  "own-goal": { label: "گل به خودی" },
  assist: { label: "پاس گل" },
  "yellow-card": { label: "کارت زرد" },
  "red-card": { label: "کارت قرمز" },
  substitution: { label: "تعویض" },
  "missed-penalty": { label: "پنالتی از دست رفته" },
  injury: { label: "مصدومیت" },
  var: { label: "بررسی VAR" },
  other: { label: "رویداد" },
};

const relativeFaTime = (iso?: string): string => {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (mins < 1) return "لحظاتی پیش";
  if (mins < 60) return `${formatStatNumber(mins)} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${formatStatNumber(hours)} ساعت پیش`;
  return `${formatStatNumber(Math.floor(hours / 24))} روز پیش`;
};

const LEAGUE_NAMES: Record<string, string> = {  "pro-league": "لیگ برتر خلیج فارس",
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
  const [eventFilter, setEventFilter] = useState<"all" | "goals" | "cards" | "subs">("all");
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
  const leagueDisplayName = match.league === "league-2" && (match.group === "a" || match.group === "b")
    ? `${leagueName} (گروه ${match.group === "a" ? "الف" : "ب"})`
    : leagueName;

  // --- 1. DYNAMIC TIMELINE ---
  const describeEvent = (type: string, p1: string, p2: string, details: string): string => {
    switch (type) {
      case "goal":
        return `گل توسط ${p1}${p2 ? ` (پاس گل: ${p2})` : ""}${details ? ` — ${details}` : ""}`;
      case "assist":
        return `پاس گل توسط ${p1}${p2 ? ` برای ${p2}` : ""}${details ? ` — ${details}` : ""}`;
      case "penalty":
        return `گل پنالتی توسط ${p1}${details ? ` — ${details}` : ""}`;
      case "own-goal":
        return `گل به خودی توسط ${p1}${details ? ` — ${details}` : ""}`;
      case "missed-penalty":
        return `پنالتی از دست رفته توسط ${p1}${details ? ` — ${details}` : ""}`;
      case "yellow-card":
        return `کارت زرد برای ${p1}${details ? ` — ${details}` : ""}`;
      case "red-card":
        return `کارت قرمز برای ${p1}${details ? ` — ${details}` : ""}`;
      case "substitution":
        return `تعویض: خروج ${p1} / ورود ${p2 || "بازیکن جدید"}${details ? ` — ${details}` : ""}`;
      case "injury":
        return `مصدومیت ${p1}${details ? ` — ${details}` : ""}`;
      case "var":
        return `تصمیم VAR ${p1 ? `برای ${p1}` : ""}${details ? ` — ${details}` : ""}`;
      case "other":
        return `${details || "رویداد بازی"}${p1 ? ` (${p1})` : ""}`;
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

  // --- 3b/c. Pitch enrichment via the shared matchcenter module (single
  // source of truth shared with the homepage week widget). Identity-first:
  // an event carrying a playerId only ever belongs to that id.
  const pitchData = useMemo(
    () => enrichMatchForPitch(match, players, coaches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [match?.id, match?.lineups, match?.events, match?.mvpId, players, coaches]
  );
  const { coaches: pitchCoaches } = pitchData;

  const filterTimelineItem = (item: any) => {
    if (eventFilter === "goals") return item.type === "goal" || item.type === "penalty" || item.type === "own-goal";
    if (eventFilter === "cards") return item.type === "yellow-card" || item.type === "red-card";
    if (eventFilter === "subs") return item.type === "substitution";
    return true;
  };

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

  // Recent form (last 5 finished matches per team, real data only).
  const teamForm = (teamName: string): ("W" | "D" | "L")[] => {
    return allMatches
      .filter(m => m.status === "finished" && (m.teamHome === teamName || m.teamAway === teamName))
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 5)
      .map(m => {
        const isHome = m.teamHome === teamName;
        const gf = isHome ? (m.scoreHome ?? 0) : (m.scoreAway ?? 0);
        const ga = isHome ? (m.scoreAway ?? 0) : (m.scoreHome ?? 0);
        return gf > ga ? "W" : gf < ga ? "L" : "D";
      });
  };
  const homeForm = teamForm(match.teamHome);
  const awayForm = teamForm(match.teamAway);
  const h2hTotal = Math.max(1, totalEncounters);
  const homeWinPct = Math.round((homeWins / h2hTotal) * 100);
  const awayWinPct = Math.round((awayWins / h2hTotal) * 100);
  const drawPct = Math.max(0, 100 - homeWinPct - awayWinPct);

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
    { icon: <Trophy className="h-3.5 w-3.5" />, text: leagueDisplayName },
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
            {leagueDisplayName}
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
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
                  <span className="font-mono text-emerald-400/90" dir="ltr">{defaultLineups.formationHome || inferFormation(homeLineup)}</span>
                  {pitchCoaches.some(c => c.side === "home") && (
                    <><span className="text-slate-600">•</span><span className="truncate max-w-[110px]">{pitchCoaches.find(c => c.side === "home")?.name}</span></>
                  )}
                </div>
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
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
                  <span className="font-mono text-cyan-400/90" dir="ltr">{defaultLineups.formationAway || inferFormation(awayLineup)}</span>
                  {pitchCoaches.some(c => c.side === "away") && (
                    <><span className="text-slate-600">•</span><span className="truncate max-w-[110px]">{pitchCoaches.find(c => c.side === "away")?.name}</span></>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MATCH INFO CHIPS ===== */}
      {infoChips.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-2 text-[11px]">
            {infoChips.map((chip, idx) => (
              <span key={idx} className="flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/10 px-3 py-1.5 text-white font-bold backdrop-blur hover:border-emerald-500/40 hover:shadow-[0_0_12px_-4px_rgba(16,185,129,0.5)] transition">
                <span className="text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]">{chip.icon}</span>
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
              <div className="p-8 text-center text-slate-200 bg-emerald-500/[0.05] border border-emerald-500/25 border-dashed rounded-2xl max-w-md mx-auto space-y-3 shadow-[inset_0_0_30px_rgba(16,185,129,0.08)]">
                <Clock className="h-10 w-10 text-emerald-400 mx-auto animate-pulse" />
                <h4 className="font-extrabold text-sm text-white">این مسابقه هنوز آغاز نشده است</h4>
                <p className="text-xs text-slate-400">گزارش لحظه‌به‌لحظه وقایع، کارت‌ها و گل‌های بازی بلافاصله پس از شروع مسابقه در این قسمت نمایش خواهد یافت.</p>
              </div>
            ) : sortedTimeline.length > 0 ? (
              <>
                {/* Goals strip */}
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
                          <EventIcon type="goal" size={14} /> {name}
                          {sc.minute && <span className="font-mono text-[10px] opacity-80">{formatStatNumber(sc.minute)}'</span>}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Event filter bar (figma) */}
                <div className="flex items-center justify-between bg-[#131924] p-2.5 rounded-2xl border border-white/5 shadow-md">
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                    {([
                      { key: "all", label: "همه رویدادها", icon: null },
                      { key: "goals", label: "گل‌ها", icon: "goal" },
                      { key: "cards", label: "کارت‌ها", icon: "yellow-card" },
                      { key: "subs", label: "تعویض‌ها", icon: "substitution" },
                    ] as const).map(f => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setEventFilter(f.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                          eventFilter === f.key
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                            : "bg-slate-900/60 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {f.icon && <EventIcon type={f.icon} size={14} />}
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono hidden sm:block shrink-0">
                    {formatStatNumber(sortedTimeline.filter(filterTimelineItem).length)} رویداد ثبت‌شده
                  </div>
                </div>

                {/* Center-rule timeline (figma) */}
                <div className="bg-[#101622] rounded-3xl border border-white/5 p-4 sm:p-6 shadow-xl">
                {sortedTimeline.filter(filterTimelineItem).length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">در این دسته رویدادی ثبت نشده است.</p>
                ) : (
                <div className="relative flex flex-col gap-3 sm:gap-4">
                  {/* Center axis: visible on all widths so home/away sides never merge */}
                  <div className="absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-0.5 bg-slate-800/80" />
                  {sortedTimeline.filter(filterTimelineItem).map((item, idx) => {
                      const meta = EVENT_META[item.type] || EVENT_META.other;
                      const isHome = item.team === "home";

                      const title = item.playerName || meta.label;
                      let subtitle = meta.label;
                      if (item.type === "goal" || item.type === "penalty") {
                        if (item.player2Name) subtitle += ` — پاس گل: ${item.player2Name}`;
                      }
                      if (item.details) subtitle += ` — ${item.details}`;

                      const card = (
                        <div className={`rounded-2xl border p-2.5 sm:p-3 break-words w-full ${
                          item.type === "goal" || item.type === "penalty"
                            ? (isHome ? "bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_20px_-6px_rgba(16,185,129,0.45)]" : "bg-cyan-500/15 border-cyan-500/30 shadow-[0_0_20px_-6px_rgba(6,182,212,0.45)]")
                            : (isHome ? "bg-emerald-500/[0.06] border-emerald-500/15" : "bg-cyan-500/[0.06] border-cyan-500/15")
                        }`}>
                          {item.type === "substitution" ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-rose-400 font-black text-xs">↘</span>
                                <span className="block text-[11px] sm:text-xs font-black text-white truncate">{item.playerName || "—"}</span>
                                <span className="text-[9px] text-slate-500 mr-auto shrink-0">خروج</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-emerald-400 font-black text-xs">↗</span>
                                <span className="block text-[11px] sm:text-xs font-black text-white truncate">{item.player2Name || "—"}</span>
                                <span className="text-[9px] text-slate-500 mr-auto shrink-0">ورود</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="shrink-0"><EventIcon type={item.type} size={18} /></span>
                              <div className="min-w-0">
                                <span className="block text-[11px] sm:text-xs font-black text-white truncate">{title}</span>
                                <span className="block text-[9px] sm:text-[10px] text-slate-400 font-semibold truncate">{subtitle}</span>
                              </div>
                            </div>
                          )}
                          {item.type === "assist" && item.player2Name && (
                            <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-white/5">
                              <EventIcon type="assist" size={14} />
                              <span className="text-[10px] text-slate-300">برای {item.player2Name}</span>
                            </div>
                          )}
                          {(item.type === "goal" || item.type === "penalty") && item.player2Name && (
                            <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-white/5">
                              <EventIcon type="assist" size={14} />
                              <span className="text-[10px] text-slate-300">پاس گل: {item.player2Name}</span>
                            </div>
                          )}
                        </div>
                      );

                      const minutePill = (
                        <div className="flex justify-center">
                          <span className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 shadow-xl flex items-center justify-center text-[9px] sm:text-[11px] font-black font-mono tabular-nums text-slate-200">
                            {formatStatNumber(item.minute)}'
                          </span>
                        </div>
                      );

                      return (
                        <div key={idx} className="relative z-10 grid grid-cols-[1fr_34px_1fr] sm:grid-cols-12 items-center gap-1.5 sm:gap-3">
                          <div className="col-span-1 sm:col-span-5 flex justify-end min-w-0">
                            {isHome && card}
                          </div>
                          <div className="col-span-1 sm:col-span-2 flex justify-center">
                            {minutePill}
                          </div>
                          <div className="col-span-1 sm:col-span-5 flex justify-start min-w-0">
                            {!isHome && card}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-200 bg-emerald-500/[0.05] border border-emerald-500/25 border-dashed rounded-2xl max-w-md mx-auto space-y-3 shadow-[inset_0_0_30px_rgba(16,185,129,0.08)]">
                <AlertCircle className="h-10 w-10 text-emerald-400/70 mx-auto drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                <h4 className="font-extrabold text-sm text-white">رویدادی برای این مسابقه ثبت نشده است</h4>
                <p className="text-xs text-slate-400">گزارش زنده یا وقایع بازی (کارت‌ها، گل‌ها، تعویض‌ها) در این مسابقه وارد نشده است.</p>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB 2: MATCH NEWS (figma: hero + grid) ===== */}
        {activeTab === "news" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {matchNews.length > 0 ? (
              <>
                {(() => {
                  const [hero, ...rest] = matchNews;
                  return (
                    <>
                      <button
                        key={hero.id}
                        onClick={() => onSelectNews && onSelectNews(hero.id)}
                        className="w-full text-right rounded-2xl border border-white/5 bg-gradient-to-br from-[#151d2d] to-[#0f1420] p-5 sm:p-6 shadow-xl relative overflow-hidden group cursor-pointer hover:border-emerald-500/25 transition"
                      >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            خبر اصلی مسابقه
                          </span>
                          <span className="text-[11px] text-slate-400">{relativeFaTime(hero.createdAt)} • {match.teamHome} - {match.teamAway}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                          {hero.image && (
                            <img
                              src={getSafeImageUrl(hero.image)}
                              alt={hero.title}
                              loading="lazy"
                              className="w-full sm:w-56 h-40 sm:h-36 rounded-xl object-cover shrink-0 bg-slate-800"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <h2 className="text-base sm:text-xl font-black text-white leading-snug mb-2 group-hover:text-emerald-300 transition-colors line-clamp-3">
                              {hero.title}
                            </h2>
                            {hero.summary && (
                              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                                {hero.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                      {rest.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {rest.map((nw: any) => (
                            <button
                              key={nw.id}
                              onClick={() => onSelectNews && onSelectNews(nw.id)}
                              className="bg-[#131924] rounded-2xl border border-white/5 p-5 flex flex-col justify-between hover:border-white/15 hover:bg-[#161d2b] transition-all cursor-pointer group shadow-lg text-right"
                            >
                              <div>
                                {nw.image && (
                                  <img
                                    src={getSafeImageUrl(nw.image)}
                                    alt={nw.title}
                                    loading="lazy"
                                    className="w-full h-32 rounded-xl object-cover bg-slate-800 mb-3"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-sky-500/20 text-sky-300 border-sky-500/30">
                                    اخبار مسابقه
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-mono">{relativeFaTime(nw.createdAt)}</span>
                                </div>
                                <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition-colors leading-snug mb-2 line-clamp-2">
                                  {nw.title}
                                </h3>
                                {nw.summary && (
                                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                                    {nw.summary}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-end text-[11px] text-slate-400 pt-3 mt-4 border-t border-white/5">
                                <span className="group-hover:text-emerald-400 flex items-center gap-1 transition-colors">
                                  ادامه خبر ←
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              <div className="p-8 text-center text-slate-200 bg-emerald-500/[0.05] border border-emerald-500/25 border-dashed rounded-2xl max-w-md mx-auto space-y-3 shadow-[inset_0_0_30px_rgba(16,185,129,0.08)]">
                <Newspaper className="h-10 w-10 text-emerald-400/70 mx-auto drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]" strokeWidth={1.5} />
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
              <div className="p-8 text-center text-slate-200 bg-emerald-500/[0.05] border border-emerald-500/25 border-dashed rounded-2xl max-w-md mx-auto space-y-3 shadow-[inset_0_0_30px_rgba(16,185,129,0.08)]">
                <Shirt className="h-10 w-10 text-emerald-400/70 mx-auto drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                <h4 className="font-extrabold text-sm text-white">ترکیب و نمرات دو تیم ثبت نشده است</h4>
                <p className="text-xs text-slate-400">اطلاعات یازده‌نفر اصلی و ذخیره‌های این مسابقه پس از تأیید توسط کادر فنی در این بخش نمایش داده می‌شود.</p>
              </div>
            ) : (
              <MatchPitch
                home={pitchData.home}
                away={pitchData.away}
                homeSubs={pitchData.homeSubs}
                awaySubs={pitchData.awaySubs}
                homeName={match.teamHome}
                awayName={match.teamAway}
                homeLogo={match.teamHomeLogo}
                awayLogo={match.teamAwayLogo}
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

            {/* Recent form cards (figma) */}
            <div className="bg-[#151c28] rounded-2xl border border-white/5 p-4 sm:p-5">
              <h4 className="text-xs font-black text-white mb-4">فرم اخیر دو تیم در ۵ بازی گذشته</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {([
                  { name: match.teamHome, form: homeForm, dot: "bg-emerald-400" },
                  { name: match.teamAway, form: awayForm, dot: "bg-cyan-400" },
                ]).map(t => (
                  <div key={t.name} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${t.dot}`} />
                      <span className="text-xs font-bold text-white truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" dir="ltr">
                      {t.form.length > 0 ? t.form.map((r, i) => (
                        <span
                          key={i}
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold font-mono text-white ${
                            r === "W" ? "bg-emerald-600" : r === "D" ? "bg-amber-600" : "bg-rose-600"
                          }`}
                        >
                          {r}
                        </span>
                      )) : (
                        <span className="text-[10px] text-slate-500">بدون سابقه</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Win/Draw/Loss distribution bar (figma) */}
            <div className="bg-[#151c28] rounded-2xl border border-white/5 p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-emerald-400">{match.teamHome} ({formatStatNumber(homeWins)})</span>
                <span className="text-slate-400">تساوی ({formatStatNumber(draws)})</span>
                <span className="text-cyan-400">({formatStatNumber(awayWins)}) {match.teamAway}</span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-800 flex" dir="ltr">
                <div style={{ width: `${homeWinPct}%` }} className="bg-emerald-500" />
                <div style={{ width: `${drawPct}%` }} className="bg-slate-500" />
                <div style={{ width: `${awayWinPct}%` }} className="bg-cyan-500" />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="p-3 rounded-xl bg-gradient-to-b from-white/[0.06] to-transparent border border-white/10 space-y-1 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">کل رویارویی‌ها</span>
                  <span className="text-xl font-mono font-black text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.35)]">{formatStatNumber(totalEncounters)}</span>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-b from-white/[0.06] to-transparent border border-white/10 space-y-1 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">گل‌های ردوبدل‌شده</span>
                  <span className="text-xl font-mono font-black text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">{formatStatNumber(totalGoals)}</span>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-b from-white/[0.06] to-transparent border border-white/10 space-y-1 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">میانگین گل</span>
                  <span className="text-xl font-mono font-black text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">{formatStatNumber(totalEncounters ? (totalGoals / totalEncounters).toFixed(1) : "—")}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-300 flex items-center gap-1.5 pt-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>فهرست رقابت‌های رودرروی ثبت‌شده اخیراً ({formatStatNumber(totalEncounters)} مسابقه)</span>
              </h4>

              {h2hMatches.length > 0 ? (
                <div className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/5 bg-[#161619]/60 overflow-hidden">
                  {h2hMatches.map((m) => (
                    <div
                      key={m.id}
                      className="py-3 px-3.5 flex items-center justify-between gap-2 text-xs hover:bg-white/[0.02] transition"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-300 text-[11px]">{m.league ? (LEAGUE_NAMES[m.league] || m.league) : ""}</span>
                        <span className="font-mono text-[9px] text-slate-500">
                          {convertGregorianToShamsi(m.date)} | ساعت {formatStatNumber(m.time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <span className="font-medium text-slate-200 hidden sm:inline">{m.teamHome}</span>
                        <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 font-bold font-mono text-white tabular-nums text-xs" dir="ltr">
                          {formatStatNumber(m.scoreHome)} - {formatStatNumber(m.scoreAway)}
                        </span>
                        <span className="font-medium text-slate-200 hidden sm:inline">{m.teamAway}</span>
                      </div>
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
