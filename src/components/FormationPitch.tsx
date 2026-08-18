import React from "react";
import { normalizePersianString } from "../utils";

/**
 * FormationPitch — Football pitch with horizontal formation layout.
 *
 * Layout principle (horizontal pitch):
 *
 *   TEAM 2 (LEFT)                        TEAM 1 (RIGHT)
 *   GK → DEF → MID → ATT    |    ATT ← MID ← DEF ← GK
 *
 *  X = depth (distance from own goal toward center)
 *  Y = width (spread of players within each line)
 *
 *  Home team (right):  GK at high X, FWD at low X (near center)
 *  Away team (left):   GK at low X,  FWD at high X (near center)
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

function parseFormation(f?: string): number[] {
  if (!f) return [4, 4, 2];
  const parts = f.split("-").map(Number).filter(n => !isNaN(n) && n > 0);
  return parts.length >= 1 ? parts : [4, 4, 2];
}

function posToLine(p: PitchPlayer): number {
  const pos = (p.position || "").toLowerCase();
  if (pos.includes("دروازه") || pos.includes("gk") || pos.includes("گلر")) return 0;
  if (pos.includes("مدافع") || pos.includes("def")) return 1;
  if (pos.includes("هافبک") || pos.includes("وینگر") || pos.includes("mid") || pos.includes("wing")) return 2;
  return 3;
}

/**
 * Assign players to formation lines based on formation string and position.
 */
