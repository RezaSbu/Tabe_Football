import React from "react";
import { Link } from "react-router-dom";
import { getSafeImageUrl, formatStatNumber } from "../../utils";
import { formatCompactEuro } from "../player/PlayerHero";
import type { MarketRow } from "./marketFilter";

/* Value-history sparkline for table rows (market history is real). */
export function RowSparkline({ history, width = 72, height = 24 }: { history: { value: number }[]; width?: number; height?: number }) {
  const vals = (history || []).map((h) => Number(h.value) || 0).filter((v) => v > 0);
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const pts = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * (width - 4) + 2;
      const y = height - 3 - ((v - min) / span) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Top-N most valuable (horizontal bars with photos). */
export function TopValuableBars({ rows, n = 10 }: { rows: MarketRow[]; n?: number }) {
  const top = [...rows]
    .filter((r) => r.value != null)
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    .slice(0, n);
  if (top.length === 0) {
    return <p className="py-6 text-center text-xs font-bold text-slate-400">ارزشی ثبت نشده است</p>;
  }
  const max = Math.max(...top.map((r) => Number(r.value) || 0), 1);
  return (
    <ul className="space-y-2" dir="rtl">
      {top.map((r, i) => (
        <li key={r.player.id}>
          <Link to={`/player/${r.player.id}`} className="group flex items-center gap-2.5">
            <span className="w-5 shrink-0 text-center font-mono text-[11px] font-black text-slate-500">{formatStatNumber(i + 1)}</span>
            {r.player.image ? (
              <img src={getSafeImageUrl(r.player.image)} alt={r.player.name} loading="lazy" className="h-8 w-8 shrink-0 rounded-full bg-white/5 object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="h-8 w-8 shrink-0 rounded-full bg-white/5" />
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[11px] font-black text-slate-100 group-hover:text-emerald-300">{r.player.name}</span>
                <span className="shrink-0 font-mono text-[11px] font-black text-emerald-400" dir="ltr">
                  {formatCompactEuro(Number(r.value) || 0, r.player.marketValue?.currency || "تومان")}
                </span>
              </span>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/5">
                <span className="block h-full rounded-full bg-gradient-to-l from-emerald-500 to-emerald-400" style={{ width: `${((Number(r.value) || 0) / max) * 100}%` }} />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export interface ValueBucket {
  label: string;
  min: number | null;
  max: number | null;
  missing?: boolean;
  count: number;
}

/* Interactive value histogram: clicking a bucket applies that range filter. */
export function ValueHistogram({
  buckets,
  onPick,
  activeMin,
  activeMax,
  missingActive,
}: {
  buckets: ValueBucket[];
  onPick: (bucket: ValueBucket) => void;
  activeMin: number | null;
  activeMax: number | null;
  missingActive: boolean;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((a, b) => a + b.count, 0);
  if (total === 0) {
    return <p className="py-6 text-center text-xs font-bold text-slate-400">دیتایی برای توزیع نیست</p>;
  }
  return (
    <div className="flex items-end justify-around gap-2" style={{ height: 150 }} dir="rtl">
      {buckets.map((b, i) => {
        const isMissingBucket = b.missing === true;
        const active = isMissingBucket
          ? missingActive
          : (b.min == null || activeMin === b.min) && (b.max == null || activeMax === b.max) && (activeMin != null || activeMax != null);
        return (
          <button
            key={`${b.label}-${i}`}
            type="button"
            onClick={() => onPick(b)}
            title={`${b.label}: ${formatStatNumber(b.count)} بازیکن — کلیک برای فیلتر`}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-lg p-1 transition hover:bg-white/5"
          >
            <span className="font-mono text-[10px] font-black text-slate-200">{formatStatNumber(b.count)}</span>
            <span
              className={`w-full max-w-12 rounded-t transition ${active ? "bg-emerald-400" : "bg-emerald-500/70 hover:bg-emerald-400"}`}
              style={{ height: `${Math.max(b.count > 0 ? 8 : 2, (b.count / max) * 100)}px` }}
            />
            <span className={`text-[9px] font-bold ${active ? "text-emerald-300" : "text-slate-500"}`}>{b.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Fixed Persian-toman buckets aligned with the filter presets. */
export function valueBuckets(rows: MarketRow[]): ValueBucket[] {
  const defs: { label: string; min: number | null; max: number | null; missing?: boolean }[] = [
    { label: "زیر ۲B", min: null, max: 2000000000 },
    { label: "۲–۳B", min: 2000000000, max: 3000000000 },
    { label: "بالای ۳B", min: 3000000000, max: null },
    { label: "بدون ارزش", min: null, max: null, missing: true },
  ];
  return defs.map((d) => {
    let count: number;
    if (d.missing) {
      count = rows.filter((r) => r.value == null).length;
    } else if (d.min == null) {
      count = rows.filter((r) => r.value != null && (r.value as number) < (d.max as number)).length;
    } else if (d.max == null) {
      count = rows.filter((r) => r.value != null && (r.value as number) >= (d.min as number)).length;
    } else {
      count = rows.filter((r) => r.value != null && (r.value as number) >= (d.min as number) && (r.value as number) < (d.max as number)).length;
    }
    return { min: d.min, max: d.max, label: d.label, missing: d.missing, count };
  });
}
