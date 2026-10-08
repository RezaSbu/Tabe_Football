import React from "react";
import { Link } from "react-router-dom";
import {
  Users, CalendarDays, Newspaper, Trophy, Star, UserRound, ChevronLeft, Info, Clock,
} from "lucide-react";
import { getSafeImageUrl, formatStatNumber, convertGregorianToShamsi } from "../../utils";
import { EventIcon } from "../../matchcenter/EventIcon";
import ShareButton from "../ui/ShareButton";
import { ratingColor } from "./PlayerCharts";

/* ---------- shared light card ---------- */
export function SectionCard({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/5 bg-[#121215] p-4 shadow-sm ${className}`} dir="rtl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-black text-white">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Avatar({ src, name, size = "h-11 w-11" }: { src?: string | null; name: string; size?: string }) {
  const [err, setErr] = React.useState(false);
  if (!err && src) {
    return <img src={getSafeImageUrl(src)} alt={name} loading="lazy" className={`${size} shrink-0 rounded-full bg-white/5 object-cover`} onError={() => setErr(true)} referrerPolicy="no-referrer" />;
  }
  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-white/5`}>
      <UserRound className="h-1/2 w-1/2 text-slate-400" />
    </span>
  );
}

/* ---------- season performance (real metrics only) ---------- */
export interface PerfStats {
  matches: number; minutes: number; goals: number; assists: number;
  yellow: number; red: number; mvps: number; avg: number | null; clean: number;
  isGk: boolean;
}

export function SeasonPerformance({ stats, onViewAll }: { stats: PerfStats; onViewAll?: () => void }) {
  const rows: [string, React.ReactNode][] = [
    ["بازی", <b key="m" className="font-mono">{formatStatNumber(stats.matches)}</b>],
    ["دقایق بازی", <b key="m" className="font-mono">{formatStatNumber(stats.minutes)}</b>],
    ["گل", <b key="m" className="font-mono text-emerald-400">{formatStatNumber(stats.goals)}</b>],
    ["پاس گل", <b key="m" className="font-mono text-sky-400">{formatStatNumber(stats.assists)}</b>],
    ["کارت زرد", <b key="m" className="font-mono text-amber-400">{formatStatNumber(stats.yellow)}</b>],
    ["کارت قرمز", <b key="m" className="font-mono text-red-400">{formatStatNumber(stats.red)}</b>],
    ["بهترین بازیکن زمین", <b key="m" className="font-mono text-amber-400">{formatStatNumber(stats.mvps)}</b>],
    ["میانگین نمره", stats.avg == null ? <span key="m" className="text-slate-300">—</span> : <b key="m" className="font-mono" style={{ color: ratingColor(stats.avg) }}>{formatStatNumber(Number(stats.avg).toFixed(1))}</b>],
  ];
  if (stats.isGk) {
    rows.splice(4, 0, ["کلین‌شیت", <b key="m" className="font-mono text-indigo-400">{formatStatNumber(stats.clean)}</b>]);
  }
  return (
    <div>
      <dl className="divide-y divide-white/5 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2 py-2">
            <dt className="font-bold text-slate-400">{label}</dt>
            <dd className="text-sm text-white">{value}</dd>
          </div>
        ))}
      </dl>
      {onViewAll && (
        <button type="button" onClick={onViewAll} className="mt-3 w-full rounded-xl border border-white/5 py-2 text-[11px] font-black text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400">
          مشاهده آمار کامل
        </button>
      )}
    </div>
  );
}

/* ---------- career mini timeline (from careerHistory; falls back to movements) ---------- */
export interface CareerRow {
  club: string;
  season: string;
  apps: number;
  logo?: string | null;
}

export function CareerMini({ rows, onViewAll }: { rows: CareerRow[]; onViewAll?: () => void }) {
  return (
    <div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs font-bold text-slate-400">سوابق باشگاهی ثبت نشده است</p>
      ) : (
        <ul className="space-y-1">
          {rows.slice(0, 4).map((r, i) => (
            <li key={`${r.club}-${r.season}-${i}`} className="flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-white/5">
              <Avatar src={r.logo} name={r.club} size="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-white">{r.club}</p>
                <p className="font-mono text-[10px] text-slate-400">{formatStatNumber(r.season)}</p>
              </div>
              <div className="shrink-0 text-left">
                <p className="font-mono text-sm font-black text-slate-200">{formatStatNumber(r.apps)}</p>
                <p className="text-[9px] text-slate-400">بازی</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {onViewAll && rows.length > 0 && (
        <button type="button" onClick={onViewAll} className="mt-3 w-full rounded-xl border border-white/5 py-2 text-[11px] font-black text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400">
          مشاهده مسیر کامل
        </button>
      )}
    </div>
  );
}

/* ---------- similar players (derived from same-position peers) ---------- */
export interface SimilarRow {
  id: string;
  name: string;
  teamName: string;
  image?: string | null;
  similarity: number;
  position?: string;
}

export function SimilarPlayers({ items, onViewAll }: { items: SimilarRow[]; onViewAll?: () => void }) {
  return (
    <div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-xs font-bold text-slate-400">بازیکن مشابهی یافت نشد</p>
      ) : (
        <ul className="space-y-1">
          {items.map((s) => (
            <li key={s.id}>
              <Link to={`/player/${s.id}`} className="flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-white/5">
                <Avatar src={s.image} name={s.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-white">{s.name}</p>
                  <p className="flex items-center gap-1.5 truncate text-[10px] text-slate-400">
                    <span className="truncate">{s.teamName}</span>
                    {s.position && <span className="shrink-0 rounded bg-emerald-500/10 px-1 py-px font-bold text-emerald-400">{s.position}</span>}
                  </p>
                </div>
                <div className="shrink-0 text-left">
                  <p className="font-mono text-sm font-black text-emerald-400" dir="ltr">{formatStatNumber(s.similarity)}%</p>
                  <p className="text-[9px] text-slate-400">شباهت</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {onViewAll && items.length > 0 && (
        <button type="button" onClick={onViewAll} className="mt-3 w-full rounded-xl border border-white/5 py-2 text-[11px] font-black text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400">
          مشاهده بازیکنان بیشتر
        </button>
      )}
    </div>
  );
}

/* ---------- next match ---------- */
export interface NextMatchInfo {
  id: string;
  teamHome: string;
  teamAway: string;
  teamHomeLogo?: string | null;
  teamAwayLogo?: string | null;
  date: string;
  time?: string | null;
  venue?: string | null;
}

export function NextMatchCard({ match, onOpenMatch }: { match: NextMatchInfo | null; onOpenMatch?: (id: string) => void }) {
  if (!match) {
    return <p className="py-6 text-center text-xs font-bold text-slate-400">بازی بعدی ثبت نشده است</p>;
  }
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-[#0a1830] to-[#12305c] p-4 text-center" dir="rtl">
      <p className="text-[11px] font-black text-slate-300">بازی بعدی</p>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center gap-1.5">
          <Avatar src={match.teamHomeLogo} name={match.teamHome} size="h-12 w-12" />
          <span className="text-[11px] font-black text-white">{match.teamHome}</span>
        </div>
        <span className="font-mono text-sm font-black text-slate-400" dir="ltr">VS</span>
        <div className="flex flex-col items-center gap-1.5">
          <Avatar src={match.teamAwayLogo} name={match.teamAway} size="h-12 w-12" />
          <span className="text-[11px] font-black text-white">{match.teamAway}</span>
        </div>
      </div>
      <p className="mt-3 font-mono text-[11px] font-bold text-slate-300">
        {formatStatNumber(convertGregorianToShamsi(match.date))}
        {match.time ? ` - ساعت ${formatStatNumber(match.time)}` : ""}
      </p>
      {match.venue && <p className="mt-1 text-[10px] text-slate-400">{match.venue}</p>}
      {onOpenMatch && (
        <button type="button" onClick={() => onOpenMatch(match.id)} className="mt-3 w-full rounded-xl bg-white/10 py-2 text-[11px] font-black text-white transition hover:bg-white/20">
          مشاهده بازی
        </button>
      )}
    </div>
  );
}

/* ---------- shareable player card ---------- */
export function PlayerShareCard({ player, tfRating, marketLabel, quick }: { player: any; tfRating: number | null; marketLabel: string; quick: { matches: number; goals: number; assists: number; minutes: number; avg: number | null } }) {
  const cells: [string, string][] = [
    ["بازی", formatStatNumber(quick.matches)],
    ["گل", formatStatNumber(quick.goals)],
    ["پاس گل", formatStatNumber(quick.assists)],
    ["دقیقه بازی", formatStatNumber(quick.minutes)],
    ["نمره میانگین", quick.avg == null ? "—" : formatStatNumber(Number(quick.avg).toFixed(2))],
  ];
  return (
    <div dir="rtl">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-[#0a1830] to-[#12305c] p-4 text-white">
        <div className="flex items-center gap-3">
          <Avatar src={player.image} name={player.name} size="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black">{player.name}</p>
            <p className="truncate text-[11px] text-slate-300">{player.position || ""} | {player.teamName || ""}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/10 p-2 text-center">
            <p className="font-mono text-xl font-black text-emerald-300">{tfRating == null ? "—" : formatStatNumber(tfRating.toFixed(1))}</p>
            <p className="text-[9px] text-slate-300">TF RATING</p>
          </div>
          <div className="rounded-xl bg-white/10 p-2 text-center">
            <p className="font-mono text-xl font-black text-white" dir="ltr">{marketLabel}</p>
            <p className="text-[9px] text-slate-300">ارزش بازیکن</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1 text-center">
          {cells.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-white/5 px-1 py-1.5">
              <p className="font-mono text-[13px] font-black">{value}</p>
              <p className="mt-0.5 text-[8px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-center text-[10px] font-black text-slate-300">تب فوتبال | TABEFOOTBAL.IR</p>
      </div>
      <div className="mt-2.5 flex justify-center">
        <ShareButton title={player.name} />
      </div>
    </div>
  );
}

/* ---------- profile info footer box ---------- */
export function ProfileInfoBox({ playerId, updatedAt }: { playerId: string; updatedAt?: string | null }) {
  return (
    <div className="space-y-1.5 text-[11px]">
      <p className="flex items-center justify-between gap-2">
        <span className="font-bold text-slate-400">آی‌دی بازیکن</span>
        <span className="max-w-44 truncate font-mono text-slate-300" dir="ltr">{playerId}</span>
      </p>
      <p className="flex items-center justify-between gap-2">
        <span className="font-bold text-slate-400">آخرین به‌روزرسانی</span>
        <span className="font-mono text-slate-300">{updatedAt ? formatStatNumber(convertGregorianToShamsi(updatedAt)) : "—"}</span>
      </p>
      <p className="flex items-center justify-between gap-2">
        <span className="font-bold text-slate-400">منبع داده‌ها</span>
        <span className="text-slate-300">سیستم آماری تب فوتبال</span>
      </p>
    </div>
  );
}

/* ---------- news list ---------- */
export function NewsList({ items, playerName, onSelectNews, onViewAll }: { items: any[]; playerName: string; onSelectNews?: (id: string) => void; onViewAll?: () => void }) {
  if (!items || items.length === 0) {
    return <p className="py-6 text-center text-xs font-bold text-slate-400">خبری ثبت نشده است</p>;
  }
  return (
    <div>
      <ul className="max-h-[420px] space-y-2 overflow-y-auto pl-1">
        {items.map((nw: any) => (
          <li key={nw.id}>
            <button type="button" onClick={() => onSelectNews && onSelectNews(nw.id)} className="group flex w-full items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-2 text-right transition hover:border-emerald-500/40">
              {nw.image ? (
                <img src={getSafeImageUrl(nw.image)} alt={nw.title} loading="lazy" className="h-14 w-14 shrink-0 rounded-lg bg-white/10 object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/10"><Newspaper className="h-5 w-5 text-slate-400" /></span>
              )}
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-xs font-bold leading-snug text-white group-hover:text-emerald-300">{nw.title}</span>
                {nw.createdAt && <span className="mt-1 block font-mono text-[10px] text-slate-400">{formatStatNumber(convertGregorianToShamsi(String(nw.createdAt).slice(0, 10)))}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="sr-only">{playerName}</p>
      {onViewAll && (
        <button type="button" onClick={onViewAll} className="mt-3 w-full rounded-xl border border-white/5 py-2 text-[11px] font-black text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400">
          مشاهده همه اخبار
        </button>
      )}
    </div>
  );
}

/* ---------- league/cup/total table (light) ---------- */
export interface SplitRow {
  label: string;
  matches: number; goals: number; assists: number; clean: number | null;
  active?: boolean;
}

export function SplitTable({ rows, showClean, total }: { rows: SplitRow[]; showClean: boolean; total: SplitRow }) {
  const Cell = ({ v, cls = "" }: { v: React.ReactNode; cls?: string }) => <td className={`p-3 text-center font-mono ${cls}`}>{v}</td>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#121215] text-xs">
      <table className="w-full border-collapse text-right">
        <thead>
          <tr className="border-b border-white/5 bg-white/5 font-bold text-slate-400">
            <th className="p-3">رقابت</th>
            <th className="p-3 text-center">بازی</th>
            <th className="p-3 text-center">گل زده</th>
            <th className="p-3 text-center">پاس گل</th>
            {showClean && <th className="p-3 text-center">کلین‌شیت</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 font-bold">
          {rows.map((r) => (
            <tr key={r.label} className={r.active ? "bg-emerald-500/10 text-emerald-300" : "hover:bg-white/5"}>
              <td className="p-3 text-slate-200">{r.label}{r.active && <span className="mr-1.5 rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] font-black text-emerald-300">فعال</span>}</td>
              <Cell v={formatStatNumber(r.matches)} cls="text-slate-300" />
              <Cell v={formatStatNumber(r.goals)} cls="text-emerald-400" />
              <Cell v={formatStatNumber(r.assists)} cls="text-sky-400" />
              {showClean && <Cell v={r.clean == null ? "—" : formatStatNumber(r.clean)} cls="text-amber-400" />}
            </tr>
          ))}
          <tr className="bg-emerald-500/10 font-extrabold">
            <td className="p-3 text-emerald-300">{total.label}</td>
            <Cell v={formatStatNumber(total.matches)} cls="text-white" />
            <Cell v={formatStatNumber(total.goals)} cls="text-emerald-300" />
            <Cell v={formatStatNumber(total.assists)} cls="text-sky-400" />
            {showClean && <Cell v={total.clean == null ? "—" : formatStatNumber(total.clean)} cls="text-amber-400" />}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ---------- match log rows (light, EventIcon, 3-span scores) ---------- */
export function MatchLogList({ matches, onSelectMatch }: { matches: any[]; onSelectMatch?: (id: string) => void }) {
  if (!matches || matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/5 bg-[#121215]/5 p-6 text-center text-xs text-slate-400">
        هیچ لاگ بازی برای این بازیکن ثبت نشده است.
      </div>
    );
  }
  return (
    <div className="grid gap-2.5">
      {matches.map((m: any, idx: number) => (
        <button
          key={`${m.matchId}-${idx}`}
          type="button"
          onClick={() => onSelectMatch && onSelectMatch(m.matchId)}
          className="flex flex-col gap-2.5 rounded-xl border border-white/5 bg-[#121215] p-3 text-xs transition hover:border-emerald-500/50 sm:flex-row sm:items-center sm:justify-between sm:p-4"
        >
          <div className="flex items-center gap-2.5">
            <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-black ${m.result === "W" ? "bg-emerald-500/15 text-emerald-300" : m.result === "D" ? "bg-white/10 text-slate-300" : "bg-red-500/10 text-red-400"}`}>
              {m.result === "W" ? "برد" : m.result === "D" ? "تساوی" : "باخت"}
            </span>
            <span className="text-[13px] font-bold text-white">
              {m.teamName} <span className="text-xs font-normal text-slate-400">مقابل</span> {m.opponent}
            </span>
          </div>
          <div className="text-center sm:text-right">
            <span className="mb-0.5 block text-[10px] text-slate-400">نتیجه کلی مسابقه</span>
            <strong className="rounded bg-white/5 px-2 py-1 font-mono font-bold text-slate-200">
              <span className="inline-flex items-center gap-1" dir="rtl">
                <span>{formatStatNumber(m.scoreHome)}</span>
                <span className="opacity-60">-</span>
                <span>{formatStatNumber(m.scoreAway)}</span>
              </span>
            </strong>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {m.goals > 0 && <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-300"><EventIcon type="goal" size={13} />{formatStatNumber(m.goals)} گل</span>}
            {m.assists > 0 && <span className="flex items-center gap-1 rounded bg-sky-500/10 px-2 py-1 text-[10px] font-black text-sky-400"><EventIcon type="assist" size={13} />{formatStatNumber(m.assists)} پاس گل</span>}
            {m.penalties > 0 && <span className="rounded bg-purple-500/10 px-2 py-1 text-[10px] font-black text-purple-400">پنالتی {formatStatNumber(m.penalties)}</span>}
            {m.ownGoals > 0 && <span className="flex items-center gap-1 rounded bg-orange-500/10 px-2 py-1 text-[10px] font-black text-orange-400"><EventIcon type="own-goal" size={13} />گل به خودی</span>}
            {m.yellowCards > 0 && <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-400"><EventIcon type="yellow-card" size={13} />{formatStatNumber(m.yellowCards)} اخطار</span>}
            {m.redCards > 0 && <span className="flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-[10px] font-black text-red-400"><EventIcon type="red-card" size={13} />{formatStatNumber(m.redCards)} اخراج</span>}
            {m.subbedIn && <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-300"><EventIcon type="substitution" size={13} />تعویضی</span>}
            {m.subbedOut && <span className="rounded bg-white/5 px-2 py-1 text-[10px] font-black text-slate-400">تعویض شد</span>}
            <span className="font-mono text-slate-400">{formatStatNumber(m.minutesPlayed)}&apos; بازی</span>
            {m.rating > 0 && (
              <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-black" style={{ color: ratingColor(m.rating), backgroundColor: "#f1f5f9" }}>
                {formatStatNumber(Number(m.rating).toFixed(1))}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {m.isMvp && <span className="rounded-xl bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-400">MVP زمین</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ---------- small stat cards row ---------- */
export function MiniStat({ icon, label, value, sub, tone = "slate" }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: string; tone?: "slate" | "red" | "emerald" | "amber" }) {
  const tones: Record<string, string> = {
    slate: "bg-white/5 text-slate-400",
    red: "bg-red-500/10 text-red-500",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
  };
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#121215] p-4">
      <div>
        <span className="block text-[10px] font-bold text-slate-400">{label}</span>
        <span className="font-mono text-2xl font-black text-white">{value}</span>
        <span className="mt-1 block text-[9px] font-medium text-slate-400">{sub}</span>
      </div>
      <span className={`shrink-0 rounded-full p-2.5 ${tones[tone]}`}>{icon}</span>
    </div>
  );
}

/* ---------- icons re-export for the orchestrator ---------- */
export { Users, CalendarDays, Newspaper, Trophy, Star, Clock, ChevronLeft, Info };
