import React, { useState, useRef, useEffect } from "react";
import { Flame, Zap, Award, X, List, Star } from "lucide-react";
import { StatsData } from "../types";
import { normalizeLeagueKey } from "../shared/teamMatch";
import SeasonSwitcher, { defaultSeasonValue } from "../components/SeasonSwitcher";
import PositionLeaders from "../components/PositionLeaders";
import { buildPositionLeaders, PositionCandidate } from "../shared/positionLeaders";
import { aggregateSeasonRows, AggregatedPlayer, toPositionCandidates } from "../shared/seasonAggregate";
import { useSeasons, useSeasonData, useCareerPlayerRows } from "../hooks/useSeasonData";
import { useSmartNavigate } from "../hooks/useSmartNavigate";

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
<span className="font-mono text-[10px] font-black shrink-0 w-5 h-5 rounded-full inline-flex items-center justify-center bg-white/5 border border-white/10 text-slate-300">
                  {p.rank || idx + 1}
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
  const navigate = useSmartNavigate();

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

  // Season view walks the picked season's rows; the career view lazily loads
  // every season's rows so its per-position boards are true all-time numbers.
  const { rows: careerRows, loading: careerLoading } = useCareerPlayerRows(isCareerView);

  const useCup = selectedLeagueFilterOnStats === "hazfi-cup";
  const split = useCup ? "cupStats" : "leagueStats";
  const wantLeague = useCup ? null : normalizeLeagueKey(selectedLeagueFilterOnStats);

  const seasonAggregates: AggregatedPlayer[] | null =
    !isCareerView && !seasonLoading
      ? aggregateSeasonRows({ rows: playerRows, players, teams, split, wantLeague })
      : null;
  const careerAggregates: AggregatedPlayer[] | null =
    isCareerView && !careerLoading && careerRows.length > 0
      ? aggregateSeasonRows({ rows: careerRows, players, teams, split, wantLeague })
      : null;

  // Scores/assists/clean sheets are aggregated locally from the same rows;
  // ratings stay server-side (min-5-rated-games rule) so every surface agrees.
  const buildSeasonLeaders = (aggregates: AggregatedPlayer[]): StatsData => {
    const withRank = (
      rows: AggregatedPlayer[],
      key: "goals" | "assists" | "cleanSheets",
      extra: (row: AggregatedPlayer) => any
    ) =>
      rows
        .filter((row) => Number(row[key]) > 0)
        .sort((a, b) => Number(b[key]) - Number(a[key]))
        .map((row, index) => ({ rank: index + 1, id: row.id, name: row.name, team: row.team, ...extra(row) }));
    return {
      scorers: withRank(aggregates, "goals", (row) => ({ goals: row.goals, penalties: 0 })),
      assists: withRank(aggregates, "assists", (row) => ({ assists: row.assists })),
      cleansheets: withRank(
        aggregates.filter((row) => row.position.includes("دروازه")),
        "cleanSheets",
        (row) => ({ cleanSheets: row.cleanSheets })
      ),
      ratings: ((stats || {})[useCup ? "hazfi-cup" : selectedLeagueFilterOnStats]?.ratings || []) as any[],
    } as StatsData;
  };

  const seasonLeaders = seasonAggregates ? buildSeasonLeaders(seasonAggregates) : null;

  // Per-position boards. Season rows first, then the all-season rows; the
  // server leaderboard is only a defensive fallback (e.g. while career data is
  // still loading) because its min-5-rated-games gate is stricter than ours.
  const positionLeaderCandidates: PositionCandidate[] = (() => {
    if (seasonAggregates) return toPositionCandidates(seasonAggregates);
    if (careerAggregates) return toPositionCandidates(careerAggregates);
    const posById = new Map<string, string>();
    for (const p of players || []) {
      if (p && p.id != null && !posById.has(String(p.id))) posById.set(String(p.id), p.position || "");
    }
    const rows = ((stats || {})[selectedLeagueFilterOnStats]?.ratings || []) as any[];
    return rows.map((r: any) => ({
      id: String(r.id ?? ""),
      name: r.name || "",
      team: r.team || "",
      position: posById.get(String(r.id ?? "")) || "",
      rating: Number(r.rating) || 0,
      matches: Number(r.matches) || 0,
    }));
  })();
  const positionLeaders = buildPositionLeaders(positionLeaderCandidates);

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
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-start">
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

          {/* Per-position boards live here (and in each league's stats tab),
              never in the compact home stats widget. */}
          <PositionLeaders
            groups={positionLeaders}
            onSelectPlayer={(id) => navigate(`/player/${id}`)}
          />
        </div>
      )}
    </div>
  );
}
