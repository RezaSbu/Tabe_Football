import React from "react";
import { formatStatNumber } from "../../utils";

// Hand-written inline SVG charts (repo has NO chart library — see tabe-football-ui).
// All digits Latin + font-mono (see tabe-persian-rtl).

export function ratingColor(v: number): string {
  if (v >= 7.5) return "#059669";
  if (v >= 6.5) return "#d97706";
  return "#64748b";
}

/* Tiny sparkline for KPI cards (dark navy background) */
export function Sparkline({ values, width = 96, height = 30 }: { values: number[]; width?: number; height?: number }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 4) + 2;
    const y = height - 4 - ((v - min) / span) * (height - 10);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden="true">
      <polyline points={pts.join(" ")} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r="2.6" fill="#34d399" />
    </svg>
  );
}

/* Form ring (0-100). Null-safe: renders a dash placeholder. */
export function FormRing({ value, size = 64 }: { value: number | null; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={value == null ? "فرم ثبت نشده" : `فرم اخیر ${value} از 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="7" className="stroke-white/10" />
        {value != null && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#34d399" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${((pct / 100) * c).toFixed(1)} ${c.toFixed(1)}`} />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-lg font-black text-white">
        {value == null ? "—" : formatStatNumber(Math.round(value))}
      </span>
    </div>
  );
}

/* Presence results strip: W/D/L of the matches the player appeared in.
   Answers "what did the team do with him on the pitch?" — real match logs. */
export function PresenceStrip({ results }: { results: ("W" | "D" | "L")[] }) {
  const total = results.length;
  if (total === 0) {
    return <p className="py-6 text-center text-xs font-bold text-slate-400">بازی ثبت‌شده‌ای وجود ندارد</p>;
  }
  const w = results.filter((r) => r === "W").length;
  const d = results.filter((r) => r === "D").length;
  const l = total - w - d;
  const ppg = (3 * w + d) / total;
  const unbeaten = total > 0 ? Math.round(((w + d) / total) * 100) : 0;
  const seg = (n: number, cls: string) =>
    n > 0 ? <span className={`h-full ${cls}`} style={{ width: `${(n / total) * 100}%` }} /> : null;
  return (
    <div dir="rtl">
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/5" dir="ltr">
        {seg(w, "bg-emerald-500")}
        {seg(d, "bg-amber-500")}
        {seg(l, "bg-rose-500")}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          { label: "برد", value: w, cls: "text-emerald-400" },
          { label: "مساوی", value: d, cls: "text-amber-400" },
          { label: "باخت", value: l, cls: "text-rose-400" },
          { label: "امتیاز هر بازی", value: ppg.toFixed(2), cls: "text-white" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white/5 px-1 py-2">
            <p className={`font-mono text-lg font-black ${s.cls}`} dir="ltr">
              {typeof s.value === "number" ? formatStatNumber(s.value) : s.value}
            </p>
            <p className="mt-0.5 text-[9px] text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-center text-[11px] font-bold text-slate-400">
        از <span className="font-mono text-slate-200">{formatStatNumber(total)}</span> بازی با حضور او،
        <span className="font-mono text-emerald-400"> {formatStatNumber(unbeaten)}٪ </span>
        بدون شکست
      </p>
    </div>
  );
}

export interface SeasonResult {
  season: string;
  wins: number;
  draws: number;
  losses: number;
}

/* Season-by-season W/D/L stacked bars (coach career; all real rows). */
export function SeasonResultsBars({ data }: { data: SeasonResult[] }) {
  if (!data || data.length === 0) {
    return <p className="py-6 text-center text-xs font-bold text-slate-400">نتیجه فصلی ثبت نشده است</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.wins + d.draws + d.losses));
  return (
    <div className="space-y-2.5" dir="rtl">
      {data.map((d) => {
        const total = d.wins + d.draws + d.losses;
        return (
          <div key={d.season} className="flex items-center gap-2.5">
            <span className="w-14 shrink-0 font-mono text-[11px] font-bold text-slate-400">{formatStatNumber(d.season)}</span>
            <div className="flex h-6 flex-1 overflow-hidden rounded-lg bg-white/5" dir="ltr">
              {d.wins > 0 && (
                <span className="flex h-full items-center justify-center bg-emerald-500 font-mono text-[10px] font-black text-black" style={{ width: `${(d.wins / max) * 100}%`, minWidth: total > 0 ? 22 : 0 }}>
                  {formatStatNumber(d.wins)}
                </span>
              )}
              {d.draws > 0 && (
                <span className="flex h-full items-center justify-center bg-slate-500 font-mono text-[10px] font-black text-white" style={{ width: `${(d.draws / max) * 100}%`, minWidth: 22 }}>
                  {formatStatNumber(d.draws)}
                </span>
              )}
              {d.losses > 0 && (
                <span className="flex h-full items-center justify-center bg-rose-500 font-mono text-[10px] font-black text-white" style={{ width: `${(d.losses / max) * 100}%`, minWidth: 22 }}>
                  {formatStatNumber(d.losses)}
                </span>
              )}
            </div>
            <span className="w-16 shrink-0 text-left font-mono text-[10px] text-slate-500" dir="ltr">
              {formatStatNumber(d.wins)}-{formatStatNumber(d.draws)}-{formatStatNumber(d.losses)}
            </span>
          </div>
        );
      })}
      <div className="flex items-center justify-center gap-4 pt-1 text-[10px] font-bold text-slate-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />برد</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-500" />مساوی</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />باخت</span>
      </div>
    </div>
  );
}

