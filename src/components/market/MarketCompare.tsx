import React from "react";
import { Link } from "react-router-dom";
import { X, UserRound } from "lucide-react";
import { getSafeImageUrl, formatStatNumber } from "../../utils";
import { formatCompactEuro } from "../player/PlayerHero";

function Avatar({ src, name, size = "h-14 w-14" }: { src?: string | null; name: string; size?: string }) {
  const [err, setErr] = React.useState(false);
  if (!err && src) {
    return <img src={getSafeImageUrl(src)} alt={name} className={`${size} rounded-full bg-white/5 object-cover`} onError={() => setErr(true)} referrerPolicy="no-referrer" />;
  }
  return (
    <span className={`${size} flex items-center justify-center rounded-full bg-white/5`}>
      <UserRound className="h-1/2 w-1/2 text-slate-500" />
    </span>
  );
}

function DualBar({ label, a, b, format }: { label: string; a: number | null; b: number | null; format: (v: number) => string }) {
  const va = a ?? 0;
  const vb = b ?? 0;
  const tot = va + vb || 1;
  return (
    <div className="grid grid-cols-[52px_1fr_auto_1fr_52px] items-center gap-2">
      <span className="text-center font-mono text-sm font-black text-emerald-400">{a == null ? "—" : format(va)}</span>
      <div className="h-2 overflow-hidden rounded-full bg-white/5" dir="ltr">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(va / tot) * 100}%` }} />
      </div>
      <span className="whitespace-nowrap text-[10px] font-bold text-slate-400">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-white/5" dir="rtl">
        <div className="h-full rounded-full bg-sky-500" style={{ width: `${(vb / tot) * 100}%` }} />
      </div>
      <span className="text-center font-mono text-sm font-black text-sky-400">{b == null ? "—" : format(vb)}</span>
    </div>
  );
}

function DualRatings({ aHist, bHist }: { aHist: { rating: number }[]; bHist: { rating: number }[] }) {
  const W = 520;
  const H = 150;
  const pad = 14;
  const series = [aHist, bHist].map((h) =>
    h
      .map((x) => Number(x.rating) || 0)
      .filter((v) => v > 0)
      .slice(0, 10)
      .reverse()
  );
  const all = [...series[0], ...series[1]];
  if (all.length === 0) {
    return <p className="py-4 text-center text-[11px] text-slate-500">نمره‌ای برای مقایسه نیست</p>;
  }
  const lo = Math.min(...all) - 0.3;
  const hi = Math.max(...all) + 0.3;
  const X = (i: number, n: number) => (n <= 1 ? W / 2 : pad + (i / (n - 1)) * (W - pad * 2));
  const Y = (v: number) => pad + (1 - (v - lo) / Math.max(0.1, hi - lo)) * (H - pad * 2);
  const colors = ["#34d399", "#38bdf8"];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="مقایسه نمرات">
        {[0.25, 0.5, 0.75].map((t) => {
          const y = pad + t * (H - pad * 2);
          return <line key={t} x1={pad} x2={W - pad} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
        })}
        {series.map((s, si) =>
          s.length > 1 ? (
            <polyline
              key={si}
              points={s.map((v, i) => `${X(i, s.length).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}
              fill="none"
              stroke={colors[si]}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            s.map((v, i) => <circle key={`${si}-${i}`} cx={X(i, s.length)} cy={Y(v)} r="3.5" fill={colors[si]} />)
          )
        )}
      </svg>
      <p className="mt-1 text-center text-[10px] text-slate-500">نمرات ۱۰ بازی اخیر (به ترتیب قدمت)</p>
    </div>
  );
}

export default function MarketCompare({ a, b, onClose }: { a: any; b: any; onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const num = (v: any): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n !== 0 ? n : v === 0 ? 0 : null;
  };
  const rows: { label: string; a: number | null; b: number | null; int?: boolean }[] = [
    { label: "سن", a: num(a.age) || null, b: num(b.age) || null, int: true },
    { label: "بازی", a: num(a.seasonStats?.matches), b: num(b.seasonStats?.matches), int: true },
    { label: "گل", a: num(a.seasonStats?.goals), b: num(b.seasonStats?.goals), int: true },
    { label: "پاس گل", a: num(a.seasonStats?.assists), b: num(b.seasonStats?.assists), int: true },
    { label: "دقایق", a: num(a.seasonStats?.minutes), b: num(b.seasonStats?.minutes), int: true },
    { label: "نمره", a: num(a.seasonStats?.averageRating ?? a.averageRating), b: num(b.seasonStats?.averageRating ?? b.averageRating) },
    { label: "TF", a: num(a.seasonStats?.tfRating), b: num(b.seasonStats?.tfRating), int: true },
    { label: "ارزش", a: num(a.marketValue?.value), b: num(b.marketValue?.value), int: true },
  ];
  const fmt = (int?: boolean) => (v: number) => (int ? formatStatNumber(Math.round(v)) : formatStatNumber(Number(v).toFixed(1)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`مقایسه ${a.name} و ${b.name}`}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#121215] p-4 shadow-2xl sm:rounded-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-black text-white">مقایسه بازیکنان</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* VS header */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <Link to={`/player/${a.id}`} className="group flex flex-col items-center gap-1.5 text-center">
            <Avatar src={a.image} name={a.name} />
            <span className="text-xs font-black text-white group-hover:text-emerald-300">{a.name}</span>
            <span className="text-[10px] text-slate-400">{a.teamName || ""}</span>
          </Link>
          <span className="font-mono text-lg font-black text-slate-500" dir="ltr">VS</span>
          <Link to={`/player/${b.id}`} className="group flex flex-col items-center gap-1.5 text-center">
            <Avatar src={b.image} name={b.name} />
            <span className="text-xs font-black text-white group-hover:text-sky-300">{b.name}</span>
            <span className="text-[10px] text-slate-400">{b.teamName || ""}</span>
          </Link>
        </div>

        {/* dual bars */}
        <div className="mt-4 space-y-2.5">
          {rows.map((r) => (
            <DualBar key={r.label} label={r.label} a={r.a} b={r.b} format={fmt(r.int)} />
          ))}
        </div>

        {/* value + table */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-emerald-500/10 p-2.5">
            <p className="text-[10px] text-slate-400">ارزش {a.name}</p>
            <p className="mt-0.5 font-mono text-sm font-black text-emerald-400" dir="ltr">
              {a.marketValue?.value != null ? formatCompactEuro(Number(a.marketValue.value), a.marketValue?.currency || "تومان") : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-sky-500/10 p-2.5">
            <p className="text-[10px] text-slate-400">ارزش {b.name}</p>
            <p className="mt-0.5 font-mono text-sm font-black text-sky-400" dir="ltr">
              {b.marketValue?.value != null ? formatCompactEuro(Number(b.marketValue.value), b.marketValue?.currency || "تومان") : "—"}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <DualRatings aHist={a.ratingsHistory || []} bHist={b.ratingsHistory || []} />
        </div>
      </div>
    </div>
  );
}
