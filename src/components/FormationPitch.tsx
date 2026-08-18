import React from "react";
import { normalizePersianString } from "../utils";

/**
 * FormationPitch — Football pitch with players positioned by formation.
 *
 * Key behaviors:
 *  - Formation string (e.g. "3-5-2") drives how many players per line
 *  - Players are sorted by number within each line for consistent layout
 *  - Only DB-matching players are clickable; non-DB players are plain text
 *  - Home team attacks upward, away team attacks downward
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

/* ─── Helpers ─── */

function resolveDbId(player: PitchPlayer, dbPlayers?: any[]): string | undefined {
  if (!dbPlayers || !player.name) return undefined;
  const n = normalizePersianString(player.name);
  const found = dbPlayers.find((p: any) => normalizePersianString(p.name || "") === n);
  return found ? String(found.id) : undefined;
}

/** Parse "3-5-2" → [3, 5, 2] */
function parseFormation(f?: string): number[] {
  if (!f) return [4, 4, 2];
  const parts = f.split("-").map(Number).filter(n => !isNaN(n) && n > 0);
  return parts.length >= 1 ? parts : [4, 4, 2];
}

/** Infer formation line from position string */
function posToLine(p: PitchPlayer): number {
  const pos = (p.position || "").toLowerCase();
  if (pos.includes("دروازه") || pos.includes("gk") || pos.includes("گلر")) return 0;
  if (pos.includes("مدافع") || pos.includes("def")) return 1;
  if (pos.includes("هافبک") || pos.includes("وینگر") || pos.includes("mid") || pos.includes("wing")) return 2;
  return 3;
}

/**
 * Assign players to formation lines based on formation string and position.
 *
 * Algorithm:
 * 1. Parse formation (e.g. "3-5-2" → def=3, mid=5, fwd=2)
 * 2. Players with `formationLine` are kept in their line
 * 3. Players without `formationLine` are assigned by position string
 * 4. If a line has more players than the formation allows, overflow goes to the next line
 */
function assignLines(
  lineup: PitchPlayer[],
  formation: string,
): Map<number, PitchPlayer[]> {
  const parts = parseFormation(formation);
  const limits: Record<number, number> = {
    0: 1, // GK always 1
    1: parts[0] || 4, // DEF
    2: parts.length > 2 ? parts[1] : (parts.length === 2 ? parts[1] : 0), // MID
    3: parts.length > 2 ? parts[2] : 0, // FWD
  };

  // If formation is 2-part like "4-4", assume DEF=4, MID=4, FWD=rest (11 - DEF - MID - 1)
  if (parts.length === 2) {
    limits[1] = parts[0];
    limits[2] = parts[1];
    limits[3] = 11 - 1 - parts[0] - parts[1]; // remainder goes to FWD
    if (limits[3] < 0) limits[3] = 0;
  }
  if (parts.length === 1) {
    limits[1] = parts[0];
    limits[2] = 11 - 1 - parts[0]; // rest go to MID
    limits[3] = 0;
    if (limits[2] < 0) limits[2] = 0;
  }

  // Sort players: GK first, then by number
  const sorted = [...lineup].sort((a, b) => {
    const la = a.formationLine ?? posToLine(a);
    const lb = b.formationLine ?? posToLine(b);
    if (la !== lb) return la - lb;
    return (Number(a.number) || 99) - (Number(b.number) || 99);
  });

  const result = new Map<number, PitchPlayer[]>();
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

  for (const p of sorted) {
    let line = p.formationLine;
    if (line == null || line < 0 || line > 3) line = posToLine(p);

    // If line is full, try overflow
    if (counts[line] >= limits[line]) {
      // GK overflow: skip (shouldn't happen)
      if (line === 0) continue;
      // DEF overflow → MID, MID overflow → FWD
      if (line === 1 && counts[2] < limits[2]) line = 2;
      else if (line <= 2 && counts[3] < limits[3]) line = 3;
      else if (line === 2 && counts[1] < limits[1]) line = 1;
      else if (line === 3 && counts[2] < limits[2]) line = 2;
    }

    if (!result.has(line)) result.set(line, []);
    result.get(line)!.push(p);
    counts[line]++;
  }

  return result;
}

/**
 * Compute {x, y} positions for players on one half of the pitch.
 *
 * The pitch is divided vertically:
 *  - Home team: GK at bottom (90%), DEF at 72%, MID at 48%, FWD at 28%
 *  - Away team: mirrored (GK at top 10%, etc.)
 *
 * Within each line, players are evenly spread across 15%-85% horizontal.
 * This creates the classic football formation shape.
 */
