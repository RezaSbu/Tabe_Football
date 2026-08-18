import React, { useState } from "react";
import { normalizePersianString } from "../utils";

/**
 * FormationPitch — Graphical football pitch visualization.
 *
 * Shows a top-down green pitch with both teams' lineups positioned by
 * formation line index (0=GK, 1=DEF, 2=MID, 3=FWD).
 *
 * Player data shape expected:
 *  { id, name, number?, formationLine?, goals?, assists?, yellowCard?, redCard?, isCaptain?, substituted? }
 *
 * Props:
 *  - homeLineup / awayLineup: player arrays
 *  - homeSubs / awaySubs: substitute arrays
 *  - homeFormation / awayFormation: e.g. "4-4-2"
 *  - homeName / awayName: team display names
 *  - accent: theme accent
 *  - onSelectPlayer?: (id: string) => void
 *  - players?: any[] (DB player list for name resolution)
 *  - events?: any[] (match events for showing icons on pitch)
 *  - onEdit?: () => void (admin edit button)
 */

interface PitchPlayer {
  id?: string;
  name: string;
  number?: number | string;
  formationLine?: number;
  goals?: number;
  assists?: number;
  yellowCard?: number;
  redCard?: number;
  isCaptain?: boolean;
  substituted?: boolean;
  position?: string;
}

interface FormationPitchProps {
  homeLineup: PitchPlayer[];
  awayLineup: PitchPlayer[];
  homeSubs?: PitchPlayer[];
  awaySubs?: PitchPlayer[];
  homeFormation?: string;
  awayFormation?: string;
  homeName: string;
  awayName: string;
  onSelectPlayer?: (id: string) => void;
  players?: any[];
  onEdit?: () => void;
}

const LINE_Y: Record<number, number> = {
  0: 92,   // GK — bottom
  1: 72,   // DEF
  2: 48,   // MID
  3: 28,   // FWD — top
};

const POSITION_LABEL: Record<number, string> = {
  0: "دروازه‌بان",
  1: "مدافع",
  2: "هافبک",
  3: "مهاجم",
};

function resolveId(player: PitchPlayer, players?: any[]): string | undefined {
  if (player.id) return player.id;
  if (!players || !player.name) return undefined;
  const n = normalizePersianString(player.name);
  const found = players.find((p: any) => normalizePersianString(p.name || "") === n);
  return found ? String(found.id) : undefined;
}