export interface TimingBucket {
  label: string;
  count: number;
}

/* Goal-timing distribution across 15-minute buckets (from real match events). */
export function GoalTimingBars({ buckets }: { buckets: TimingBucket[] }) {
  const total = buckets.reduce((a, b) => a + b.count, 0);
  if (total === 0) return null;
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="space-y-1.5" dir="rtl">
      {buckets.map((b) => (
        <div key={b.label} className="flex items-center gap-2">
          <span className="w-14 shrink-0 font-mono text-[10px] font-bold text-slate-400" dir="ltr">{b.label}&apos;</span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-white/5">
            <div
              className="flex h-full items-center justify-end rounded bg-gradient-to-l from-emerald-500 to-emerald-400 pl-1.5 font-mono text-[10px] font-black text-black transition-all"
              style={{ width: `${Math.max(b.count > 0 ? 8 : 0, (b.count / max) * 100)}%` }}
            >
              {b.count > 0 && formatStatNumber(b.count)}
            </div>
          </div>
        </div>
      ))}
      <p className="pt-1 text-center text-[10px] text-slate-500">توزیع دقایق گلزنی در بازی‌های ثبت‌شده</p>
    </div>
  );
}

export interface RatingPoint {
  y: number;
  logo?: string | null;
  name?: string;
  dateLabel?: string;
}

/* Last-N match ratings line chart. Oldest on the left, newest on the right. */
export function RatingsLineChart({ data, height = 190 }: { data: RatingPoint[]; height?: number }) {
  const W = 560;
  const H = height;
  const padL = 30;
  const padB = 34;
  const padT = 14;
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center py-10 text-xs font-bold text-slate-400">نمره‌ای ثبت نشده است</div>;
  }
  const ys = data.map((d) => d.y);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const dMin = Math.min(lo, 6) - 0.5;
  const dMax = Math.max(hi, 8.5) + 0.3;
  const X = (i: number) => (data.length === 1 ? W / 2 : padL + (i / (data.length - 1)) * (W - padL - 12));
  const Y = (v: number) => padT + (1 - (v - dMin) / (dMax - dMin)) * (H - padT - padB);
  const pts = data.map((d, i) => `${X(i).toFixed(1)},${Y(d.y).toFixed(1)}`).join(" ");
  const ticks = [dMin + (dMax - dMin) * 0.25, dMin + (dMax - dMin) * 0.5, dMin + (dMax - dMin) * 0.75];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="نمودار نمرات بازی‌های اخیر">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 6} y1={Y(t)} y2={Y(t)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x={padL - 5} y={Y(t) + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{formatStatNumber(t.toFixed(0))}</text>
          </g>
        ))}
        <polyline points={pts} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={X(i)} cy={Y(d.y)} r="4" fill="#0a0a0c" stroke={ratingColor(d.y)} strokeWidth="2.5" />
            <text x={X(i)} y={Y(d.y) - 9} textAnchor="middle" fontSize="10" fontWeight="800" fill="#e2e8f0" fontFamily="monospace">
              {formatStatNumber(d.y.toFixed(1))}
            </text>
            {d.logo ? (
              <image href={d.logo} x={X(i) - 9} y={H - padB + 6} width="18" height="18" preserveAspectRatio="xMidYMid meet" />
            ) : (
              <circle cx={X(i)} cy={H - padB + 15} r="8" fill="#e2e8f0" />
            )}
          </g>
        ))}
      </svg>
      {data[0]?.name && (
        <p className="mt-1 text-center text-[10px] text-slate-400">
          {data[data.length - 1]?.name} ... {data[0]?.name}
        </p>
      )}
    </div>
  );
}

export interface MarketPoint {
  x: string;
  y: number;
  label: string;
}

/* Market-value history. points==null -> empty state (logic lands later). */
export function MarketLineChart({ points }: { points: MarketPoint[] | null }) {
  const W = 560;
  const H = 190;
  const padL = 44;
  const padB = 26;
  const padT = 18;
  if (!points || points.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
        <span className="text-xs font-bold text-slate-400">تاریخچه ارزش بازار ثبت نشده است</span>
        <span className="text-[10px] text-slate-400">منطق ارزش‌گذاری بازیکن به‌زودی اضافه می‌شود</span>
      </div>
    );
  }
  const ys = points.map((p) => p.y);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const span = hi - lo || 1;
  const X = (i: number) => (points.length === 1 ? W / 2 : padL + (i / (points.length - 1)) * (W - padL - 12));
  const Y = (v: number) => padT + (1 - (v - lo) / span) * (H - padT - padB) * 0.92;
  const line = points.map((p, i) => `${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const area = `${padL},${H - padB} ${line} ${X(points.length - 1).toFixed(1)},${H - padB}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="نمودار تاریخچه ارزش بازار">
      <polygon points={area} fill="rgba(52,211,153,0.12)" />
      <polyline points={line} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={X(i)} cy={Y(p.y)} r="3.5" fill="#34d399" stroke="#0a0a0c" strokeWidth="1.5" />
          <text x={X(i)} y={Y(p.y) - 9} textAnchor="middle" fontSize="10" fontWeight="800" fill="#e2e8f0" fontFamily="monospace">{p.label}</text>
          <text x={X(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{p.x}</text>
        </g>
      ))}
    </svg>
  );
}
