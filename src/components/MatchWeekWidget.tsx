import React, { useMemo, useState } from "react";
import MatchPitch from "../matchcenter/MatchPitch";
import { enrichMatchForPitch } from "../matchcenter/toPitchPlayer";
import { matchGroupTabs } from "../shared/matchGroup";
import { formatStatNumber } from "../utils";

export type WeekLeagueTab = "pro-league" | "league-1" | "league-2-a" | "league-2-b";

const LEAGUE_TABS: { key: WeekLeagueTab; label: string }[] = [
  { key: "pro-league", label: "لیگ برتر" },
  { key: "league-1", label: "لیگ یک" },
  { key: "league-2-a", label: "لیگ دو الف" },
  { key: "league-2-b", label: "لیگ دو ب" },
];

function weekNumber(week: unknown): number {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const latin = String(week ?? "").replace(/[۰-۹]/g, ch => String(fa.indexOf(ch)));
  const n = parseInt(latin.replace(/[^\d]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function matchInTab(m: any, tab: WeekLeagueTab, teams: any[]): boolean {
  if (tab === "pro-league" || tab === "league-1") return m.league === tab;
  if (m.league !== "league-2") return false;
  return matchGroupTabs(m, teams).includes(tab === "league-2-a" ? "a" : "b");
}

interface MatchWeekWidgetProps {
  matches: any[];
  players: any[];
  coaches: any[];
  teams: any[];
  onSelectPlayer: (id: string) => void;
  onSelectCoach: (id: string) => void;
  onOpenMatch: (id: string) => void;
}

export default function MatchWeekWidget({
  matches, players, coaches, teams, onSelectPlayer, onSelectCoach, onOpenMatch,
}: MatchWeekWidgetProps) {
  const [leagueTab, setLeagueTab] = useState<WeekLeagueTab>("pro-league");
  const [week, setWeek] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);

  const leagueMatches = useMemo(
    () => (matches || []).filter(m => matchInTab(m, leagueTab, teams)),
    [matches, leagueTab, teams]
  );

  const weeks = useMemo(() => {
    const set = new Map<string, number>();
    for (const m of leagueMatches) {
      const w = String(m.week || "").trim();
      if (!w) continue;
      if (!set.has(w)) set.set(w, weekNumber(w));
    }
    return [...set.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fa"))
      .map(([w]) => w);
  }, [leagueMatches]);

  const activeWeek = week && weeks.includes(week) ? week : weeks[0] || null;

  const weekMatches = useMemo(() => {
    if (!activeWeek) return [];
    return leagueMatches
      .filter(m => String(m.week || "").trim() === activeWeek)
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.time || "").localeCompare(String(b.time || "")));
  }, [leagueMatches, activeWeek]);

  const activeMatch = weekMatches.find(m => String(m.id) === String(matchId)) || null;
  const pitch = useMemo(
    () => (activeMatch ? enrichMatchForPitch(activeMatch, players, coaches) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeMatch?.id, activeMatch?.lineups, activeMatch?.events, activeMatch?.mvpId, players, coaches]
  );
  const hasLineups = !!activeMatch && (
    (activeMatch.lineups?.home || []).length > 0 || (activeMatch.lineups?.away || []).length > 0
  );

  const pickLeague = (key: WeekLeagueTab) => {
    setLeagueTab(key);
    setWeek(null);
    setMatchId(null);
  };
  const pickWeek = (w: string) => {
    setWeek(w);
    setMatchId(null);
  };

  return (
    <div className="rounded-2xl bg-[#121215] border border-white/5 shadow-xl overflow-hidden" dir="rtl">
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-white/5">
        <h2 className="font-black text-base sm:text-lg text-white">ترکیب هفته به تفکیک بازی</h2>
        <p className="text-[11px] text-slate-400 mt-1">لیگ، هفته و بازی را به ترتیب انتخاب کنید تا ترکیب همان بازی روی زمین نمایش داده شود.</p>
      </div>

      <div className="p-3 sm:p-4 space-y-4">
        {/* Step 1 — league */}
        <div>
          <div className="flex items-center gap-2 px-1 mb-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 font-mono text-[10px] font-black text-black" dir="ltr">1</span>
            <span className="text-[10px] font-black text-slate-400">انتخاب لیگ</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {LEAGUE_TABS.map(t => {
              const count = (matches || []).filter(m => matchInTab(m, t.key, teams)).length;
              const active = leagueTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => pickLeague(t.key)}
                  aria-pressed={active}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-black transition cursor-pointer min-h-[44px] border ${
                    active
                      ? "bg-emerald-500 text-black border-emerald-500 shadow-md shadow-emerald-950/40"
                      : "bg-white/[0.03] text-slate-300 border-white/5 hover:border-emerald-500/30 hover:text-white"
                  }`}
                >
                  <span>{t.label}</span>
                  <span className={`font-mono text-[10px] rounded-full px-1.5 py-0.5 ${active ? "bg-black/20" : "bg-white/5 text-slate-400"}`} dir="ltr">
                    {formatStatNumber(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 — week */}
        <div>
          <div className="flex items-center gap-2 px-1 mb-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 font-mono text-[10px] font-black text-black" dir="ltr">2</span>
            <span className="text-[10px] font-black text-slate-400">انتخاب هفته</span>
          </div>
          {weeks.length > 0 ? (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {weeks.map(w => (
                <button
                  key={w}
                  type="button"
                  onClick={() => pickWeek(w)}
                  aria-pressed={activeWeek === w}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black transition cursor-pointer min-h-[40px] border ${
                    activeWeek === w
                      ? "bg-emerald-500 text-black border-emerald-500 shadow-md"
                      : "bg-white/[0.03] text-slate-300 border-white/5 hover:border-emerald-500/30 hover:text-white"
                  }`}
                >
                  {formatStatNumber(w.replace(/[^\d\u06F0-\u06F9]/g, "") || w)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 px-1">برای این لیگ هفته‌ای ثبت نشده است.</p>
          )}
        </div>

        {/* Step 3 — match */}
        {activeWeek && (
          <div>
            <div className="flex items-center gap-2 px-1 mb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 font-mono text-[10px] font-black text-black" dir="ltr">3</span>
              <span className="text-[10px] font-black text-slate-400">انتخاب بازی‌های {activeWeek}</span>
            </div>
            {weekMatches.length > 0 ? (
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {weekMatches.map(m => {
                  const active = String(m.id) === String(matchId);
                  const hasXI = (m.lineups?.home || []).length > 0 || (m.lineups?.away || []).length > 0;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMatchId(String(m.id))}
                      aria-pressed={active}
                      className={`rounded-xl border px-3 py-2.5 text-right transition cursor-pointer min-h-[44px] ${
                        active
                          ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_16px_-6px_rgba(16,185,129,0.5)]"
                          : "bg-white/[0.02] border-white/5 hover:border-white/15"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2 text-xs font-black text-white">
                        <span className="truncate">{m.teamHome}</span>
                        <span className="font-mono text-[11px] text-emerald-300 shrink-0" dir="ltr">
                          {m.status === "not-started" ? "vs" : `${m.scoreHome ?? 0}-${m.scoreAway ?? 0}`}
                        </span>
                        <span className="truncate">{m.teamAway}</span>
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                        <span>{m.status === "finished" ? "پایان یافته" : m.status === "live" ? "زنده" : "پیش‌رو"}</span>
                        {hasXI && <span className="text-emerald-400 font-bold">ترکیب ثبت شده</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 px-1">بازی‌ای در این هفته ثبت نشده است.</p>
            )}
          </div>
        )}

        {/* Step 4 — pitch, full width */}
        {activeMatch && (
          <div>
            <div className="flex items-center gap-2 px-1 mb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 font-mono text-[10px] font-black text-black" dir="ltr">4</span>
              <span className="text-[10px] font-black text-slate-400">ترکیب بازی</span>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-black/20 p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black text-white truncate">
                  {activeMatch.teamHome} <span className="font-mono text-emerald-300" dir="ltr">{activeMatch.scoreHome ?? 0}-{activeMatch.scoreAway ?? 0}</span> {activeMatch.teamAway}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenMatch(String(activeMatch.id))}
                  className="shrink-0 rounded-xl bg-emerald-500 px-3 py-1.5 text-[11px] font-black text-black hover:bg-emerald-400 transition cursor-pointer"
                >
                  پروفایل بازی
                </button>
              </div>
              {hasLineups && pitch ? (
                <MatchPitch
                  home={pitch.home}
                  away={pitch.away}
                  homeSubs={pitch.homeSubs}
                  awaySubs={pitch.awaySubs}
                  homeName={activeMatch.teamHome}
                  awayName={activeMatch.teamAway}
                  homeLogo={activeMatch.teamHomeLogo}
                  awayLogo={activeMatch.teamAwayLogo}
                  formationHome={activeMatch.lineups?.formationHome}
                  formationAway={activeMatch.lineups?.formationAway}
                  onSelectPlayer={onSelectPlayer}
                  coaches={pitch.coaches}
                  onSelectCoach={onSelectCoach}
                />
              ) : (
                <p className="text-[11px] text-slate-500 text-center py-4">برای این بازی ترکیبی ثبت نشده است.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
