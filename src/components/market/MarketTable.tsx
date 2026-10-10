import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, UserRound, Plus, Star, Download, GitCompareArrows, Bookmark } from "lucide-react";
import { getSafeImageUrl, formatStatNumber } from "../../utils";
import { getLeagueLabel } from "../../shared/leagueLabel";
import { formatCompactEuro } from "../player/PlayerHero";
import { RowSparkline } from "./MarketCharts";
import type { MarketRow, MarketSort } from "./marketFilter";

function Avatar({ src, name }: { src?: string | null; name: string }) {
  const [err, setErr] = React.useState(false);
  if (!err && src) {
    return <img src={getSafeImageUrl(src)} alt={name} loading="lazy" className="h-10 w-10 shrink-0 rounded-full bg-white/5 object-cover" onError={() => setErr(true)} referrerPolicy="no-referrer" />;
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5">
      <UserRound className="h-5 w-5 text-slate-500" />
    </span>
  );
}

const SORTS: { key: MarketSort; label: string }[] = [
  { key: "rating", label: "نمره" },
  { key: "tf", label: "TF" },
  { key: "value", label: "ارزش" },
  { key: "goals", label: "گل" },
  { key: "age", label: "سن" },
  { key: "matches", label: "بازی" },
];

interface Props {
  rows: MarketRow[];
  total: number;
  sort: MarketSort;
  dir: 1 | -1;
  setSort: (s: MarketSort) => void;
  hasMore: boolean;
  onShowMore: () => void;
  valueRanks: Map<string, number>;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpenCompare: () => void;
  shortlist: string[];
  onToggleShortlist: (id: string) => void;
  shortOnly: boolean;
  onToggleShortOnly: () => void;
  shortCount: number;
  onExport: () => void;
}

