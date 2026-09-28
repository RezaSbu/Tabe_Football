import React from "react";
import { ArrowLeftRight } from "lucide-react";
import { formatStatNumber, formatJalaliDate } from "../utils";

export interface MovementItem {
  id: string;
  fromTeamId?: string | null;
  fromTeamName?: string | null;
  toTeamId?: string | null;
  toTeamName?: string | null;
  movementDate?: string | null;
  note?: string | null;
  seasonName?: string | null;
  seasonLabel?: string | null;
}

interface MovementTimelineProps {
  items?: MovementItem[];
  title?: string;
}

// Club-change history (real movements ledger, NOT transfer news).
// Items come from the detail embeds with team names already resolved.
// Storage dates stay Gregorian; display is Jalali via formatJalaliDate.
export function seasonDisplayName(item: { seasonName?: string | null; seasonLabel?: string | null }): string | null {
  const label = (item.seasonLabel || "").trim();
  if (label) return label;
  const name = (item.seasonName || "").trim();
  return name || null;
}

export default function MovementTimeline({
  items = [],
  title = "سوابق انتقال باشگاهی",
}: MovementTimelineProps) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const sorted = [...items].sort((a, b) => String(b.movementDate || "").localeCompare(String(a.movementDate || "")));
  return (
    <div className="p-4 rounded-2xl bg-[#131317] border border-white/5 space-y-3">
      <h3 className="text-xs font-black text-slate-400 flex items-center gap-1.5">
        <ArrowLeftRight className="h-4 w-4 text-emerald-500" />
        <span>{title} ({formatStatNumber(sorted.length)})</span>
      </h3>
      <div className="relative border-r border-white/10 pr-4 mr-2 space-y-3.5">
        {sorted.map((m) => {
          const season = seasonDisplayName(m);
          return (
            <div key={m.id} className="relative">
              <div className="absolute right-[-21px] top-1.5 h-2.5 w-2.5 rounded-full bg-sky-500 border border-slate-950" />
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-black text-white">
                    {m.fromTeamName || "بدون باشگاه"}
                    <span className="text-sky-400 mx-1.5">←</span>
                    {m.toTeamName || "—"}
                  </p>
                  {m.note && (
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{m.note}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {m.movementDate && (
                    <span
                      className="text-[10px] bg-white/5 text-slate-300 font-bold px-2 py-0.5 rounded font-mono"
                      title={`تاریخ انتقال: ${formatJalaliDate(m.movementDate)}`}
                    >
                      تاریخ انتقال: {formatJalaliDate(m.movementDate)}
                    </span>
                  )}
                  {season && (
                    <span className="text-[10px] text-slate-500 font-mono">فصل {formatStatNumber(season)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
