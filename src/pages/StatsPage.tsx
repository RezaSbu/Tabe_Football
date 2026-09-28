import React, { useState, useRef, useEffect } from "react";
import { Flame, Zap, Award, X, List, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatsData } from "../types";
import { resolveTeam, resolveTeamLeagueWithFallback, normalizeLeagueKey } from "../shared/teamMatch";
import SeasonSwitcher, { defaultSeasonValue } from "../components/SeasonSwitcher";
import { useSeasons, useSeasonData } from "../hooks/useSeasonData";

interface StatsPageProps {
  stats: Record<string, StatsData>;
  selectedLeagueFilterOnStats: string;
  setSelectedLeagueFilterOnStats: (s: string) => void;
  currentSeason: string;
  formatStatNumber: (s: string) => string;
  teams?: any[];
  players?: any[];
}

const VISIBLE_DEFAULT = 10;

function StatRow({
  p,
  idx,
  valueColor,
  valueRenderer,
  onSelectPlayer,
}: {
  p: any;
  idx: number;
  valueColor: string;
  valueRenderer: (p: any) => string;
  onSelectPlayer?: (id: string) => void;
}) {
  const name = p.name || "";
  return (
    <div
      onClick={() => {
        if (p.id && onSelectPlayer) onSelectPlayer(p.id);
      }}
      className={`flex justify-between items-center text-xs text-gray-300 border-b border-white/5 pb-2 last:border-0 last:pb-0 ${p.id && onSelectPlayer ? "cursor-pointer hover:bg-white/5 hover:rounded-lg hover:px-2 transition" : ""}`}
      title={onSelectPlayer && p.id ? `مشاهده پروفایل ${name}` : undefined}
    >
      <span className="font-bold flex items-center gap-1.5 min-w-0">
        <span className="text-gray-550 font-mono text-[10px] shrink-0">
          {p.rank || idx + 1}.
        </span>
        <span className="truncate">{name}</span>
        <span className="text-[10px] text-gray-500 shrink-0">
          ({p.team})
        </span>
      </span>
      <span
        className={`font-mono font-black ${valueColor} bg-gray-950 border border-white/5 px-2.5 py-0.5 rounded text-[11px] shrink-0 mr-2`}
      >
        {valueRenderer(p)}
      </span>
    </div>
  );
}