export default function MarketTable(props: Props) {
  const { rows, total, sort, dir, setSort, hasMore, onShowMore, valueRanks } = props;
  const { selectedIds, onToggleSelect, onOpenCompare, shortlist, onToggleShortlist, shortOnly, onToggleShortOnly, shortCount, onExport } = props;
  const sortBtn = (key: MarketSort, label: string, center = true) => (
    <button
      type="button"
      onClick={() => setSort(key)}
      className={`inline-flex items-center gap-1 font-bold transition hover:text-white ${center ? "justify-center" : ""} ${sort === key ? "text-emerald-400" : "text-slate-400"}`}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
      {sort === key && <span className="font-mono text-[9px]">{dir === 1 ? "▲" : "▼"}</span>}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#121215] shadow-xl" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <p className="text-xs font-black text-white">
          <span className="font-mono text-emerald-400">{formatStatNumber(total)}</span> بازیکن یافت شد
        </p>
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={onToggleShortOnly}
            aria-pressed={shortOnly}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 font-black transition ${shortOnly ? "bg-amber-500/15 text-amber-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Bookmark className="h-3 w-3" />
            لیست کوتاه ({formatStatNumber(shortCount)})
          </button>
          <button
            type="button"
            onClick={onOpenCompare}
            disabled={selectedIds.length !== 2}
            className="flex items-center gap-1 rounded-lg px-2 py-1 font-black transition enabled:bg-sky-500/15 enabled:text-sky-300 enabled:hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:text-slate-600"
          >
            <GitCompareArrows className="h-3 w-3" />
            مقایسه ({formatStatNumber(selectedIds.length)}/۲)
          </button>
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1 rounded-lg px-2 py-1 font-black text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        </div>
        <div className="flex w-full flex-wrap items-center gap-1 text-[11px]">
          <span className="font-bold text-slate-500">مرتب‌سازی:</span>
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={`rounded-lg px-2 py-1 font-black transition ${sort === s.key ? "bg-emerald-500/15 text-emerald-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-sm font-black text-white">با این فیلترها بازیکنی پیدا نشد</p>
          <p className="mt-1 text-[11px] text-slate-400">فیلترها را کمتر کنید تا نتیجه بگیرید</p>
        </div>
      ) : (
        <>
          {/* desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-right text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] text-slate-400">
                  <th className="w-8 p-3" />
                  <th className="p-3 font-bold">بازیکن</th>
                  <th className="p-3 text-center font-bold">سن</th>
                  <th className="p-3 font-bold">باشگاه</th>
                  <th className="p-3 font-bold">لیگ</th>
                  <th className="p-3 text-center font-bold">{sortBtn("matches", "بازی")}</th>
                  <th className="p-3 text-center font-bold">{sortBtn("goals", "گل")}</th>
                  <th className="p-3 text-center font-bold">پاس گل</th>
                  <th className="p-3 text-center font-bold">{sortBtn("rating", "نمره")}</th>
                  <th className="p-3 text-center font-bold">{sortBtn("tf", "TF")}</th>
                  <th className="p-3 text-center font-bold">{sortBtn("value", "ارزش بازار")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => {
                  const vRank = valueRanks.get(String(r.player.id));
                  const pid = String(r.player.id);
                  const selected = selectedIds.includes(pid);
                  const starred = shortlist.includes(pid);
                  const tf = Number(r.player.seasonStats?.tfRating);
                  return (
                    <tr key={r.player.id} className={`transition hover:bg-white/[0.02] ${selected ? "bg-sky-500/[0.06]" : ""}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onToggleSelect(pid)}
                            aria-pressed={selected}
                            title="انتخاب برای مقایسه"
                            className={`flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-black transition ${
                              selected ? "border-sky-400 bg-sky-500/20 text-sky-300" : "border-white/15 text-transparent hover:border-sky-400/60"
                            }`}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleShortlist(pid)}
                            aria-pressed={starred}
                            title="لیست کوتاه"
                            className={`transition ${starred ? "text-amber-400" : "text-slate-600 hover:text-amber-400"}`}
                          >
                            <Star className={`h-4 w-4 ${starred ? "fill-amber-400" : ""}`} />
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <Link to={`/player/${r.player.id}`} className="group flex items-center gap-2.5">
                          <Avatar src={r.player.image} name={r.player.name} />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-black text-white group-hover:text-emerald-300">
                              {r.player.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] text-slate-500">{r.player.position || ""}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-300">{r.age != null ? formatStatNumber(r.age) : "—"}</td>
                      <td className="max-w-32 truncate p-3 font-bold text-slate-200">{r.player.teamName || "—"}</td>
                      <td className="whitespace-nowrap p-3 text-[11px] text-slate-400">{r.leagueKey ? getLeagueLabel(r.leagueKey) : "—"}</td>
                      <td className="p-3 text-center font-mono text-slate-300">{formatStatNumber(r.matches)}</td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-400">{formatStatNumber(r.goals)}</td>
                      <td className="p-3 text-center font-mono font-bold text-sky-400">{formatStatNumber(r.assists)}</td>
                      <td className="p-3 text-center font-mono font-black text-amber-400">
                        {r.avg != null ? formatStatNumber(Number(r.avg).toFixed(1)) : "—"}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-cyan-300">
                        {Number.isFinite(tf) ? formatStatNumber(tf) : "—"}
                      </td>
                      <td className="p-3 text-center">
                        {r.value != null ? (
                          <span className="inline-flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1.5">
                              {vRank != null && vRank <= 3 && (
                                <span className="rounded bg-amber-500/15 px-1 py-px font-mono text-[9px] font-black text-amber-300" dir="ltr">#{formatStatNumber(vRank)}</span>
                              )}
                              <span className="font-mono text-[11px] font-black text-slate-100" dir="ltr">
                                {formatCompactEuro(r.value, r.player.marketValue?.currency || "تومان")}
                              </span>
                            </span>
                            <RowSparkline history={r.player.marketValue?.history || []} />
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="grid gap-2 p-3 md:hidden">
            {rows.map((r) => {
              const pid = String(r.player.id);
              const starred = shortlist.includes(pid);
              const tfm = Number(r.player.seasonStats?.tfRating);
              return (
                <div
                  key={r.player.id}
                  className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 transition active:border-emerald-500/40"
                >
                  <Avatar src={r.player.image} name={r.player.name} />
                  <Link to={`/player/${r.player.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-black text-white">{r.player.name}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                      {r.player.position || ""} • {r.player.teamName || ""}
                    </span>
                    <span className="mt-1 flex items-center gap-2 font-mono text-[10px] font-bold">
                      <span className="text-amber-400">{r.avg != null ? formatStatNumber(Number(r.avg).toFixed(1)) : "—"}</span>
                      <span className="text-cyan-300">TF {Number.isFinite(tfm) ? formatStatNumber(tfm) : "—"}</span>
                      <span className="text-slate-300" dir="ltr">{r.value != null ? formatCompactEuro(r.value, r.player.marketValue?.currency || "تومان") : "—"}</span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => onToggleShortlist(pid)}
                    aria-pressed={starred}
                    aria-label="لیست کوتاه"
                    className={`shrink-0 p-1 transition ${starred ? "text-amber-400" : "text-slate-600"}`}
                  >
                    <Star className={`h-4 w-4 ${starred ? "fill-amber-400" : ""}`} />
                  </button>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="border-t border-white/5 p-3">
              <button
                type="button"
                onClick={onShowMore}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-black text-slate-200 transition hover:border-emerald-500/40 hover:text-emerald-300"
              >
                <Plus className="h-4 w-4" />
                نمایش بیشتر
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
