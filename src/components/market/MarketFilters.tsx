import React from "react";
import { Search, RotateCcw, ChevronDown, Star } from "lucide-react";
import { formatStatNumber } from "../../utils";
import { formatCompactEuro } from "../player/PlayerHero";
import type { MarketFilters } from "./marketFilter";

function DualSlider({
  min, max, step, lo, hi, onChange, format,
}: {
  min: number; max: number; step: number;
  lo: number | null; hi: number | null;
  onChange: (lo: number | null, hi: number | null) => void;
  format: (v: number) => string;
}) {
  const loV = lo ?? min;
  const hiV = hi ?? max;
  const pct = (v: number) => ((Math.min(Math.max(v, min), max) - min) / Math.max(1, max - min)) * 100;
  return (
    <div dir="rtl">
      <div className="mb-1 flex items-center justify-between font-mono text-[11px] font-black text-slate-200">
        <span>{format(hiV)}</span>
        <span className="text-slate-500">{format(loV)}</span>
      </div>
      <div className="relative h-6" dir="ltr">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/10" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-emerald-500"
          style={{ left: `${pct(loV)}%`, width: `${Math.max(0, pct(hiV) - pct(loV))}%` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={loV}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(v <= min ? null : Math.min(v, hiV), hiV >= max ? null : hiV);
          }}
          className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent accent-emerald-500"
          aria-label="حداقل"
        />
        <input
          type="range" min={min} max={max} step={step} value={hiV}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(loV <= min ? null : loV, v >= max ? null : Math.max(v, loV));
          }}
          className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent accent-emerald-500"
          aria-label="حداکثر"
        />
      </div>
    </div>
  );
}

const selectCls =
  "w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none";
const numCls =
  "w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-white focus:border-emerald-500 focus:outline-none";

interface Props {
  f: MarketFilters;
  set: (patch: Partial<MarketFilters>) => void;
  reset: () => void;
  positions: string[];
  nationalities: string[];
  clubs: any[];
  leagues: { key: string; label: string }[];
  valueMax: number;
  ageMin: number;
  ageMax: number;
  activeChips: { key: string; label: string; clear: () => void }[];
}