function StatColumn({
  title,
  icon,
  valueColor,
  items,
  valueRenderer,
  onSelectPlayer,
}: {
  title: string;
  icon: React.ReactNode;
  valueColor: string;
  items: any[];
  valueRenderer: (p: any) => string;
  onSelectPlayer?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [expanded]);

  const shown = expanded ? items : items.slice(0, VISIBLE_DEFAULT);

  return (
    <div ref={containerRef} className="rounded-2xl bg-gray-900 p-4 border border-white/5 shadow space-y-3">
      <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
        {icon}
        <h3 className="font-black text-sm text-white">{title}</h3>
      </div>
      <div
        ref={scrollRef}
        className="space-y-2.5 font-bold overflow-y-auto overscroll-contain"
        style={{
          maxHeight: expanded ? "min(60vh, 400px)" : undefined,
        }}
      >
        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-4 text-xs">
            اطلاعاتی ثبت نشده
          </p>
        ) : (
          shown.map((p: any, idx: number) => (
            <StatRow
              key={`${p.name}-${idx}`}
              p={p}
              idx={idx}
              valueColor={valueColor}
              valueRenderer={valueRenderer}
              onSelectPlayer={onSelectPlayer}
            />
          ))
        )}
      </div>

      {items.length > VISIBLE_DEFAULT && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full mt-1 py-2 rounded-xl bg-[#0a0a0c] hover:bg-gray-950 border border-white/5 text-[11px] font-bold text-emerald-400 hover:text-white transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
        >
          {expanded ? (
            <>
              <X className="h-3.5 w-3.5" />
              <span>بستن لیست</span>
            </>
          ) : (
            <>
              <List className="h-3.5 w-3.5" />
              <span>نمایش همه</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function StatsPage({
  stats,
  selectedLeagueFilterOnStats,
  setSelectedLeagueFilterOnStats,
  currentSeason,
  formatStatNumber,
  teams = [],
  players = [],
}: StatsPageProps) {
  const navigate = useNavigate();

  // Phase 5: per-season leaders from the season tables ("career" = the
  // all-time leaderboards, previous behavior). Team scope uses the played-for
  // club with the shared league mapping (single source of truth).
  const seasons = useSeasons();
  const [seasonId, setSeasonId] = useState("");
  useEffect(() => {
    if (!seasonId && seasons.length > 0) setSeasonId(defaultSeasonValue(seasons, true));
  }, [seasons, seasonId]);
  const isCareerView = seasonId === "career" || !seasonId;
  const { playerRows, loading: seasonLoading } = useSeasonData(isCareerView ? null : seasonId);

  const buildSeasonLeaders = (): StatsData | null => {
    if (isCareerView || seasonLoading) return null;
    const useCup = selectedLeagueFilterOnStats === "hazfi-cup";
    const split = useCup ? "cupStats" : "leagueStats";
    const wantLeague = useCup ? null : normalizeLeagueKey(selectedLeagueFilterOnStats);
    // Same convention as the server leaderboards: eligibility AND display
    // club are the player's CURRENT club; only numbers are season-scoped.
    const pById = new Map<string, any>();
    for (const p of players || []) {
      if (p && p.id != null && !pById.has(String(p.id))) pById.set(String(p.id), p);
    }
    const currentClubOf = (pid: string): any | null => {
      const p = pById.get(String(pid));
      if (!p) return null;
      if (!p.teamId && !p.teamName) return null;
      const nm = String(p.teamName || "");
      if (!nm || nm === "بازیکن آزاد" || nm === "بدون باشگاه") return null;
      return resolveTeam(teams, p.teamId || p.teamName) || null;
    };
    const byId = new Map<string, any>();
    for (const r of playerRows) {
      if (!r || r.playerId == null) continue;
      const s = r[split] || {};
      const g = Number(s.goals) || 0, a = Number(s.assists) || 0, cs = Number(s.cleanSheets) || 0;
      const rs = Number(s.ratingSum) || 0, rc = Number(s.ratingCount) || 0;
      if (g === 0 && a === 0 && cs === 0 && rc === 0) continue;
      let agg = byId.get(String(r.playerId));
      if (!agg) {
        agg = { id: String(r.playerId), goals: 0, assists: 0, cleanSheets: 0, ratingSum: 0, ratingCount: 0 };
        byId.set(String(r.playerId), agg);
      }
      agg.goals += g;
      agg.assists += a;
      agg.cleanSheets += cs;
      agg.ratingSum += rs;
      agg.ratingCount += rc;
    }
    const all: any[] = [];
    for (const agg of byId.values()) {
      const club = currentClubOf(agg.id);
      if (useCup) {
        if (agg.goals === 0 && agg.assists === 0 && agg.cleanSheets === 0) continue;
      } else {
        if (!club) continue;
        if (normalizeLeagueKey(resolveTeamLeagueWithFallback(teams, club.id, club.name)) !== wantLeague) continue;
        if (agg.goals === 0 && agg.assists === 0 && agg.cleanSheets === 0 && agg.ratingCount === 0) continue;
      }
      const p = pById.get(agg.id);
      all.push({ ...agg, name: p?.name || "", team: club ? club.name : (p?.teamName || "") });
    }
    const posById = new Map<string, string>();
    for (const p of players || []) {
      if (p && p.id != null && !posById.has(String(p.id))) posById.set(String(p.id), p.position || "");
    }
    const withRank = (arr: any[], key: string, extra: (a: any) => any) =>
      arr
        .filter((a: any) => Number(a[key]) > 0)
        .sort((x: any, y: any) => Number(y[key]) - Number(x[key]))
        .map((a: any, idx: number) => ({ rank: idx + 1, id: a.id, name: a.name, team: a.team, ...extra(a) }));
    return {
      scorers: withRank(all, "goals", (a) => ({ goals: a.goals, penalties: 0 })),
      assists: withRank(all, "assists", (a) => ({ assists: a.assists })),
      cleansheets: withRank(
        all.filter((a: any) => String(posById.get(a.id) || "").includes("دروازه")),
        "cleanSheets",
        (a) => ({ cleanSheets: a.cleanSheets })
      ),
      ratings: all
        .filter((a: any) => a.ratingCount > 0)
        .map((a: any) => ({ ...a, rating: parseFloat((a.ratingSum / a.ratingCount).toFixed(1)) }))
        .filter((a: any) => a.rating > 0)
        .sort((a: any, b: any) => b.rating - a.rating)
        .map((a: any, idx: number) => ({ rank: idx + 1, id: a.id, name: a.name, team: a.team, rating: a.rating })),
    } as StatsData;
  };

  const seasonLeaders = buildSeasonLeaders();
  // Current-season only: no archived seasons anymore.
  const activeStatsData = seasonLeaders || stats[selectedLeagueFilterOnStats] || null;

  return (
    <div
      className="space-y-6 animate-in fade-in"
      dir="rtl"
      id="stats-dashboard"
    >
      <div className="rounded-2xl bg-gradient-to-l from-red-950/20 via-gray-900 to-gray-900 p-5 border border-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-2xl text-white">
            📊 آمار و ارقام برتر فوتبال ایران
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            جدول دقیق گلزنان، پاس گل و دروازه‌بانان کشور
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/50 border border-white/5 rounded-xl px-3 py-1.5 w-fit text-xs text-slate-300">
          <span className="text-gray-400 font-bold">فصل رقابت‌ها:</span>
          {seasons.length > 0 ? (
            <SeasonSwitcher seasons={seasons} value={seasonId || "career"} onChange={setSeasonId} />
          ) : (
            <span className="text-white font-extrabold">
              فصل جاری ({formatStatNumber(currentSeason)})
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 border-b border-white/5 pb-2 overflow-x-auto select-none no-scrollbar">
        {[
          { id: "pro-league", label: "لیگ برتر خلیج فارس" },
          { id: "league-1", label: "لیگ آزادگان (دسته یک)" },
          { id: "league-2", label: "لیگ دسته دوم" },
          { id: "hazfi-cup", label: "جام حذفی" },
          // { id: "futsal", label: "لیگ برتر فوتسال" },   // [آرشیو] بخش فوتسال از UI عمومی مخفی شده
        ].map((subTab) => (
          <button
            key={subTab.id}
            onClick={() => setSelectedLeagueFilterOnStats(subTab.id)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              selectedLeagueFilterOnStats === subTab.id
                ? "bg-red-600 text-white shadow"
                : "text-gray-400 hover:text-white hover:bg-gray-900/40"
            }`}
          >
            {subTab.label}
          </button>
        ))}
      </div>

      {!activeStatsData ? (
        <p className="text-center text-gray-400 py-12 text-xs font-bold bg-gray-900/30 rounded-2xl border border-white/5">
          آماری برای این فصل یا لیگ ثبت نگردیده است.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatColumn
            title="گلزنان"
            icon={<Flame className="h-5 w-5 text-red-500 animate-pulse" />}
            valueColor="text-red-500"
            items={activeStatsData.scorers || []}
            valueRenderer={(p: any) =>
              `${p.goals} گل${p.penalties > 0 ? ` (${p.penalties} پنالتی)` : ""}`
            }
            onSelectPlayer={(id) => navigate(`/player/${id}`)}
          />

          <StatColumn
            title="پاس گل"
            icon={<Zap className="h-5 w-5 text-sky-400" />}
            valueColor="text-sky-400"
            items={activeStatsData.assists || []}
            valueRenderer={(p: any) => `${p.assists} پاس`}
            onSelectPlayer={(id) => navigate(`/player/${id}`)}
          />

          <StatColumn
            title="کلین‌شیت"
            icon={<Award className="h-5 w-5 text-amber-500" />}
            valueColor="text-amber-550"
            items={activeStatsData.cleansheets || []}
            valueRenderer={(p: any) => `${p.cleanSheets} کلین‌شیت`}
            onSelectPlayer={(id) => navigate(`/player/${id}`)}
          />

          <StatColumn
            title="میانگین نمره بازیکن"
            icon={<Star className="h-5 w-5 text-emerald-400" />}
            valueColor="text-emerald-400"
            items={(activeStatsData.ratings || []).filter((p: any) => p.rating > 0)}
            valueRenderer={(p: any) => `${formatStatNumber(Number(p.rating).toFixed(1))}`}
            onSelectPlayer={(id) => navigate(`/player/${id}`)}
          />
        </div>
      )}
    </div>
  );
}