function PlayerNode({
  p,
  accent,
  onSelectPlayer,
  players,
}: {
  p: PitchPlayer;
  accent: "emerald" | "cyan";
  onSelectPlayer?: (id: string) => void;
  players?: any[];
}) {
  const rid = resolveId(p, players);
  const isClickable = rid && onSelectPlayer;
  const color = accent === "emerald"
    ? "bg-emerald-500/90 border-emerald-300 text-white shadow-emerald-500/30"
    : "bg-cyan-500/90 border-cyan-300 text-white shadow-cyan-500/30";

  const Wrapper = isClickable ? "button" : "div";
  const wrapperProps: any = isClickable
    ? { onClick: () => onSelectPlayer(rid!), className: "group relative cursor-pointer focus:outline-none" }
    : { className: "group relative" };

  return (
    <Wrapper {...wrapperProps}>
      {/* Player dot */}
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center
          font-mono text-[10px] sm:text-xs font-black shadow-lg transition-transform
          group-hover:scale-110 group-hover:shadow-xl
          ${color}
          ${p.isCaptain ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-green-800" : ""}
        `}
      >
        {p.number || "?"}
      </div>

      {/* Name label */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
        <span className="text-[8px] sm:text-[9px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {p.name}
        </span>
      </div>

      {/* Event badges */}
      <div className="absolute -top-1.5 -right-1.5 flex flex-col gap-0.5">
        {p.goals ? (
          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-400 border border-amber-600 flex items-center justify-center text-[8px] font-black text-amber-900 shadow">
            {p.goals}
          </span>
        ) : null}
        {p.assists ? (
          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-sky-400 border border-sky-600 flex items-center justify-center text-[8px] font-black text-sky-900 shadow">
            A
          </span>
        ) : null}
      </div>

      {/* Card badges */}
      <div className="absolute -top-1.5 -left-1.5 flex flex-col gap-0.5">
        {p.yellowCard ? (
          <span className="w-3 h-4 rounded-sm bg-yellow-400 border border-yellow-600 shadow" />
        ) : null}
        {p.redCard ? (
          <span className="w-3 h-4 rounded-sm bg-red-500 border border-red-700 shadow" />
        ) : null}
      </div>

      {/* Captain badge */}
      {p.isCaptain && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px]">©</span>
      )}

      {/* Substituted out indicator */}
      {p.substituted && (
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[7px] text-slate-400">
          ↓
        </span>
      )}
    </Wrapper>
  );
}

export default function FormationPitch({
  homeLineup,
  awayLineup,
  homeSubs = [],
  awaySubs = [],
  homeFormation,
  awayFormation,
  homeName,
  awayName,
  onSelectPlayer,
  players,
  onEdit,
}: FormationPitchProps) {
  const [hovered, setHovered] = useState<"home" | "away" | null>(null);

  const positionPlayers = (lineup: PitchPlayer[]): Map<number, PitchPlayer[]> => {
    const byLine = new Map<number, PitchPlayer[]>();
    for (const p of lineup) {
      let line = p.formationLine;
      if (line == null) {
        const pos = (p.position || "").toLowerCase();
        if (pos.includes("دروازه") || pos.includes("gk")) line = 0;
        else if (pos.includes("مدافع") || pos.includes("def")) line = 1;
        else if (pos.includes("هافبک") || pos.includes("mid")) line = 2;
        else line = 3;
      }
      if (!byLine.has(line)) byLine.set(line, []);
      byLine.get(line)!.push(p);
    }
    return byLine;
  };

  const renderTeamSide = (
    lineup: PitchPlayer[],
    subs: PitchPlayer[],
    formation: string | undefined,
    teamName: string,
    accent: "emerald" | "cyan",
    isHome: boolean,
  ) => {
    const byLine = positionPlayers(lineup);

    // For home: GK at bottom (y=92), FWD at top (y=28)
    // For away: mirror — GK at top (y=8), FWD at bottom (y=72)
    const getY = (line: number): number => {
      if (isHome) return LINE_Y[line] || 50;
      // Mirror: 0->8, 1->28, 2->48, 3->68
      const mirrored: Record<number, number> = { 0: 8, 1: 28, 2: 48, 3: 68 };
      return mirrored[line] || 50;
    };

    // Lines sorted: GK first
    const sortedLines = [...byLine.entries()].sort(([a], [b]) => a - b);

    return (
      <div
        className="relative flex-1 min-h-[340px] sm:min-h-[400px]"
        onMouseEnter={() => setHovered(accent === "emerald" ? "home" : "away")}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Team header */}
        <div className={`absolute top-1 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black
          ${accent === "emerald" ? "bg-emerald-500/20 text-emerald-300" : "bg-cyan-500/20 text-cyan-300"}
          border ${accent === "emerald" ? "border-emerald-500/30" : "border-cyan-500/30"}
        `}>
          {teamName} {formation ? <span className="font-mono opacity-70">{formation}</span> : null}
        </div>

        {sortedLines.map(([line, players]) => (
          <div key={line} className="absolute left-1/2 -translate-x-1/2 flex justify-center gap-2 sm:gap-3"
            style={{ top: `${getY(line)}%`, transform: "translateX(-50%)", position: "absolute" }}>
            {players.map((p, i) => (
              <PlayerNode key={`${line}-${i}`} p={p} accent={accent} onSelectPlayer={onSelectPlayer} players={players} />
            ))}
          </div>
        ))}

        {/* Subs bench */}
        {subs.length > 0 && (
          <div className={`absolute bottom-0 left-0 right-0 px-2 py-1.5 border-t
            ${accent === "emerald" ? "border-emerald-500/20 bg-emerald-950/30" : "border-cyan-500/20 bg-cyan-950/30"}
          `}>
            <span className="text-[8px] font-bold text-slate-500 block mb-1">ذخیره‌ها</span>
            <div className="flex flex-wrap gap-1">
              {subs.map((p, i) => {
                const rid = resolveId(p, players);
                const Sub = rid && onSelectPlayer ? "button" : "div";
                const subProps: any = rid && onSelectPlayer
                  ? { onClick: () => onSelectPlayer(rid), className: "cursor-pointer hover:text-white transition" }
                  : {};
                return (
                  <Sub key={i} {...subProps}
                    className={`inline-flex items-center gap-0.5 text-[8px] sm:text-[9px] font-bold
                      ${accent === "emerald" ? "text-emerald-400/70" : "text-cyan-400/70"}
                      ${rid && onSelectPlayer ? "hover:text-white cursor-pointer" : ""}
                    `}
                  >
                    <span className="font-mono opacity-50">{p.number || ""}</span>
                    <span>{p.name}</span>
                  </Sub>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-[#141418] border border-white/5 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-gradient-to-l from-emerald-500/5 via-transparent to-cyan-500/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-white">ترکیب دو تیم</span>
          {(homeFormation || awayFormation) && (
            <span className="text-[10px] text-slate-500 font-mono">
              {homeFormation || "?"} — {awayFormation || "?"}
            </span>
          )}
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-[10px] font-bold text-slate-400 hover:text-white transition px-2 py-1 rounded bg-white/5 hover:bg-white/10"
          >
            ویرایش ترکیب
          </button>
        )}
      </div>

      {/* Pitch */}
      <div className="relative flex">
        {/* Pitch background (full width behind both sides) */}
        <div className="absolute inset-0">
          {/* Main grass */}
          <div className="absolute inset-0 bg-gradient-to-b from-green-900/40 via-green-800/30 to-green-900/40" />

          {/* Stripes */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0"
              style={{
                left: `${i * 16.66}%`,
                width: "16.66%",
                background: i % 2 === 0 ? "rgba(34,197,94,0.04)" : "transparent",
              }}
            />
          ))}

          {/* Pitch markings */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.15]" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Outer border */}
            <rect x="2" y="2" width="96" height="96" fill="none" stroke="white" strokeWidth="0.3" />
            {/* Center line */}
            <line x1="2" y1="50" x2="98" y2="50" stroke="white" strokeWidth="0.2" />
            {/* Center circle */}
            <circle cx="50" cy="50" r="10" fill="none" stroke="white" strokeWidth="0.2" />
            <circle cx="50" cy="50" r="0.5" fill="white" />
            {/* Left penalty area */}
            <rect x="2" y="30" width="15" height="40" fill="none" stroke="white" strokeWidth="0.2" />
            <rect x="2" y="38" width="6" height="24" fill="none" stroke="white" strokeWidth="0.2" />
            <circle cx="12" cy="50" r="0.4" fill="white" />
            {/* Right penalty area */}
            <rect x="83" y="30" width="15" height="40" fill="none" stroke="white" strokeWidth="0.2" />
            <rect x="92" y="38" width="6" height="24" fill="none" stroke="white" strokeWidth="0.2" />
            <circle cx="88" cy="50" r="0.4" fill="white" />
            {/* Corner arcs */}
            <path d="M 2 4 A 2 2 0 0 1 4 2" fill="none" stroke="white" strokeWidth="0.2" />
            <path d="M 96 2 A 2 2 0 0 1 98 4" fill="none" stroke="white" strokeWidth="0.2" />
            <path d="M 2 96 A 2 2 0 0 0 4 98" fill="none" stroke="white" strokeWidth="0.2" />
            <path d="M 96 98 A 2 2 0 0 0 98 96" fill="none" stroke="white" strokeWidth="0.2" />
          </svg>

          {/* Center divider line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/5" />
        </div>

        {/* Home side */}
        {renderTeamSide(homeLineup, homeSubs, homeFormation, homeName, "emerald", true)}

        {/* Away side */}
        {renderTeamSide(awayLineup, awaySubs, awayFormation, awayName, "cyan", false)}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-white/5 text-[8px] sm:text-[9px] text-slate-500 font-bold">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-600 inline-block" /> گل
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-sky-400 border border-sky-600 inline-block text-[7px] text-sky-900 flex items-center justify-center font-black">A</span> پاس
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-3 rounded-sm bg-yellow-400 border border-yellow-600 inline-block" /> کارت زرد
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-3 rounded-sm bg-red-500 border border-red-700 inline-block" /> کارت قرمز
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full border-2 border-amber-400 inline-block" /> کاپیتان
        </span>
      </div>
    </div>
  );
}
