import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Trophy, Award, UserRound, TrendingUp, Target, BookOpen, BadgeCheck, Clock, Flag, Newspaper } from "lucide-react";
import { getSafeImageUrl, formatStatNumber, normalizePersianString, convertGregorianToShamsi } from "../utils";
import { coachOfTeamAt } from "../shared/coachTenure";
import { resolveTeam } from "../shared/teamMatch";
import SeasonSwitcher, { defaultSeasonValue } from "./SeasonSwitcher";
import ShareButton from "./ui/ShareButton";
import MovementTimeline from "./MovementTimeline";
import CareerSection from "./CareerSection";
import TeamLogo from "./TeamLogo";
import { FormRing, PresenceStrip, SeasonResultsBars } from "./player/PlayerCharts";
import { MiniStat } from "./player/PlayerWidgets";

interface CoachDetailProps {
  coach: any;
  allMatches?: any[];
  allTeams?: any[];
  allAppointments?: any[];
  news?: any[];
  onBack: () => void;
  onSelectTeam?: (name: string) => void;
  onSelectNews?: (id: string) => void;
  onSelectMatch?: (id: string) => void;
}

export default function CoachDetail({
  coach,
  allMatches = [],
  allTeams = [],
  allAppointments = [],
  news = [],
  onBack,
  onSelectTeam,
  onSelectNews,
  onSelectMatch
}: CoachDetailProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "matches" | "news" | "career">("overview");
  const [imageError, setImageError] = useState(false);
  const [lastCoachId, setLastCoachId] = useState<string | undefined>(undefined);
  const [coachNews, setCoachNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  // Phase 5: per-season view ("career" = all-time, previous behavior).
  const [seasonId, setSeasonId] = useState<string>(() => defaultSeasonValue(coach?.seasons, true));

  useEffect(() => {
    if (coach?.id) {
      setSeasonId(defaultSeasonValue(coach.seasons, true));
      // Fetch related news from server
      setLoadingNews(true);
      fetch(`/api/related-news/coach/${coach.id}?limit=10`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setCoachNews(data.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingNews(false));
    }
  }, [coach?.id]);

  if (!coach) return null;

  if (coach?.id !== lastCoachId) {
    setImageError(false);
    setLastCoachId(coach?.id);
  }

  const isCareerView = seasonId === "career";
  const seasonRows = !isCareerView ? ((coach.seasonRows || []).filter((r: any) => String(r.seasonId) === String(seasonId))) : [];
  const sumRow = (key: string) => seasonRows.reduce((a: number, r: any) => a + (Number(r[key]) || 0), 0);
  const stats = coach.seasonStats || {};
  const matches = isCareerView ? (stats.matches || 0) : sumRow("matches");
  const wins = isCareerView ? (stats.wins || 0) : sumRow("wins");
  const draws = isCareerView ? (stats.draws || 0) : sumRow("draws");
  const losses = isCareerView ? (stats.losses || 0) : sumRow("losses");
  const winRate = isCareerView
    ? (stats.winRate || (matches > 0 ? parseFloat(((wins / matches) * 100).toFixed(1)) : 0))
    : (matches > 0 ? parseFloat(((wins / matches) * 100).toFixed(1)) : 0);
  const goalsFor = isCareerView ? (stats.goalsFor || 0) : sumRow("goalsFor");
  const goalsAgainst = isCareerView ? (stats.goalsAgainst || 0) : sumRow("goalsAgainst");

  const titles = coach.titles || [];
  const recentForm = coach.recentForm || [];

  const formLabels: Record<string, { label: string; color: string }> = {
    W: { label: "پیروزی", color: "bg-emerald-500" },
    D: { label: "مساوی", color: "bg-amber-500" },
    L: { label: "شکست", color: "bg-red-500" }
  };

  // Coach match records: stamped match ids first, then movement-aware tenure
  // (who held this team on this date). Never the live teamName alone — that
  // rewrote history on every post-transfer render.
  const tenureCoaches = [{ id: String(coach.id), teamId: coach.teamId != null ? String(coach.teamId) : null }];
  const tenureMovements = (coach.movements || []).map((m: any) => ({
    coachId: coach.id != null ? String(coach.id) : null,
    fromTeamId: m.fromTeamId != null ? String(m.fromTeamId) : null,
    toTeamId: m.toTeamId != null ? String(m.toTeamId) : null,
    movementDate: m.movementDate || null,
  }));
  // Same appointment-aware tenure the server recalc uses: where dated
  // appointment rows exist for a team they govern (so the list can never
  // disagree with the stored summary); otherwise movement legacy applies.
  const tenureAppointments = (allAppointments || []).map((a: any) => ({
    coachId: a.coachId != null ? String(a.coachId) : null,
    teamId: a.teamId != null ? String(a.teamId) : null,
    startDate: a.startDate || null,
    endDate: a.endDate || null,
    status: a.status || null,
  }));
  const teamIdOf = (id: any, name: any): string | null => {
    if (id != null && String(id).trim() !== "") return String(id);
    if (!name) return null;
    const t = resolveTeam(allTeams, name);
    return t && (t as any).id != null ? String((t as any).id) : null;
  };
  const coachMatches: any[] = [];
  allMatches.forEach(match => {
    if (match.status !== "finished") return;
    let isHome = !!(match.coachHomeId && String(match.coachHomeId) === String(coach.id));
    let isAway = !isHome && !!(match.coachAwayId && String(match.coachAwayId) === String(coach.id));
    if (!isHome && !isAway) {
      const homeTid = teamIdOf(match.teamHomeId, match.teamHome);
      const awayTid = teamIdOf(match.teamAwayId, match.teamAway);
      isHome = !!homeTid && coachOfTeamAt(homeTid, match.date, tenureCoaches, tenureMovements, tenureAppointments) === String(coach.id);
      isAway = !isHome && !!awayTid && coachOfTeamAt(awayTid, match.date, tenureCoaches, tenureMovements, tenureAppointments) === String(coach.id);
    }
    if (!isHome && !isAway) return;

    const homeGoals = Number(match.scoreHome) || 0;
    const awayGoals = Number(match.scoreAway) || 0;
    const result: "W" | "D" | "L" =
      homeGoals === awayGoals ? "D" : (isHome ? (homeGoals > awayGoals ? "W" : "L") : (awayGoals > homeGoals ? "W" : "L"));

    coachMatches.push({
      matchId: match.id,
      date: match.date,
      time: match.time,
      seasonId: match.seasonId || null,
      season: match.season || null,
      teamName: isHome ? match.teamHome : match.teamAway,
      teamLogo: isHome ? match.teamHomeLogo : match.teamAwayLogo,
      opponent: isHome ? match.teamAway : match.teamHome,
      opponentLogo: isHome ? match.teamAwayLogo : match.teamHomeLogo,
      scoreHome: match.scoreHome,
      scoreAway: match.scoreAway,
      result
    });
  });
  coachMatches.sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  // Matches-tab scope: same season filter as the stats above.
  const seasonTagForMatches = (coach.seasons || []).find((s: any) => String(s.id) === String(seasonId))?.name;
  const visibleCoachMatches = isCareerView ? coachMatches : coachMatches.filter((m: any) =>
    String(m.seasonId) === String(seasonId) ||
    (seasonTagForMatches != null && (String(m.season) === String(seasonTagForMatches) || String(m.seasonId) === `season-${seasonTagForMatches}`)));

  // Results distribution + seasonal W/D/L (all real rows; seasonRows first).
  const distribution = visibleCoachMatches.map((m: any) => m.result as "W" | "D" | "L");
  const seasonResultsData = (() => {
    const rows: any[] = Array.isArray(coach.seasonRows) ? coach.seasonRows : [];
    if (rows.length > 0) {
      const bySeason = new Map<string, { season: string; wins: number; draws: number; losses: number }>();
      rows.forEach((r: any) => {
        const nm = String(r.season || r.seasonId || "");
        if (!nm) return;
        const e = bySeason.get(nm) || { season: nm, wins: 0, draws: 0, losses: 0 };
        e.wins += Number(r.wins) || 0;
        e.draws += Number(r.draws) || 0;
        e.losses += Number(r.losses) || 0;
        bySeason.set(nm, e);
      });
      return [...bySeason.values()].sort((a, b) => a.season.localeCompare(b.season, "fa"));
    }
    return (coach.careerHistory || []).map((h: any) => ({
      season: String(h.season),
      wins: Number(h.wins) || 0,
      draws: Number(h.draws) || 0,
      losses: Number(h.losses) || 0,
    }));
  })();

  const myClubRef = resolveTeam(allTeams, coach.teamId || coach.teamName);
  const clubLogo: string | null = ((myClubRef as any)?.logo || null);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300" dir="rtl">
      <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[11px] font-bold text-slate-400">
        <nav className="flex items-center gap-1.5" aria-label="breadcrumb">
          <Link to="/" className="transition hover:text-emerald-400">خانه</Link>
          <span className="text-slate-600">/</span>
          <span>مربیان</span>
          <span className="text-slate-600">/</span>
          <span className="max-w-40 truncate text-slate-200">{coach.name}</span>
        </nav>
        <button type="button" onClick={onBack} className="flex shrink-0 items-center gap-1 transition hover:text-emerald-400">
          <ArrowRight className="h-3.5 w-3.5" />
          <span>برگشت</span>
        </button>
      </div>

      <div className="coach-hero overflow-hidden rounded-3xl bg-gradient-to-l from-[#0a1830] via-[#0d2140] to-[#12305c] shadow-xl">
        <div className="grid grid-cols-1 items-center gap-5 p-4 sm:p-6 lg:grid-cols-12">
          {/* KPI cards (right in RTL = first) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:col-span-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center backdrop-blur">
              <span className="block text-[10px] font-bold text-emerald-300/80">درصد برد</span>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="font-mono text-3xl font-black text-white">{formatStatNumber(winRate)}</span>
                <FormRing value={matches > 0 ? Math.max(0, Math.min(100, Number(winRate))) : null} size={44} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center backdrop-blur">
              <span className="block text-[10px] font-bold text-emerald-300/80">بازی‌ها</span>
              <span className="mt-1 block font-mono text-3xl font-black text-white">{formatStatNumber(matches)}</span>
              <span className="mt-1 block font-mono text-[10px] font-bold text-slate-400" dir="ltr">
                <span className="text-emerald-300">{formatStatNumber(wins)}W</span>
                {" - "}
                <span className="text-slate-300">{formatStatNumber(draws)}D</span>
                {" - "}
                <span className="text-red-400">{formatStatNumber(losses)}L</span>
              </span>
            </div>
            <div className="col-span-2 rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-emerald-300/80">فرم اخیر</span>
                <span className="font-mono text-[10px] text-slate-400" dir="ltr">
                  {recentForm.length > 0 ? `${formatStatNumber(recentForm.length)} بازی` : "—"}
                </span>
              </div>
              <div className="mt-2 flex gap-1.5" dir="ltr">
                {recentForm.length > 0 ? recentForm.slice(0, 10).map((f: string, i: number) => {
                  const formInfo = formLabels[f] || { label: f, color: "bg-slate-500" };
                  return (
                    <div
                      key={i}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-white shadow ${formInfo.color}`}
                      title={formInfo.label}
                    >
                      {f === "W" ? "ب" : f === "D" ? "م" : f === "L" ? "ش" : f}
                    </div>
                  );
                }) : (
                  <span className="text-[11px] text-slate-400">فرم اخیری ثبت نشده است</span>
                )}
              </div>
            </div>
          </div>

          {/* Identity (middle) */}
          <div className="text-center lg:col-span-5">
            <h1 className="flex items-center justify-center gap-2 text-2xl font-black text-white sm:text-3xl">
              <span className="truncate">{coach.name}</span>
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-slate-200">{coach.coachingStyle || "مربی"}</span>
              {clubLogo && <img src={getSafeImageUrl(clubLogo)} alt="" loading="lazy" className="h-6 w-6 rounded-full bg-white/10 object-cover" referrerPolicy="no-referrer" />}
              {coach.teamName ? (
                <button type="button" onClick={() => onSelectTeam && onSelectTeam(coach.teamName)} className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-emerald-300 transition hover:bg-emerald-500/25">
                  {coach.teamName}
                </button>
              ) : (
                <span className="text-slate-300">مربی آزاد</span>
              )}
            </div>
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400">
              <Flag className="h-3.5 w-3.5" />
              <span>{coach.nationality || "نامشخص"}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 font-mono text-xs font-bold text-slate-200">
              <span title="سن">{formatStatNumber(coach.age || "—")} <span className="font-sans text-[10px] font-normal text-slate-400">سال</span></span>
              <span title="مدرک" className="font-sans">{coach.licenseLevel || "—"}</span>
              <span title="سابقه">{formatStatNumber(coach.experienceYears || "0")} <span className="font-sans text-[10px] font-normal text-slate-400">سال سابقه</span></span>
            </div>
          </div>

          {/* Photo (left in RTL = last) */}
          <div className="flex flex-col items-center gap-3 lg:col-span-3">
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-b from-emerald-400/40 to-cyan-500/10 opacity-40 blur" />
              <div className="relative h-44 w-36 overflow-hidden rounded-2xl border border-white/15 bg-white/5 sm:h-52 sm:w-44">
                {!imageError && coach.image ? (
                  <img src={getSafeImageUrl(coach.image)} alt={coach.name} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setImageError(true)} referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><UserRound className="h-16 w-16 text-slate-500" /></div>
                )}
              </div>
            </div>
            <ShareButton title={coach.name} />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#121215] shadow-xl">
        <div className="flex min-w-max items-center gap-1 p-1.5" role="tablist" aria-label="بخش‌های پروفایل مربی">
          {([
            { key: "overview", label: "خلاصه عملکرد", count: null },
            { key: "matches", label: "ریز کارنامه مسابقات", count: coachMatches.length },
            { key: "career", label: "افتخارات و سوابق", count: null },
            { key: "news", label: "اخبار", count: coachNews.length },
          ] as const).map((t) => {
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
                {t.count != null && t.count > 0 && (
                  <span className={`mr-1.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] ${active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-slate-400"}`}>
                    {formatStatNumber(t.count)}
                  </span>
                )}
                {active && <span className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-emerald-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          {(coach.seasons || []).length > 0 && (
            <div className="flex items-center justify-between gap-3 p-3.5 bg-[#131317] rounded-2xl border border-white/5 flex-wrap">
              <div className="text-right">
                <h4 className="font-black text-xs text-slate-200">فصل آمار</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">کارنامه یعنی جمع همه فصل‌ها؛ هر فصل تفکیک باشگاهی دارد</p>
              </div>
              <SeasonSwitcher seasons={coach.seasons} value={seasonId} onChange={setSeasonId} />
            </div>
          )}

          {!isCareerView && seasonRows.length > 1 && (
            <div className="p-4 rounded-2xl bg-[#131317] border border-white/5 space-y-2">
              <h4 className="font-black text-[11px] text-slate-300">تفکیک باشگاهی این فصل</h4>
              {seasonRows.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-[11px] bg-white/[0.02] border border-white/5 rounded-lg px-3 py-1.5">
                  <span className="font-bold text-white truncate">{r.teamName || "—"}</span>
                  <span className="font-mono text-slate-400 shrink-0">
                    {formatStatNumber(r.matches || 0)} بازی • {formatStatNumber(r.wins || 0)} برد • {formatStatNumber(r.draws || 0)} مساوی • {formatStatNumber(r.losses || 0)} باخت
                  </span>
                </div>
              ))}
            </div>
          )}

          {coach.biography && (
            <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
              <h3 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-emerald-500" />
                <span>بیوگرافی و معرفی</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">{coach.biography}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MiniStat icon={<Trophy className="h-5 w-5" />} label="بازی‌ها" value={formatStatNumber(matches)} sub="حضور روی نیمکت" tone="slate" />
            <MiniStat icon={<TrendingUp className="h-5 w-5" />} label="درصد برد" value={`${formatStatNumber(winRate)}%`} sub="نرخ پیروزی" tone="emerald" />
            <MiniStat icon={<Target className="h-5 w-5" />} label="تفاضل گل" value={`${goalsFor - goalsAgainst >= 0 ? "+" : ""}${formatStatNumber(goalsFor - goalsAgainst)}`} sub="زده منهای خورده" tone="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/5 bg-[#121215] p-4 shadow-xl">
              <h3 className="mb-3 text-sm font-black text-white">توزیع نتایج</h3>
              <PresenceStrip results={distribution} />
            </div>
            <div className="rounded-2xl border border-white/5 bg-[#121215] p-4 shadow-xl">
              <h3 className="mb-3 text-sm font-black text-white">نتایج فصلی</h3>
              <SeasonResultsBars data={seasonResultsData} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10">
              <h3 className="text-xs font-black text-white mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span>آمار کلی فصل</span>
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs border-b border-white/[0.04] pb-2 hover:bg-white/[0.02] px-1 rounded transition">
                  <span className="text-slate-400">بازی‌ها</span>
                  <span className="font-bold text-white font-mono">{formatStatNumber(matches)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/[0.04] pb-2 hover:bg-white/[0.02] px-1 rounded transition">
                  <span className="text-slate-400">برد</span>
                  <span className="font-bold text-emerald-400 font-mono drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]">{formatStatNumber(wins)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/[0.04] pb-2 hover:bg-white/[0.02] px-1 rounded transition">
                  <span className="text-slate-400">مساوی</span>
                  <span className="font-bold text-amber-400 font-mono">{formatStatNumber(draws)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/[0.04] pb-2 hover:bg-white/[0.02] px-1 rounded transition">
                  <span className="text-slate-400">باخت</span>
                  <span className="font-bold text-red-400 font-mono">{formatStatNumber(losses)}</span>
                </div>
                <div className="pt-2 flex justify-between items-center text-xs">
                  <span className="text-slate-400">درصد برد</span>
                  <span className="font-bold text-emerald-400 font-mono">{formatStatNumber(winRate)}%</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10">
              <h3 className="text-xs font-black text-white mb-3 flex items-center gap-1.5">
                <Target className="h-4 w-4 text-emerald-500" />
                <span>آمار گل و امتیاز</span>
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs border-b border-white/[0.04] pb-2 hover:bg-white/[0.02] px-1 rounded transition">
                  <span className="text-slate-400">گل زده</span>
                  <span className="font-bold text-emerald-400 font-mono drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]">{formatStatNumber(goalsFor)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/[0.04] pb-2 hover:bg-white/[0.02] px-1 rounded transition">
                  <span className="text-slate-400">گل خورده</span>
                  <span className="font-bold text-red-400 font-mono">{formatStatNumber(goalsAgainst)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/[0.04] pb-2 hover:bg-white/[0.02] px-1 rounded transition">
                  <span className="text-slate-400">تفاضل گل</span>
                  <span className={`font-bold font-mono ${goalsFor - goalsAgainst >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatStatNumber(goalsFor - goalsAgainst)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs px-1">
                  <span className="text-slate-400">میانگین گل زده هر بازی</span>
                  <span className="font-bold text-slate-100 font-mono">
                    {formatStatNumber(matches > 0 ? (goalsFor / matches).toFixed(1) : "0")}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === "matches" && (
        <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h3 className="font-black text-base text-white border-r-4 border-emerald-500 pr-2">
              ریز کارنامه مسابقات حضور یافته مربی در فصل جاری
            </h3>
            {(coach.seasons || []).length > 0 && (
              <SeasonSwitcher seasons={coach.seasons} value={seasonId} onChange={setSeasonId} />
            )}
          </div>

          {visibleCoachMatches.length > 0 ? (
            <div className="grid gap-3">
              {visibleCoachMatches.map((m, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectMatch && onSelectMatch(m.matchId)}
                  className="p-3 sm:p-4 rounded-xl bg-[#161619] border border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.01] cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                      m.result === "W" ? "bg-emerald-950/80 text-[#6ee7b7] border border-emerald-900/50" : m.result === "D" ? "bg-[#1e293b] text-[#cbd5e1]" : "bg-red-950/80 text-[#fca5a5] border border-red-900/50"
                    }`}>
                      {m.result === "W" ? "برد" : m.result === "D" ? "تساوی" : "باخت"}
                    </span>
                    <TeamLogo logo={m.opponentLogo} fallback="🔵" size="xs" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[13px] text-white font-bold">
                        <span className="truncate">{m.teamName}</span>
                        <span className="text-slate-500 text-xs shrink-0">مقابل</span>
                        <span className="truncate">{m.opponent}</span>
                      </div>
                      {m.date && (
                        <span className="mt-0.5 block font-mono text-[10px] text-slate-500">{formatStatNumber(convertGregorianToShamsi(String(m.date).slice(0, 10)))}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-center sm:text-right">
                    <span className="text-[10px] text-slate-500 block mb-0.5">نتیجه کلی مسابقه</span>
                    <strong className="font-mono text-slate-200 font-bold bg-black/40 px-2 py-1 rounded">
                      {formatStatNumber(m.scoreHome)} - {formatStatNumber(m.scoreAway)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 text-xs">
              <Award className="h-10 w-10 mx-auto mb-3 text-slate-600" />
              <p>جزئیات عملکرد مسابقات مربی پس از پایان هر بازی به صورت خودکار محاسبه و نمایش داده می‌شود.</p>
              <p className="mt-1 text-slate-600">تعداد کل مسابقات: {formatStatNumber(matches)}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "news" && (
        <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
          <h3 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5">
            <Newspaper className="h-4 w-4 text-emerald-500" />
            <span>آخرین اخبار {coach.name || "مربی"}</span>
          </h3>
          {coachNews.length > 0 ? (
            <div className="max-h-[420px] overflow-y-auto pr-1 space-y-2">
              {coachNews.map((nw: any) => (
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
                    {nw.createdAt && (
                      <span className="mt-1 block font-mono text-[10px] text-slate-500">{formatStatNumber(convertGregorianToShamsi(String(nw.createdAt).slice(0, 10)))}</span>
                    )}
                    {nw.summary && (
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{nw.summary}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 text-xs">
              <Newspaper className="h-10 w-10 mx-auto mb-3 text-slate-600" />
              <p>خبری مرتبط با این مربی یا تیم او یافت نشد.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "career" && (
        <div className="space-y-4">
          {/* Phase 6 spec order: [Transfer History] first, then [Career] */}
          <MovementTimeline items={coach.movements} title="سوابق ترانسفر باشگاهی" />

          <CareerSection
            kind="coach"
            seasonRows={coach.seasonRows}
            movements={coach.movements}
            seasons={coach.seasons}
            currentClubId={coach.teamId}
            currentClubName={coach.teamName}
          />

          {titles.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
              <h3 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-emerald-500" />
                <span>افتخارات و عناوین</span>
              </h3>
              <div className="space-y-2">
                {titles.map((title: string, i: number) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5">
                    <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-xs text-slate-300">{title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {coach.teamHistory && coach.teamHistory.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
              <h3 className="text-xs font-black text-slate-400 mb-4 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-500" />
                <span>سوابق و تاریخچه مربیگری</span>
              </h3>
              <div className="relative border-r border-white/10 pr-4 mr-2 space-y-4">
                {coach.teamHistory.map((history: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div className="absolute right-[-21px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-slate-950" />
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-white">
                          {history.teamName}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{history.role || "سرمربی"}</p>
                      </div>
                      <span className="text-[10px] bg-white/5 text-slate-300 font-bold px-2 py-0.5 rounded font-mono">
                        {formatStatNumber(history.startYear || "—")} - {formatStatNumber(history.endYear || "—")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {coach.careerHistory && coach.careerHistory.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#131317] border border-white/5 space-y-3">
              <h3 className="text-xs font-black text-slate-400 flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-emerald-500" />
                <span>آمار و عملکرد تفصیلی در فصل‌های آرشیو شده</span>
              </h3>
              <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/15 p-2">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-slate-500 text-[10px] border-b border-white/[0.04]">
                      <th className="py-3 px-2 font-bold">فصل کاری</th>
                      <th className="py-3 px-2 font-bold">باشگاه</th>
                      <th className="py-3 px-2 text-center font-bold">بازی‌ها</th>
                      <th className="py-3 px-2 text-center font-bold">برد / مساوی / باخت</th>
                      <th className="py-3 px-2 text-center font-bold">گل‌زده / گل‌خورده</th>
                      <th className="py-3 px-2 text-center font-bold">درصد برد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coach.careerHistory.map((history: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01]">
                        <td className="py-3 px-2 font-mono font-bold text-slate-300">{formatStatNumber(history.season)}</td>
                        <td className="py-3 px-2 font-semibold text-white">{history.club}</td>
                        <td className="py-3 px-2 text-center font-mono text-slate-400">{formatStatNumber(history.apps || 0)} بازی</td>
                        <td className="py-3 px-2 text-center font-mono text-slate-400 font-bold">
                          <span className="text-emerald-400">{formatStatNumber(history.wins || 0)}</span>
                          <span className="text-slate-600 px-1">/</span>
                          <span className="text-amber-400">{formatStatNumber(history.draws || 0)}</span>
                          <span className="text-slate-600 px-1">/</span>
                          <span className="text-red-400">{formatStatNumber(history.losses || 0)}</span>
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-400 font-bold">
                          <span className="text-emerald-400">{formatStatNumber(history.goalsFor || 0)}</span>
                          <span className="text-slate-600 px-1">:</span>
                          <span className="text-red-400">{formatStatNumber(history.goalsAgainst || 0)}</span>
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-emerald-400 font-bold">
                          {formatStatNumber(history.winRate || 0)}٪
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-[#131317] border border-white/5">
            <h3 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-emerald-500" />
              <span>اطلاعات حرفه‌ای</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] text-slate-500 mb-1">سبک مربیگری</span>
                <span className="text-xs font-bold text-white">{coach.coachingStyle || "—"}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 mb-1">مدرک مربیگری</span>
                <span className="text-xs font-bold text-white">{coach.licenseLevel || "—"}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 mb-1">سال‌های تجربه</span>
                <span className="text-xs font-bold text-white font-mono">{formatStatNumber(coach.experienceYears || "0")} سال</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 mb-1">ملیت</span>
                <span className="text-xs font-bold text-white">{coach.nationality || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
