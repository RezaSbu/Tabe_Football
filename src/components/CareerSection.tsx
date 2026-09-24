import React, { useMemo, Fragment } from "react";
import { Briefcase } from "lucide-react";
import { formatStatNumber, formatJalaliDate } from "../utils";
import { buildCareerCards, CareerView } from "../shared/career";

interface CareerSectionProps {
  kind: "player" | "coach";
  seasonRows?: any[];
  movements?: any[];
  seasons?: any[];
  currentClubId?: string | null;
  currentClubName?: string | null;
}

// [کریر] — HOW did the person perform, per (season, club). One table, one
// row per (season, club) card, read right-to-left: فصل | باشگاه | آمار...
// Identity is strictly (person id, season id, club id); a mid-season
// transfer yields two rows for the same season (never merged). Multi-club
// seasons get an additive "جمع فصل" total row. All digits Latin.
export default function CareerSection({
  kind,
  seasonRows = [],
  movements = [],
  seasons = [],
  currentClubId = null,
  currentClubName = null,
}: CareerSectionProps) {
  const view: CareerView = useMemo(
    () =>
      buildCareerCards({
        kind,
        seasonRows,
        movements: (movements || []).map((m: any) => ({
          id: String(m.id),
          fromTeamId: m.fromTeamId != null ? String(m.fromTeamId) : null,
          toTeamId: m.toTeamId != null ? String(m.toTeamId) : null,
          seasonId: m.seasonId != null ? String(m.seasonId) : null,
          movementDate: m.movementDate || null,
        })),
        seasons,
        currentClubId: currentClubId != null ? String(currentClubId) : null,
        currentClubName,
      }),
    [kind, seasonRows, movements, seasons, currentClubId, currentClubName]
  );

  if (view.cards.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-white/5 bg-black/10 rounded-xl">
        هنوز رکورد کریری برای این {kind === "player" ? "بازیکن" : "مربی"} ثبت نشده است.
      </div>
    );
  }

  const isPlayer = kind === "player";

  // Cards arrive newest-season-first; group consecutive same-season cards.
  const groups: { seasonId: string | null; label: string; cards: typeof view.cards }[] = [];
  for (const c of view.cards) {
    const last = groups[groups.length - 1];
    if (last && String(last.seasonId) === String(c.seasonId)) {
      last.cards.push(c);
    } else {
      groups.push({
        seasonId: c.seasonId,
        label: c.seasonLabel || c.seasonName || "—",
        cards: [c],
      });
    }
  }

  const num = (v: number | string) => formatStatNumber(typeof v === "number" ? v : v);

  return (
    <div className="space-y-4">
      <h3 className="font-black text-base text-white border-r-4 border-emerald-500 pr-2 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-emerald-500" />
        <span>کریر</span>
      </h3>

      {view.freeSpans.length > 0 && (
        <div className="space-y-1.5">
          {view.freeSpans.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] bg-slate-800/40 border border-white/5 rounded-lg px-3 py-1.5">
              <span className="font-black text-slate-300">بازیکن آزاد</span>
              <span className="font-mono text-slate-500">
                {formatJalaliDate(s.from)}{s.to ? ` تا ${formatJalaliDate(s.to)}` : " تا کنون"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/15 p-2">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="text-slate-500 text-[10px] border-b border-white/[0.04]">
              <th className="py-3 px-2 font-bold whitespace-nowrap">فصل</th>
              <th className="py-3 px-2 font-bold whitespace-nowrap">باشگاه</th>
              {isPlayer ? (
                <>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">بازی</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">گل</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">پاس گل</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">میانگین</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">کلین‌شیت</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">دقایق</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">کارت زرد / قرمز</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">MVP</th>
                </>
              ) : (
                <>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">بازی</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">برد</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">مساوی</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">باخت</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">درصد برد</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">گل زده / خورده</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">امتیاز تیم</th>
                  <th className="py-3 px-2 text-center font-bold whitespace-nowrap">رتبه تیم</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const sum = (k: "matches" | "goals" | "assists" | "cleanSheets" | "minutes" | "mvps" | "yellowCards" | "redCards" | "wins" | "draws" | "losses" | "goalsFor" | "goalsAgainst" | "teamPoints") =>
                g.cards.reduce((a, c) => a + (Number((c as any)[k]) || 0), 0);
              const showTotal = g.cards.filter((c) => !c.isEmpty).length > 1;
              const totalMatches = sum("matches");
              return (
                <Fragment key={String(g.seasonId)}>
                  {g.cards.map((c) => (
                    <tr key={c.key} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01]">
                      <td className="py-3 px-2 font-mono font-bold text-slate-300 whitespace-nowrap">{formatStatNumber(g.label)}</td>
                      <td className="py-3 px-2 font-semibold text-white whitespace-nowrap">
                        {c.clubName || "—"}
                        {c.isEmpty && (
                          <span className="mr-2 text-[9px] font-bold text-slate-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md">
                            بدون بازی ثبت‌شده
                          </span>
                        )}
                      </td>
                      {isPlayer ? (
                        <>
                          <td className="py-3 px-2 text-center font-mono text-slate-300">{num(c.matches)}</td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400">{num(c.goals)}</td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-cyan-400">{num(c.assists)}</td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-amber-400">
                            {c.avgRating != null ? num(c.avgRating.toFixed(1)) : "—"}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-indigo-400">{num(c.cleanSheets)}</td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300">{num(c.minutes)}</td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300">
                            {num(c.yellowCards)} / {num(c.redCards)}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-amber-300">{num(c.mvps)}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-2 text-center font-mono text-slate-300">{num(c.matches)}</td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400">{num(c.wins)}</td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-amber-400">{num(c.draws)}</td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-red-400">{num(c.losses)}</td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400">
                            {c.winRate != null ? `${num(c.winRate.toFixed(1))}٪` : "—"}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300">
                            {num(c.goalsFor)} / {num(c.goalsAgainst)}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-100">{c.teamPoints ?? "—"}</td>
                          <td className="py-3 px-2 text-center font-mono text-slate-100">{c.teamRank ?? "—"}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {showTotal && (
                    <tr className="border-b border-white/[0.02] bg-white/[0.02]">
                      <td className="py-3 px-2 font-mono font-bold text-slate-400 whitespace-nowrap">{formatStatNumber(g.label)}</td>
                      <td className="py-3 px-2 font-black text-emerald-400 whitespace-nowrap">جمع فصل</td>
                      {isPlayer ? (
                        <>
                          <td className="py-3 px-2 text-center font-mono font-black text-slate-100">{num(totalMatches)}</td>
                          <td className="py-3 px-2 text-center font-mono font-black text-emerald-400">{num(sum("goals"))}</td>
                          <td className="py-3 px-2 text-center font-mono font-black text-cyan-400">{num(sum("assists"))}</td>
                          <td className="py-3 px-2 text-center font-mono text-slate-500">—</td>
                          <td className="py-3 px-2 text-center font-mono font-black text-indigo-400">{num(sum("cleanSheets"))}</td>
                          <td className="py-3 px-2 text-center font-mono font-black text-slate-100">{num(sum("minutes"))}</td>
                          <td className="py-3 px-2 text-center font-mono font-black text-slate-100">
                            {num(sum("yellowCards"))} / {num(sum("redCards"))}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-black text-amber-300">{num(sum("mvps"))}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-2 text-center font-mono font-black text-slate-100">{num(totalMatches)}</td>
                          <td className="py-3 px-2 text-center font-mono font-black text-emerald-400">{num(sum("wins"))}</td>
                          <td className="py-3 px-2 text-center font-mono font-black text-amber-400">{num(sum("draws"))}</td>
                          <td className="py-3 px-2 text-center font-mono font-black text-red-400">{num(sum("losses"))}</td>
                          <td className="py-3 px-2 text-center font-mono font-black text-emerald-400">
                            {totalMatches > 0 ? `${num(((sum("wins") / totalMatches) * 100).toFixed(1))}٪` : "—"}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-black text-slate-100">
                            {num(sum("goalsFor"))} / {num(sum("goalsAgainst"))}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-500">—</td>
                          <td className="py-3 px-2 text-center font-mono text-slate-500">—</td>
                        </>
                      )}
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
