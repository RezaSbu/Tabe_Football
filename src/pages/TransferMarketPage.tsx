import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatStatNumber } from "../utils";
import { getLeagueLabel } from "../shared/leagueLabel";
import MarketKpis from "../components/market/MarketKpis";
import MarketFiltersUI from "../components/market/MarketFilters";
import MarketTable from "../components/market/MarketTable";
import MarketCompare from "../components/market/MarketCompare";
import { TopValuableBars, ValueHistogram, valueBuckets } from "../components/market/MarketCharts";
import {
  EMPTY_FILTERS,
  applyMarketFilters,
  buildMarketRows,
  loadShortlist,
  marketOptions,
  marketRowsToCsv,
  saveShortlist,
  sortMarketRows,
  type MarketFilters,
  type MarketSort,
} from "../components/market/marketFilter";

const PAGE_SIZE = 24;

interface Props {
  players?: any[];
  teams?: any[];
}

const LEAGUE_KEYS = ["pro-league", "league-1", "league-2", "hazfi-cup"];

function numOrNull(v: string | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function filtersFromParams(params: URLSearchParams): MarketFilters {
  const csv = (k: string) => {
    const v = params.get(k);
    return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
  };
  return {
    query: params.get("q") || "",
    positions: csv("pos"),
    teamId: params.get("team") || "",
    league: params.get("league") || "",
    ageMin: numOrNull(params.get("ageMin")),
    ageMax: numOrNull(params.get("ageMax")),
    valueMin: numOrNull(params.get("vMin")),
    valueMax: numOrNull(params.get("vMax")),
    valueMissing: (params.get("vMiss") as MarketFilters["valueMissing"]) || "include",
    freeAgent: params.get("fa") === "1",
    nationality: params.get("nat") || "",
    foot: params.get("foot") || "",
    minMatches: numOrNull(params.get("m")),
    minRating: numOrNull(params.get("r")),
    minGoals: numOrNull(params.get("g")),
    minAssists: numOrNull(params.get("a")),
  };
}

function filtersToParams(f: MarketFilters): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.query) out.q = f.query;
  if (f.positions.length > 0) out.pos = f.positions.join(",");
  if (f.teamId) out.team = f.teamId;
  if (f.league) out.league = f.league;
  if (f.ageMin != null) out.ageMin = String(f.ageMin);
  if (f.ageMax != null) out.ageMax = String(f.ageMax);
  if (f.valueMin != null) out.vMin = String(f.valueMin);
  if (f.valueMax != null) out.vMax = String(f.valueMax);
  if (f.valueMissing !== "include") out.vMiss = f.valueMissing;
  if (f.freeAgent) out.fa = "1";
  if (f.nationality) out.nat = f.nationality;
  if (f.foot) out.foot = f.foot;
  if (f.minMatches != null) out.m = String(f.minMatches);
  if (f.minRating != null) out.r = String(f.minRating);
  if (f.minGoals != null) out.g = String(f.minGoals);
  if (f.minAssists != null) out.a = String(f.minAssists);
  return out;
}

