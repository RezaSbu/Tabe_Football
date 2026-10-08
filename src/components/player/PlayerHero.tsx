import React from "react";
import { BadgeCheck, MapPin, ArrowRight, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { getSafeImageUrl, formatStatNumber } from "../../utils";
import SeasonSwitcher, { SeasonOption } from "../SeasonSwitcher";
import ShareButton from "../ui/ShareButton";
import { Sparkline, FormRing } from "./PlayerCharts";

export interface HeroQuickStats {
  matches: number;
  goals: number;
  assists: number;
  minutes: number;
  avg: number | null;
}

export interface HeroMarket {
  value: number;
  currency: string;
  changePct: number | null;
}

interface PlayerHeroProps {
  player: any;
  teamLogo: string | null;
  onSelectTeam?: (name: string) => void;
  onBack: () => void;
  seasonId: string;
  seasons: SeasonOption[];
  onSeasonChange: (v: string) => void;
  tfRating: number | null; // 0-100 scale (avg*10)
  spark: number[]; // recent ratings for the sparkline
  market: HeroMarket | null; // null = not tracked yet (logic lands later)
  formScore: number | null; // 0-100 ring, derived from last-5 rated games
  rank: number | null; // position rank derived from peers
  rankLabel: string;
  quick: HeroQuickStats;
  avgLabel: string;
}

function KpiCard({ title, children, sub }: { title: string; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center backdrop-blur">
      <span className="block text-[10px] font-bold text-emerald-300/80">{title}</span>
      <div className="mt-1 flex flex-col items-center">{children}</div>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  );
}

export function formatCompactEuro(value: number, currency: string): string {
  if (value >= 1_000_000_000) return `${currency} ${formatStatNumber((value / 1_000_000_000).toFixed(2))}B`;
  if (value >= 1_000_000) return `${currency} ${formatStatNumber((value / 1_000_000).toFixed(2))}M`;
  if (value >= 1_000) return `${currency} ${formatStatNumber(Math.round(value / 1_000))}K`;
  return `${currency} ${formatStatNumber(value)}`;
}

export default function PlayerHero(props: PlayerHeroProps) {
  const { player, teamLogo, onSelectTeam, onBack, seasonId, seasons, onSeasonChange, tfRating, spark, market, formScore, rank, rankLabel, quick, avgLabel } = props;
  const [imageError, setImageError] = React.useState(false);

  return (
    <div dir="rtl">
      {/* Breadcrumb + back */}
      <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[11px] font-bold text-slate-400">
        <nav className="flex items-center gap-1.5" aria-label="breadcrumb">
          <Link to="/" className="transition hover:text-emerald-400">خانه</Link>
          <span className="text-slate-600">/</span>
          <span>بازیکنان</span>
          <span className="text-slate-600">/</span>
          <span className="max-w-40 truncate text-slate-200">{player.name}</span>
        </nav>
        <button type="button" onClick={onBack} className="flex shrink-0 items-center gap-1 transition hover:text-emerald-400">
          <ArrowRight className="h-3.5 w-3.5" />
          <span>برگشت</span>
        </button>
      </div>

      {/* Navy hero banner — stays dark via .player-hero scope in index.css */}
      <div className="player-hero overflow-hidden rounded-3xl bg-gradient-to-l from-[#0a1830] via-[#0d2140] to-[#12305c] shadow-xl">
        <div className="grid grid-cols-1 items-center gap-5 p-4 sm:p-6 lg:grid-cols-12">
          {/* KPI cards (right in RTL = first) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:col-span-4">
            <KpiCard
              title="TF RATING"
              sub={tfRating != null && spark.length > 1 ? <Sparkline values={spark} /> : <span className="text-[9px] text-slate-400">از 100</span>}
            >
              <span className="font-mono text-3xl font-black text-white">{tfRating == null ? "—" : formatStatNumber(tfRating.toFixed(1))}</span>
            </KpiCard>
            <KpiCard
              title="ارزش بازیکن"
              sub={
                market && market.changePct != null ? (
                  <span className={`font-mono text-[11px] font-black ${market.changePct >= 0 ? "text-emerald-300" : "text-red-400"}`} dir="ltr">
                    {market.changePct >= 0 ? "+" : ""}{formatStatNumber(market.changePct.toFixed(1))}%
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-400">ثبت نشده</span>
                )
              }
            >
              <span className="font-mono text-2xl font-black text-white" dir="ltr">
                {market ? formatCompactEuro(market.value, market.currency) : "—"}
              </span>
            </KpiCard>
            <KpiCard title="فرم اخیر" sub={<span className="text-[9px] text-slate-400">از 100</span>}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-3xl font-black text-white">{formScore == null ? "—" : formatStatNumber(formScore)}</span>
                <FormRing value={formScore} size={44} />
              </div>
            </KpiCard>
            <KpiCard title="رتبه در پست" sub={<span className="text-[9px] leading-tight text-slate-400">{rankLabel}</span>}>
              <span className="font-mono text-3xl font-black text-white" dir="ltr">{rank == null ? "—" : `#${formatStatNumber(rank)}`}</span>
            </KpiCard>
          </div>

          {/* Identity (middle) */}
          <div className="text-center lg:col-span-5">
            <h1 className="flex items-center justify-center gap-2 text-2xl font-black text-white sm:text-3xl">
              <span className="truncate">{player.name}</span>
              <BadgeCheck className="h-6 w-6 shrink-0 text-sky-400" aria-label="تأیید شده" />
            </h1>
            <p className="mt-1 text-sm font-bold text-slate-300" dir="ltr">{player.nameEn || player.englishName || ""}</p>
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-slate-200">{player.position || "بازیکن آزاد"}</span>
              {teamLogo && <img src={getSafeImageUrl(teamLogo)} alt="" loading="lazy" className="h-6 w-6 rounded-full bg-white/10 object-cover" referrerPolicy="no-referrer" />}
              {onSelectTeam && player.teamName ? (
                <button type="button" onClick={() => onSelectTeam(player.teamName)} className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-emerald-300 transition hover:bg-emerald-500/25">
                  {player.teamName}
                </button>
              ) : (
                <span className="text-slate-300">{player.teamName || "بدون باشگاه"}</span>
              )}
            </div>
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              <span>{player.nationality || "ایران"}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 font-mono text-xs font-bold text-slate-200">
              <span title="قد">{formatStatNumber(player.height || "180")} <span className="font-sans text-[10px] font-normal text-slate-400">CM</span></span>
              <span title="وزن">{formatStatNumber(player.weight || "75")} <span className="font-sans text-[10px] font-normal text-slate-400">KG</span></span>
              <span title="سن">{formatStatNumber(player.age || "—")}</span>
              <span title="پای تخصصی" className="font-sans">{player.foot || "—"}</span>
            </div>
          </div>

          {/* Photo (left in RTL = last) */}
          <div className="flex flex-col items-center gap-3 lg:col-span-3">
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-b from-emerald-400/40 to-cyan-500/10 blur opacity-40" />
              <div className="relative h-44 w-36 overflow-hidden rounded-2xl border border-white/15 bg-white/5 sm:h-52 sm:w-44">
                {!imageError && player.image ? (
                  <img src={getSafeImageUrl(player.image)} alt={player.name} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setImageError(true)} referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><UserRound className="h-16 w-16 text-slate-500" /></div>
                )}
              </div>
            </div>
            <ShareButton title={player.name} />
          </div>
        </div>

        {/* Quick-stats strip */}
        <div className="border-t border-white/10 bg-black/20 px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {seasons && seasons.length > 0 && (
              <div className="flex shrink-0 items-center gap-2">
                <SeasonSwitcher seasons={seasons} value={seasonId} onChange={onSeasonChange} />
              </div>
            )}
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                { label: "بازی", value: quick.matches },
                { label: "گل", value: quick.goals },
                { label: "پاس گل", value: quick.assists },
                { label: "دقایق بازی", value: quick.minutes },
                { label: avgLabel, value: quick.avg == null ? "—" : Number(quick.avg).toFixed(1), mono: true },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-center">
                  <span className="block text-[10px] font-bold text-slate-400">{s.label}</span>
                  <span className="mt-0.5 block font-mono text-base font-black text-white">{typeof s.value === "number" ? formatStatNumber(s.value) : s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
