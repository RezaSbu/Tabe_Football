import React from "react";
import { Users, Wallet, CalendarDays, Star, TrendingUp } from "lucide-react";
import { formatStatNumber } from "../../utils";
import { formatCompactEuro } from "../player/PlayerHero";
import type { MarketRow } from "./marketFilter";

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-[#121215] p-4 shadow-xl">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold text-slate-400">{label}</span>
        <span className="block truncate font-mono text-xl font-black text-white" dir="ltr">{value}</span>
        {sub && <span className="block truncate text-[10px] text-slate-500">{sub}</span>}
      </span>
    </div>
  );
}

export default function MarketKpis({ rows }: { rows: MarketRow[] }) {
  const total = rows.length;
  const withValue = rows.filter((r) => r.value != null);
  const totalValue = withValue.reduce((a, r) => a + (r.value || 0), 0);
  const ages = rows.map((r) => r.age).filter((a): a is number => a != null);
  const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : null;
  const avgs = rows.map((r) => r.avg).filter((a): a is number => a != null);
  const avgRating = avgs.length > 0 ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
  const risers = rows
    .filter((r) => r.player.marketValue?.changePct != null)
    .sort((a, b) => Number(b.player.marketValue.changePct) - Number(a.player.marketValue.changePct));
  const top = risers.length > 0 ? risers[0] : null;
  const currency = withValue.length > 0 ? withValue[0].player.marketValue?.currency || "تومان" : "تومان";

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5" dir="rtl">
      <Kpi icon={<Users className="h-5 w-5" />} label="بازیکنان موجود" value={formatStatNumber(total)} sub="بازیکن" />
      <Kpi
        icon={<Wallet className="h-5 w-5" />}
        label="ارزش کل بازار"
        value={withValue.length > 0 ? formatCompactEuro(totalValue, currency) : "—"}
        sub={withValue.length > 0 ? `${formatStatNumber(withValue.length)} بازیکن دارای ارزش` : "ثبت نشده"}
      />
      <Kpi
        icon={<CalendarDays className="h-5 w-5" />}
        label="میانگین سن"
        value={avgAge != null ? formatStatNumber(avgAge.toFixed(1)) : "—"}
        sub="سال"
      />
      <Kpi
        icon={<Star className="h-5 w-5" />}
        label="میانگین نمره"
        value={avgRating != null ? formatStatNumber(avgRating.toFixed(1)) : "—"}
        sub="از ۱۰"
      />
      {top && (
        <Kpi
          icon={<TrendingUp className="h-5 w-5" />}
          label="بیشترین رشد ارزش"
          value={`${Number(top.player.marketValue.changePct) >= 0 ? "+" : ""}${formatStatNumber(Number(top.player.marketValue.changePct).toFixed(1))}%`}
          sub={top.player.name}
        />
      )}
    </div>
  );
}