export default function TransferMarketPage({ players = [], teams = [] }: Props) {
  const [params, setParams] = useSearchParams();
  const [f, setFState] = useState<MarketFilters>(() => ({ ...EMPTY_FILTERS, ...filtersFromParams(params) }));
  const [sort, setSortState] = useState<MarketSort>("rating");
  const [dir, setDir] = useState<1 | -1>(1);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [shortlist, setShortlist] = useState<string[]>(() => loadShortlist());
  const [shortOnly, setShortOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const mounted = useRef(false);

  // Filters <-> URL (shareable links). Skip the first render (state came from URL).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setParams(filtersToParams(f), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  useEffect(() => {
    saveShortlist(shortlist);
  }, [shortlist]);

  const set = (patch: Partial<MarketFilters>) => {
    setFState((prev) => ({ ...prev, ...patch }));
    setVisible(PAGE_SIZE);
  };
  const reset = () => {
    setFState(EMPTY_FILTERS);
    setVisible(PAGE_SIZE);
  };
  const setSort = (s: MarketSort) => {
    if (s === sort) {
      setDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortState(s);
      setDir(1);
    }
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };
  const toggleShortlist = (id: string) => {
    setShortlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const exportCsv = () => {
    const csv = marketRowsToCsv(sorted);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transfer-market.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const rows = useMemo(() => buildMarketRows(players, teams), [players, teams]);
  const opts = useMemo(() => marketOptions(rows, teams), [rows, teams]);
  const leagues = useMemo(
    () => LEAGUE_KEYS.map((key) => ({ key, label: getLeagueLabel(key) })),
    []
  );
  const filtered = useMemo(() => {
    const base = applyMarketFilters(rows, f);
    if (!shortOnly) return base;
    const set = new Set(shortlist);
    return base.filter((r) => set.has(String(r.player.id)));
  }, [rows, f, shortOnly, shortlist]);
  const sorted = useMemo(() => sortMarketRows(filtered, sort, dir), [filtered, sort, dir]);
  const valueRanks = useMemo(() => {
    const ranked = [...rows]
      .filter((r) => r.value != null)
      .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
    const map = new Map<string, number>();
    ranked.forEach((r, i) => map.set(String(r.player.id), i + 1));
    return map;
  }, [rows]);
  const buckets = useMemo(() => valueBuckets(rows), [rows]);
  const shown = useMemo(() => sorted.slice(0, visible), [sorted, visible]);
  const comparePlayers = useMemo(
    () => selectedIds.map((id) => (players || []).find((p: any) => String(p?.id) === String(id))).filter(Boolean),
    [selectedIds, players]
  );

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (f.query) activeChips.push({ key: "q", label: `جست‌وجو: ${f.query}`, clear: () => set({ query: "" }) });
  f.positions.forEach((p) => activeChips.push({ key: `pos-${p}`, label: p, clear: () => set({ positions: f.positions.filter((x) => x !== p) }) }));
  if (f.teamId) {
    const t = (teams || []).find((x: any) => String(x.id) === String(f.teamId));
    activeChips.push({ key: "team", label: String(t?.name || f.teamId), clear: () => set({ teamId: "" }) });
  }
  if (f.league) activeChips.push({ key: "lg", label: getLeagueLabel(f.league), clear: () => set({ league: "" }) });
  if (f.ageMin != null || f.ageMax != null)
    activeChips.push({ key: "age", label: `سن ${f.ageMin != null ? formatStatNumber(f.ageMin) : "…"} تا ${f.ageMax != null ? formatStatNumber(f.ageMax) : "…"}`, clear: () => set({ ageMin: null, ageMax: null }) });
  if (f.valueMin != null || f.valueMax != null) activeChips.push({ key: "val", label: "بازه ارزش", clear: () => set({ valueMin: null, valueMax: null }) });
  if (f.valueMissing !== "include")
    activeChips.push({ key: "vm", label: f.valueMissing === "only" ? "فقط بدون ارزش" : "فقط دارای ارزش", clear: () => set({ valueMissing: "include" }) });
  if (f.freeAgent) activeChips.push({ key: "fa", label: "بازیکن آزاد", clear: () => set({ freeAgent: false }) });
  if (f.nationality) activeChips.push({ key: "nat", label: f.nationality, clear: () => set({ nationality: "" }) });
  if (f.foot) activeChips.push({ key: "foot", label: f.foot, clear: () => set({ foot: "" }) });
  if (f.minMatches != null) activeChips.push({ key: "mm", label: `بازی ≥ ${formatStatNumber(f.minMatches)}`, clear: () => set({ minMatches: null }) });
  if (f.minRating != null) activeChips.push({ key: "mr", label: `نمره ≥ ${formatStatNumber(f.minRating)}`, clear: () => set({ minRating: null }) });
  if (f.minGoals != null) activeChips.push({ key: "mg", label: `گل ≥ ${formatStatNumber(f.minGoals)}`, clear: () => set({ minGoals: null }) });
  if (f.minAssists != null) activeChips.push({ key: "ma", label: `پاس ≥ ${formatStatNumber(f.minAssists)}`, clear: () => set({ minAssists: null }) });
  if (shortOnly) activeChips.push({ key: "so", label: `فقط لیست کوتاه (${formatStatNumber(shortlist.length)})`, clear: () => setShortOnly(false) });

  return (
    <div className="animate-in fade-in mx-auto w-full max-w-7xl space-y-4 duration-300" dir="rtl">
      <div className="px-1">
        <h1 className="text-xl font-black text-white sm:text-2xl">ترنسفر مارکت</h1>
        <p className="mt-1 text-[11px] text-slate-400">جست‌وجوی پیشرفته بازیکنان فوتبال ایران با فیلتر پست، باشگاه، لیگ، سن و ارزش بازار</p>
      </div>

      <MarketKpis rows={rows} />

      <MarketFiltersUI
        f={f}
        set={set}
        reset={reset}
        positions={opts.positions}
        nationalities={opts.nationalities}
        clubs={opts.clubs}
        leagues={leagues}
        valueMax={Math.max(opts.valueMax, 1000000000)}
        ageMin={opts.ageMin}
        ageMax={opts.ageMax}
        activeChips={activeChips}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-[#121215] p-4 shadow-xl">
          <h3 className="mb-3 text-sm font-black text-white">گران‌ترین بازیکنان</h3>
          <TopValuableBars rows={filtered} n={10} />
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#121215] p-4 shadow-xl">
          <h3 className="mb-1 text-sm font-black text-white">توزیع ارزش بازار</h3>
          <p className="mb-2 text-[10px] text-slate-500">کلیک روی هر ستون، همان بازه را فیلتر می‌کند</p>
          <ValueHistogram
            buckets={buckets}
            onPick={(b) => {
              if (b.missing) {
                set({ valueMin: null, valueMax: null, valueMissing: "only" });
              } else {
                set({ valueMin: b.min, valueMax: b.max, valueMissing: "include" });
              }
            }}
            activeMin={f.valueMin}
            activeMax={f.valueMax}
            missingActive={f.valueMissing === "only"}
          />
        </div>
      </div>

      <MarketTable
        rows={shown}
        total={filtered.length}
        sort={sort}
        dir={dir}
        setSort={setSort}
        hasMore={visible < sorted.length}
        onShowMore={() => setVisible((v) => v + PAGE_SIZE)}
        valueRanks={valueRanks}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onOpenCompare={() => setCompareOpen(true)}
        shortlist={shortlist}
        onToggleShortlist={toggleShortlist}
        shortOnly={shortOnly}
        onToggleShortOnly={() => setShortOnly((v) => !v)}
        shortCount={shortlist.length}
        onExport={exportCsv}
      />

      {compareOpen && comparePlayers.length === 2 && (
        <MarketCompare a={comparePlayers[0]} b={comparePlayers[1]} onClose={() => setCompareOpen(false)} />
      )}

      <p className="pb-2 text-center text-[10px] text-slate-500">ارزش‌ها محاسباتی و تقریبی‌اند؛ منبع داده‌ها سیستم آماری تب فوتبال است.</p>
    </div>
  );
}
