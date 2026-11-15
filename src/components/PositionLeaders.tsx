import React, { useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp, Info, Star } from "lucide-react";
import {
  MIN_MATCHES_FOR_POSITION_LIST,
  POSITION_LIST_SIZE,
  PositionLeaderGroup,
} from "../shared/positionLeaders";
import { formatStatNumber } from "../utils";

/**
 * "Best of each position" — the eight public boards (goalkeeper, centre/left/
 * right defender, centre/left/right midfielder, forward). Rendered on the stats
 * page and inside every league's individual-stats tab; it deliberately does NOT
 * live in the home stats widget, which stays a quick season-overview surface.
 *
 * Every row comes from buildPositionLeaders(), so the min-3-matches gate and
 * the role bucketing are enforced in one place. Each board shows the top five
 * and expands inline — no separate page, no navigation away.
 */
interface PositionLeadersProps {
  groups: PositionLeaderGroup[];
  onSelectPlayer?: (id: string) => void;
  title?: string;
  className?: string;
}

const GROUP_ACCENT: Record<string, { badge: string; ring: string; bar: string }> = {
  gk: { badge: "bg-amber-500/15 text-amber-300 border-amber-500/25", ring: "hover:border-amber-500/30", bar: "bg-amber-400" },
  cb: { badge: "bg-sky-500/15 text-sky-300 border-sky-500/25", ring: "hover:border-sky-500/30", bar: "bg-sky-400" },
  lb: { badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25", ring: "hover:border-cyan-500/30", bar: "bg-cyan-400" },
  rb: { badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25", ring: "hover:border-indigo-500/30", bar: "bg-indigo-400" },
  cm: { badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", ring: "hover:border-emerald-500/30", bar: "bg-emerald-400" },
  rm: { badge: "bg-teal-500/15 text-teal-300 border-teal-500/25", ring: "hover:border-teal-500/30", bar: "bg-teal-400" },
  lm: { badge: "bg-lime-500/15 text-lime-300 border-lime-500/25", ring: "hover:border-lime-500/30", bar: "bg-lime-400" },
  fw: { badge: "bg-red-500/15 text-red-300 border-red-500/25", ring: "hover:border-red-500/30", bar: "bg-red-400" },
};

interface PositionLeaderCardProps {
  group: PositionLeaderGroup;
  onSelectPlayer?: (id: string) => void;
}

function PositionLeaderCard({ group, onSelectPlayer }: PositionLeaderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const accent = GROUP_ACCENT[group.key] || GROUP_ACCENT.cm;
  const players = group.players;
  const visible = expanded ? players : players.slice(0, POSITION_LIST_SIZE);
  const hiddenCount = players.length - POSITION_LIST_SIZE;
  const listId = `position-board-${group.key}`;

  return (
    <div className={`rounded-2xl bg-[#0a0a0c] border border-white/5 p-3.5 space-y-2.5 transition ${accent.ring}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-white">{group.label}</span>
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${accent.badge}`}>
          {group.short}
        </span>
      </div>

      <div
        id={listId}
        className={`space-y-1.5 ${expanded && hiddenCount > 0 ? "max-h-[260px] overflow-y-auto pl-1 [scrollbar-width:thin]" : ""}`}
      >
        {visible.map((player, index) => {
          const selectable = !!onSelectPlayer && !!player.id;
          const content = (
            <>
              <span className="w-4 shrink-0 text-[10px] font-black text-slate-500">{formatStatNumber(index + 1)}</span>
              <span className="h-6 w-0.5 shrink-0 rounded-full bg-white/10" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-black text-slate-100">{player.name}</span>
                <span className="block truncate text-[9px] font-bold text-slate-500">
                  {player.team || "بدون باشگاه"} • {formatStatNumber(player.matches)} بازی
                </span>
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <span className={`w-1 h-1 rounded-full ${accent.bar}`} aria-hidden="true" />
                <span className="text-[11px] font-black text-white tabular-nums">
                  {Number(player.rating).toFixed(1)}
                </span>
              </span>
            </>
          );
          return selectable ? (
            <button
              key={player.id}
              type="button"
              onClick={() => onSelectPlayer!(player.id)}
              className="w-full flex items-center gap-2 rounded-lg px-1.5 py-1 text-right hover:bg-white/[0.04] transition cursor-pointer group"
            >
              {content}
              <ArrowUpRight className="h-3 w-3 shrink-0 text-slate-600 group-hover:text-emerald-400 transition" />
            </button>
          ) : (
            <div key={`${player.id}-${index}`} className="w-full flex items-center gap-2 rounded-lg px-1.5 py-1">
              {content}
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={listId}
          className="w-full flex items-center justify-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] py-1.5 text-[10px] font-black text-slate-400 hover:text-white hover:border-white/10 transition cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              نمایش کمتر
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              نمایش همه ({formatStatNumber(players.length)})
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function PositionLeaders({
  groups,
  onSelectPlayer,
  title = "برترین‌های هر پست",
  className = "",
}: PositionLeadersProps) {
  if (!groups || groups.length === 0) return null;

  return (
    <section className={`space-y-3 ${className}`} id="position-leaders" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
        <h3 className="flex items-center gap-2 font-black text-sm text-white">
          <Star className="h-4 w-4 text-amber-400" />
          {title}
        </h3>
        <p className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
          <Info className="h-3 w-3" />
          فقط بازیکنان با حداقل {formatStatNumber(MIN_MATCHES_FOR_POSITION_LIST)} بازی — بر اساس میانگین نمره
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((group) => (
          <PositionLeaderCard key={group.key} group={group} onSelectPlayer={onSelectPlayer} />
        ))}
      </div>
    </section>
  );
}