function computePositions(
  lineup: PitchPlayer[],
  formation: string,
  isHome: boolean,
): Array<{ player: PitchPlayer; x: number; y: number }> {
  const groups = assignLines(lineup, formation);

  // Y positions for each line (home: GK bottom, away: GK top)
  const yHome: Record<number, number> = { 0: 90, 1: 72, 2: 48, 3: 28 };
  const yAway: Record<number, number> = { 0: 10, 1: 28, 2: 52, 3: 72 };
  const yMap = isHome ? yHome : yAway;

  const result: Array<{ player: PitchPlayer; x: number; y: number }> = [];

  // Process lines: GK(0), DEF(1), MID(2), FWD(3)
  for (const line of [0, 1, 2, 3]) {
    const players = groups.get(line) || [];
    if (players.length === 0) continue;

    const y = yMap[line];
    const xMin = 15;
    const xMax = 85;
    const xRange = xMax - xMin;

    if (players.length === 1) {
      result.push({ player: players[0], x: 50, y });
    } else {
      for (let i = 0; i < players.length; i++) {
        const x = xMin + (xRange * i) / (players.length - 1);
        result.push({ player: players[i], x, y });
      }
    }
  }

  return result;
}

/* ─── Player dot ─── */
function PlayerDot({
  p,
  accent,
  onSelectPlayer,
  dbId,
}: {
  p: PitchPlayer;
  accent: "emerald" | "cyan";
  onSelectPlayer?: (id: string) => void;
  dbId?: string;
}) {
  const isClickable = !!dbId && !!onSelectPlayer;

  const bg =
    accent === "emerald"
      ? "bg-emerald-500 border-emerald-300 text-white shadow-emerald-500/40"
      : "bg-cyan-500 border-cyan-300 text-white shadow-cyan-500/40";

  return (
    <div
      className={`relative -translate-x-1/2 -translate-y-1/2 ${
        isClickable ? "cursor-pointer group" : ""
      }`}
      onClick={isClickable ? () => onSelectPlayer!(dbId) : undefined}
    >
      {/* Circle */}
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center
          font-mono text-[10px] sm:text-[11px] font-black shadow-lg
          transition-all duration-150
          ${bg}
          ${isClickable ? "group-hover:scale-125 group-hover:brightness-110 group-hover:shadow-xl" : "opacity-85"}
          ${p.isCaptain ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-green-800" : ""}
        `}
      >
        {p.number || "?"}
      </div>

      {/* Name label below */}
      <div className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none mt-0.5">
        <span
          className={`text-[7px] sm:text-[8px] font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)] leading-none ${
            isClickable ? "text-white" : "text-slate-300/80"
          }`}
        >
          {p.name}
        </span>
      </div>

      {/* Goal badge (top-right) */}
      {p.goals ? (
        <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-400 border border-amber-600 flex items-center justify-center text-[7px] font-black text-amber-900 shadow z-20">
          {p.goals}
        </span>
      ) : null}

      {/* Assist badge (top-left) */}
      {p.assists ? (
        <span className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-sky-400 border border-sky-600 flex items-center justify-center text-[7px] font-black text-sky-900 shadow z-20">
          A
        </span>
      ) : null}

      {/* Yellow card */}
      {p.yellowCard ? (
        <span className="absolute top-1/2 -right-3 w-2 h-3 rounded-[1px] bg-yellow-400 border border-yellow-600 shadow z-20" />
      ) : null}

      {/* Red card */}
      {p.redCard ? (
        <span className="absolute top-1/2 -left-3 w-2 h-3 rounded-[1px] bg-red-500 border border-red-700 shadow z-20" />
      ) : null}

      {/* Captain badge */}
      {p.isCaptain && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] text-amber-400 font-black z-20">
          ©
        </span>
      )}
    </div>
  );
}

/* ─── Main component ─── */
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
  const homePositions = computePositions(homeLineup, homeFormation || "4-4-2", true);
  const awayPositions = computePositions(awayLineup, awayFormation || "4-4-2", false);

  const renderHalf = (
    positions: Array<{ player: PitchPlayer; x: number; y: number }>,
    subs: PitchPlayer[],
    teamName: string,
    formation: string | undefined,
    accent: "emerald" | "cyan",
  ) => {
    const isHome = accent === "emerald";

    return (
      <div className={`relative flex-1 min-h-[400px] sm:min-h-[460px]`}>
        {/* Team label */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-md text-[9px] sm:text-[10px] font-black
            ${isHome
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
            }
          `}
          style={{ [isHome ? "bottom" : "top"]: 4 }}
        >
          {teamName}
          {formation && <span className="font-mono opacity-70 ml-1">{formation}</span>}
        </div>

        {/* Players */}
        {positions.map(({ player, x, y }, i) => {
          const dbId = resolveDbId(player, players);
          return (
            <div
              key={`${player.name}-${player.number || i}`}
              style={{ position: "absolute", left: `${x}%`, top: `${y}%`, zIndex: 10 }}
            >
              <PlayerDot p={player} accent={accent} onSelectPlayer={onSelectPlayer} dbId={dbId} />
            </div>
          );
        })}

        {/* Subs bench */}
        {subs.length > 0 && (
          <div
            className={`absolute bottom-0 left-0 right-0 px-2 py-1.5 border-t z-20
              ${isHome ? "border-emerald-500/20 bg-emerald-950/60" : "border-cyan-500/20 bg-cyan-950/60"}
            `}
          >
            <span className="text-[7px] font-bold text-slate-500 block mb-1">ذخیره‌ها</span>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {subs.map((p, i) => {
                const dbId = resolveDbId(p, players);
                const clickable = !!dbId && !!onSelectPlayer;
                return (
                  <span
                    key={i}
                    onClick={clickable ? () => onSelectPlayer!(dbId) : undefined}
                    className={`text-[8px] font-bold inline-flex items-center gap-0.5
                      ${isHome ? "text-emerald-400/60" : "text-cyan-400/60"}
                      ${clickable ? "hover:text-white cursor-pointer transition" : ""}
                    `}
                  >
                    <span className="font-mono opacity-40">{p.number || ""}</span>
                    <span>{p.name}</span>
                  </span>
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
      {/* Header */}
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
      <div className="relative flex" style={{ minHeight: 460 }}>
        {/* Grass background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-green-900/30 via-green-800/20 to-green-900/30" />
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0"
              style={{
                top: `${i * 10}%`,
                height: "10%",
                background: i % 2 === 0 ? "rgba(34,197,94,0.03)" : "transparent",
              }}
            />
          ))}

          {/* Pitch lines SVG — full field */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.12]" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Outer boundary */}
            <rect x="1" y="1" width="98" height="98" fill="none" stroke="white" strokeWidth="0.3" />
            {/* Center line (horizontal divider between halves) */}
            <line x1="50" y1="1" x2="50" y2="99" stroke="white" strokeWidth="0.25" />
            {/* Center circle */}
            <circle cx="50" cy="50" r="8" fill="none" stroke="white" strokeWidth="0.2" />
            <circle cx="50" cy="50" r="0.5" fill="white" />
            {/* Home penalty area (left side) */}
            <rect x="1" y="30" width="12" height="40" fill="none" stroke="white" strokeWidth="0.15" />
            <rect x="1" y="37" width="5" height="26" fill="none" stroke="white" strokeWidth="0.15" />
            <circle cx="9" cy="50" r="0.4" fill="white" />
            {/* Away penalty area (right side) */}
            <rect x="87" y="30" width="12" height="40" fill="none" stroke="white" strokeWidth="0.15" />
            <rect x="94" y="37" width="5" height="26" fill="none" stroke="white" strokeWidth="0.15" />
            <circle cx="91" cy="50" r="0.4" fill="white" />
            {/* Corner arcs */}
            <path d="M 1 3 A 2 2 0 0 1 3 1" fill="none" stroke="white" strokeWidth="0.15" />
            <path d="M 97 1 A 2 2 0 0 1 99 3" fill="none" stroke="white" strokeWidth="0.15" />
            <path d="M 1 97 A 2 2 0 0 0 3 99" fill="none" stroke="white" strokeWidth="0.15" />
            <path d="M 97 99 A 2 2 0 0 0 99 97" fill="none" stroke="white" strokeWidth="0.15" />
          </svg>
        </div>

        {/* Home half */}
        {renderHalf(homePositions, homeSubs, homeName, homeFormation, "emerald")}

        {/* Away half */}
        {renderHalf(awayPositions, awaySubs, awayName, awayFormation, "cyan")}
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