function assignLines(lineup: PitchPlayer[], formation: string): Map<number, PitchPlayer[]> {
  const parts = parseFormation(formation);
  const limits: Record<number, number> = { 0: 1, 1: 0, 2: 0, 3: 0 };

  if (parts.length === 3) {
    limits[1] = parts[0];
    limits[2] = parts[1];
    limits[3] = parts[2];
  } else if (parts.length === 2) {
    limits[1] = parts[0];
    limits[2] = parts[1];
    limits[3] = Math.max(0, 10 - parts[0] - parts[1]);
  } else if (parts.length === 1) {
    limits[1] = parts[0];
    limits[2] = Math.max(0, 10 - parts[0]);
  } else {
    limits[1] = 4; limits[2] = 4; limits[3] = 2;
  }

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
    if (counts[line] >= limits[line]) {
      if (line === 0) continue;
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
 * Compute {x, y} positions for one team on the HORIZONTAL pitch.
 *
 * Home team (right side):  x(GK)=92, x(DEF)=76, x(MID)=60, x(ATT)=46
 *   → GK is far right, ATT is near center (left)
 *   → players within a line spread along Y (top to bottom)
 *
 * Away team (left side):   x(GK)=8,  x(DEF)=24, x(MID)=40, x(ATT)=54
 *   → GK is far left, ATT is near center (right)
 *   → players within a line spread along Y (top to bottom)
 */
function computePositions(
  lineup: PitchPlayer[],
  formation: string,
  isHome: boolean,
): Array<{ player: PitchPlayer; x: number; y: number }> {
  const groups = assignLines(lineup, formation);

  // X positions for each formation line — HORIZONTAL depth
  // Home team: GK rightmost → ATT near center
  // Away team: GK leftmost → ATT near center
  const xHome: Record<number, number> = { 0: 92, 1: 76, 2: 60, 3: 46 };
  const xAway: Record<number, number> = { 0: 8, 1: 24, 2: 40, 3: 54 };
  const xMap = isHome ? xHome : xAway;

  const result: Array<{ player: PitchPlayer; x: number; y: number }> = [];

  for (const line of [0, 1, 2, 3]) {
    const players = groups.get(line) || [];
    if (players.length === 0) continue;

    const x = xMap[line];
    // Spread players along Y (width of the pitch)
    const yMin = 12;
    const yMax = 88;
    const yRange = yMax - yMin;

    if (players.length === 1) {
      result.push({ player: players[0], x, y: 50 });
    } else {
      for (let i = 0; i < players.length; i++) {
        const y = yMin + (yRange * i) / (players.length - 1);
        result.push({ player: players[i], x, y });
      }
    }
  }

  return result;
}

/* ─── Player dot ─── */
function PlayerDot({
  p, accent, onSelectPlayer, dbId,
}: {
  p: PitchPlayer;
  accent: "emerald" | "cyan";
  onSelectPlayer?: (id: string) => void;
  dbId?: string;
}) {
  const isClickable = !!dbId && !!onSelectPlayer;
  const bg = accent === "emerald"
    ? "bg-emerald-500 border-emerald-300 text-white shadow-emerald-500/40"
    : "bg-cyan-500 border-cyan-300 text-white shadow-cyan-500/40";

  return (
    <div
      className={`relative -translate-x-1/2 -translate-y-1/2 ${isClickable ? "cursor-pointer group" : ""}`}
      onClick={isClickable ? () => onSelectPlayer!(dbId) : undefined}
    >
      <div
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center
          font-mono text-[9px] sm:text-[10px] font-black shadow-lg transition-all duration-150
          ${bg}
          ${isClickable ? "group-hover:scale-125 group-hover:brightness-110 group-hover:shadow-xl" : "opacity-85"}
          ${p.isCaptain ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-green-800" : ""}
        `}
      >
        {p.number || "?"}
      </div>

      {/* Name below */}
      <div className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none mt-0.5">
        <span className={`text-[7px] sm:text-[8px] font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)] leading-none ${isClickable ? "text-white" : "text-slate-300/80"}`}>
          {p.name}
        </span>
      </div>

      {/* Goal badge */}
      {p.goals ? (
        <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-400 border border-amber-600 flex items-center justify-center text-[7px] font-black text-amber-900 shadow z-20">
          {p.goals}
        </span>
      ) : null}

      {/* Assist badge */}
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

      {/* Captain */}
      {p.isCaptain && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] text-amber-400 font-black z-20">©</span>
      )}
    </div>
  );
}

/* ─── Main component ─── */
export default function FormationPitch({
  homeLineup, awayLineup,
  homeSubs = [], awaySubs = [],
  homeFormation, awayFormation,
  homeName, awayName,
  onSelectPlayer, players, onEdit,
}: FormationPitchProps) {
  const homePositions = computePositions(homeLineup, homeFormation || "4-4-2", true);
  const awayPositions = computePositions(awayLineup, awayFormation || "4-4-2", false);

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
          <button onClick={onEdit} className="text-[10px] font-bold text-slate-400 hover:text-white transition px-2 py-1 rounded bg-white/5 hover:bg-white/10">
            ویرایش ترکیب
          </button>
        )}
      </div>

      {/* Single horizontal pitch */}
      <div className="relative" style={{ minHeight: 480 }}>
        {/* Pitch background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-green-900/30 via-green-800/20 to-green-900/30" />

          {/* Mowing stripes (horizontal) */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="absolute left-0 right-0" style={{
              top: `${i * 10}%`, height: "10%",
              background: i % 2 === 0 ? "rgba(34,197,94,0.03)" : "transparent",
            }} />
          ))}

          {/* Pitch markings SVG */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.12]" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Outer boundary */}
            <rect x="1" y="1" width="98" height="98" fill="none" stroke="white" strokeWidth="0.3" />
            {/* Center line (vertical = dividing the two halves) */}
            <line x1="50" y1="1" x2="50" y2="99" stroke="white" strokeWidth="0.25" />
            {/* Center circle */}
            <circle cx="50" cy="50" r="8" fill="none" stroke="white" strokeWidth="0.2" />
            <circle cx="50" cy="50" r="0.5" fill="white" />
            {/* Away penalty area (left side) */}
            <rect x="1" y="30" width="12" height="40" fill="none" stroke="white" strokeWidth="0.15" />
            <rect x="1" y="37" width="5" height="26" fill="none" stroke="white" strokeWidth="0.15" />
            <circle cx="9" cy="50" r="0.4" fill="white" />
            {/* Home penalty area (right side) */}
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

        {/* Away team label (left side) */}
        <div className="absolute z-20 px-3 py-1 rounded-md text-[9px] sm:text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
          style={{ left: "2%", top: 6 }}>
          {awayName}
          {awayFormation && <span className="font-mono opacity-70 ml-1">{awayFormation}</span>}
        </div>

        {/* Home team label (right side) */}
        <div className="absolute z-20 px-3 py-1 rounded-md text-[9px] sm:text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          style={{ right: "2%", top: 6 }}>
          {homeName}
          {homeFormation && <span className="font-mono opacity-70 ml-1">{homeFormation}</span>}
        </div>

        {/* All players — single coordinate space */}
        {awayPositions.map(({ player, x, y }, i) => {
          const dbId = resolveDbId(player, players);
          return (
            <div key={`away-${player.name}-${player.number || i}`}
              style={{ position: "absolute", left: `${x}%`, top: `${y}%`, zIndex: 10 }}>
              <PlayerDot p={player} accent="cyan" onSelectPlayer={onSelectPlayer} dbId={dbId} />
            </div>
          );
        })}
        {homePositions.map(({ player, x, y }, i) => {
          const dbId = resolveDbId(player, players);
          return (
            <div key={`home-${player.name}-${player.number || i}`}
              style={{ position: "absolute", left: `${x}%`, top: `${y}%`, zIndex: 10 }}>
              <PlayerDot p={player} accent="emerald" onSelectPlayer={onSelectPlayer} dbId={dbId} />
            </div>
          );
        })}

        {/* Subs bench — away (bottom-left) */}
        {awaySubs.length > 0 && (
          <div className="absolute bottom-0 left-0 px-2 py-1.5 border-t border-r border-cyan-500/20 bg-cyan-950/60 z-20"
            style={{ maxWidth: "48%" }}>
            <span className="text-[7px] font-bold text-slate-500 block mb-1">ذخیره‌ها {awayName}</span>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {awaySubs.map((p, i) => {
                const dbId = resolveDbId(p, players);
                const clickable = !!dbId && !!onSelectPlayer;
                return (
                  <span key={i} onClick={clickable ? () => onSelectPlayer!(dbId) : undefined}
                    className={`text-[8px] font-bold inline-flex items-center gap-0.5 text-cyan-400/60 ${clickable ? "hover:text-white cursor-pointer transition" : ""}`}>
                    <span className="font-mono opacity-40">{p.number || ""}</span>
                    <span>{p.name}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Subs bench — home (bottom-right) */}
        {homeSubs.length > 0 && (
          <div className="absolute bottom-0 right-0 px-2 py-1.5 border-t border-l border-emerald-500/20 bg-emerald-950/60 z-20"
            style={{ maxWidth: "48%" }}>
            <span className="text-[7px] font-bold text-slate-500 block mb-1">ذخیره‌ها {homeName}</span>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {homeSubs.map((p, i) => {
                const dbId = resolveDbId(p, players);
                const clickable = !!dbId && !!onSelectPlayer;
                return (
                  <span key={i} onClick={clickable ? () => onSelectPlayer!(dbId) : undefined}
                    className={`text-[8px] font-bold inline-flex items-center gap-0.5 text-emerald-400/60 ${clickable ? "hover:text-white cursor-pointer transition" : ""}`}>
                    <span className="font-mono opacity-40">{p.number || ""}</span>
                    <span>{p.name}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
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