export default function MarketFiltersUI(props: Props) {
  const { f, set, reset, positions, nationalities, clubs, leagues, valueMax, ageMin, ageMax, activeChips } = props;
  const [advanced, setAdvanced] = React.useState(false);
  const togglePosition = (pos: string) => {
    set({ positions: f.positions.includes(pos) ? f.positions.filter((p) => p !== pos) : [...f.positions, pos] });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/5 bg-[#121215] p-4 shadow-xl sm:p-5" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black text-white">فیلترهای اصلی</h3>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-black text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          حذف همه
        </button>
      </div>

      {/* search */}
      <div className="relative">
        <input
          type="text"
          value={f.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder="جست‌وجوی نام بازیکن یا باشگاه..."
          className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 pl-4 pr-10 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        />
        <Search className="absolute right-3 top-3 h-4 w-4 text-slate-500" />
      </div>

      {/* positions */}
      {positions.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-slate-400">پست</p>
          <div className="flex flex-wrap gap-1.5">
            {positions.map((pos) => {
              const on = f.positions.includes(pos);
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => togglePosition(pos)}
                  aria-pressed={on}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-black transition ${
                    on ? "border-emerald-500 bg-emerald-500/15 text-emerald-300" : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                  }`}
                >
                  {pos}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-slate-400">باشگاه فعلی</p>
          <select value={f.teamId} onChange={(e) => set({ teamId: e.target.value })} className={selectCls}>
            <option value="">همه باشگاه‌ها</option>
            {clubs.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-slate-400">لیگ</p>
          <select value={f.league} onChange={(e) => set({ league: e.target.value })} className={selectCls}>
            <option value="">همه لیگ‌ها</option>
            {leagues.map((l) => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-1 cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs font-bold text-slate-300">
            <span>بازیکن آزاد</span>
            <button
              type="button"
              role="switch"
              aria-checked={f.freeAgent}
              onClick={() => set({ freeAgent: !f.freeAgent })}
              className={`relative h-5 w-9 shrink-0 rounded-full transition ${f.freeAgent ? "bg-emerald-500" : "bg-white/15"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${f.freeAgent ? "left-0.5" : "left-[18px]"}`} />
            </button>
          </label>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-slate-400">وضعیت ارزش</p>
          <select
            value={f.valueMissing}
            onChange={(e) => set({ valueMissing: e.target.value as MarketFilters["valueMissing"] })}
            className={selectCls}
          >
            <option value="include">همه (دارا و ندار)</option>
            <option value="exclude">فقط دارای ارزش</option>
            <option value="only">فقط بدون ارزش</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-[11px] font-bold text-slate-400">سن (سال)</p>
          <DualSlider
            min={ageMin} max={ageMax} step={1}
            lo={f.ageMin} hi={f.ageMax}
            onChange={(lo, hi) => set({ ageMin: lo, ageMax: hi })}
            format={(v) => formatStatNumber(v)}
          />
        </div>
        <div>
          <p className="mb-1 text-[11px] font-bold text-slate-400">ارزش بازار (تومان)</p>
          <DualSlider
            min={1000000000} max={valueMax} step={100000000}
            lo={f.valueMin} hi={f.valueMax}
            onChange={(lo, hi) => set({ valueMin: lo, valueMax: hi })}
            format={(v) => formatCompactEuro(v, "")}
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[
              { label: "زیر ۱.۵B", lo: null, hi: 1500000000 },
              { label: "۱ تا ۳B", lo: 1000000000, hi: 3000000000 },
              { label: "بالای ۳B", lo: 3000000000, hi: null },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => set({ valueMin: p.lo, valueMax: p.hi })}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* advanced */}
      <div>
        <button
          type="button"
          onClick={() => setAdvanced(!advanced)}
          className="flex items-center gap-1 text-[11px] font-black text-slate-400 transition hover:text-white"
        >
          فیلترهای پیشرفته
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advanced ? "rotate-180" : ""}`} />
        </button>
        {advanced && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="mb-1.5 text-[11px] font-bold text-slate-400">ملیت</p>
              <select value={f.nationality} onChange={(e) => set({ nationality: e.target.value })} className={selectCls}>
                <option value="">همه</option>
                {nationalities.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold text-slate-400">پای تخصصی</p>
              <select value={f.foot} onChange={(e) => set({ foot: e.target.value })} className={selectCls}>
                <option value="">همه</option>
                <option value="راست">راست‌پا</option>
                <option value="چپ">چپ‌پا</option>
                <option value="دوپا">دوپا</option>
              </select>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold text-slate-400">حداقل بازی</p>
              <input type="number" min={0} value={f.minMatches ?? ""} onChange={(e) => set({ minMatches: e.target.value === "" ? null : Number(e.target.value) })} className={numCls} placeholder="۰" />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold text-slate-400">حداقل نمره</p>
              <input type="number" min={0} max={10} step={0.1} value={f.minRating ?? ""} onChange={(e) => set({ minRating: e.target.value === "" ? null : Number(e.target.value) })} className={numCls} placeholder="۰" />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold text-slate-400">حداقل گل</p>
              <input type="number" min={0} value={f.minGoals ?? ""} onChange={(e) => set({ minGoals: e.target.value === "" ? null : Number(e.target.value) })} className={numCls} placeholder="۰" />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold text-slate-400">حداقل پاس گل</p>
              <input type="number" min={0} value={f.minAssists ?? ""} onChange={(e) => set({ minAssists: e.target.value === "" ? null : Number(e.target.value) })} className={numCls} placeholder="۰" />
            </div>
          </div>
        )}
      </div>

      {/* active chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-3">
          <Star className="h-3.5 w-3.5 text-slate-500" />
          {activeChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              title="حذف فیلتر"
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-300 transition hover:bg-emerald-500/20"
            >
              {c.label} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
