import React from "react";
import { normalizePersianString } from "../utils";

/**
 * FormationPitch — Graphical football pitch with players positioned by formation.
 *
 * Each side (home/away) occupies half the pitch.
 * Players are positioned using absolute % coords derived from the formation string.
 *
 * resolveDbId: ONLY returns IDs from the DB players list — never varzesh3 IDs.
 * Players NOT in the DB are rendered as plain (non-clickable) labels.
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

/**
 * Resolve a player's DB ID by name matching against the players prop.
 * Returns undefined if the player is NOT in the DB.
 * NEVER returns varzesh3 IDs — only real DB IDs (e.g. "player-1787040341986").
 */
function resolveDbId(player: PitchPlayer, dbPlayers?: any[]): string | undefined {
  if (!dbPlayers || !player.name) return undefined;
  const n = normalizePersianString(player.name);
  const found = dbPlayers.find((p: any) => normalizePersianString(p.name || "") === n);
  return found ? String(found.id) : undefined;
}

/**
 * Parse formation string "4-4-2" into an array [4, 4, 2] representing
 * number of players in each non-GK line: DEF, MID, FWD.
 */
function parseFormation(formation?: string): number[] {
  if (!formation) return [4, 4, 2];
  const parts = formation.split("-").map(Number).filter(n => !isNaN(n) && n > 0);
  if (parts.length === 0) return [4, 4, 2];
  return parts;
}

/**
 * Assign formationLine based on player position string.
 */
function posToLine(p: PitchPlayer): number {
  const pos = (p.position || "").toLowerCase();
  if (pos.includes("دروازه") || pos.includes("gk") || pos.includes("گلر")) return 0;
  if (pos.includes("مدافع") || pos.includes("def")) return 1;
  if (pos.includes("هافبک") || pos.includes("وینگر") || pos.includes("mid") || pos.includes("wing")) return 2;
  return 3;
}

/**
 * Compute {x, y} positions for all players on one half of the pitch.
 *
 * Layout (home side, attacking upward):
 *   GK:  bottom center
 *   DEF: spread across width above GK
 *   MID: spread across width above DEF
 *   FWD: spread across width near top
 *
 * Each line's players are evenly spaced across the horizontal center.
 * Uses the formation string to know how many players belong in each line.
 */
function computePositions(
  lineup: PitchPlayer[],
  formation: string,
  isHome: boolean,
): Array<{ player: PitchPlayer; x: number; y: number }> {
  const parts = parseFormation(formation);

  // Build expected lines from formation string
  // parts = [def, mid, fwd] or [def, mid] or [def, fwd] etc.
  // Standard: [DEF, MID, FWD] or [DEF, MID] or [DEF] etc.
  const defCount = parts[0] || 4;
  const midCount = parts.length > 2 ? parts[1] : (parts.length === 2 ? parts[1] : 0);
  const fwdCount = parts.length > 2 ? parts[2] : (parts.length === 3 ? parts[2] : 0);

  // Group players by their formationLine (or infer from position)
  const groups: Record<number, PitchPlayer[]> = { 0: [], 1: [], 2: [], 3: [] };
  for (const p of lineup) {
    let line = p.formationLine;
    if (line == null || line < 0 || line > 3) line = posToLine(p);
    groups[line].push(p);
  }

  // Y positions (home: GK bottom, FWD top; away: mirrored)
  const yMap: Record<number, number> = isHome
    ? { 0: 88, 1: 68, 2: 44, 3: 24 }
    : { 0: 12, 1: 32, 2: 56, 3: 76 };

  const result: Array<{ player: PitchPlayer; x: number; y: number }> = [];

  // Position each line: evenly space across 20%-80% horizontal
  const positionLine = (line: number) => {
    const players = groups[line];
    const y = yMap[line];
    if (players.length === 0) return;
    const margin = 20;
    const width = 100 - 2 * margin;
    if (players.length === 1) {
      result.push({ player: players[0], x: 50, y });
    } else {
      for (let i = 0; i < players.length; i++) {
        const x = margin + (width * i) / (players.length - 1);
        result.push({ player: players[i], x, y });
      }
    }
  };

  // Position GK first, then outfield lines
  positionLine(0);
  positionLine(1);
  positionLine(2);
  positionLine(3);

  return result;
}

/* ─── Individual player node ─── */
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
  const Wrapper = isClickable ? "button" : "div";
  const wrapperProps: any = isClickable
    ? {
        onClick: () => onSelectPlayer(dbId),
        className: "group relative cursor-pointer focus:outline-none -translate-x-1/2 -translate-y-1/2",
      }
    : {
        className: "group relative -translate-x-1/2 -translate-y-1/2",
      };

  const bgColor =
    accent === "emerald"
      ? "bg-emerald-500/90 border-emerald-300 text-white shadow-emerald-500/30"
      : "bg-cyan-500/90 border-cyan-300 text-white shadow-cyan-500/30";

  return (
    <Wrapper {...wrapperProps}>
      <div
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center
          font-mono text-[9px] sm:text-[10px] font-black shadow-lg transition-all
          ${bgColor}
          ${isClickable ? "group-hover:scale-125 group-hover:shadow-xl group-hover:brightness-110" : "opacity-80"}
          ${p.isCaptain ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-green-800" : ""}
        `}
      >
        {p.number || "?"}
      </div>

      {/* Name */}
      <div
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
        style={{ top: "100%", marginTop: 2 }}
      >
        <span
          className={`text-[7px] sm:text-[8px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${
            isClickable ? "text-white" : "text-slate-300"
          }`}
        >
          {p.name}
        </span>
      </div>

      {/* Goal badge */}
      {p.goals ? (
        <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-400 border border-amber-600 flex items-center justify-center text-[7px] font-black text-amber-900 shadow">
          {p.goals}
        </span>
      ) : null}

      {/* Assist badge */}
      {p.assists ? (
        <span className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-sky-400 border border-sky-600 flex items-center justify-center text-[7px] font-black text-sky-900 shadow">
          A
        </span>
      ) : null}

      {/* Yellow card */}
      {p.yellowCard ? (
        <span className="absolute top-1/2 -right-3 w-2 h-3 rounded-sm bg-yellow-400 border border-yellow-600" />
      ) : null}

      {/* Red card */}
      {p.redCard ? (
        <span className="absolute top-1/2 -left-3 w-2 h-3 rounded-sm bg-red-500 border border-red-700" />
      ) : null}

      {/* Captain */}
      {p.isCaptain && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-amber-400 font-black">
          ©
        </span>
      )}
    </Wrapper>
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
    accent: "emerald" | "cyan",
    sideLabel: string,
  ) => {
    const isHome = accent === "emerald";
    const borderClass = isHome ? "border-l border-white/10" : "border-r border-white/10";
    const gradFrom = isHome ? "from-emerald-500/5" : "from-cyan-500/5";

    return (
      <div className={`relative flex-1 min-h-[380px] sm:min-h-[440px] ${borderClass} ${gradFrom} to-transparent`}>
        {/* Team label */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-md text-[9px] sm:text-[10px] font-black
            ${isHome ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"}
          `}
          style={{ top: isHome ? "2%" : "auto", bottom: isHome ? "auto" : "2%" }}
        >
          {teamName}{" "}
          {(isHome ? homeFormation : awayFormation) && (
            <span className="font-mono opacity-70 ml-1">{isHome ? homeFormation : awayFormation}</span>
          )}
        </div>

        {/* Players */}
        {positions.map(({ player, x, y }, i) => {
          const dbId = resolveDbId(player, players);
          return (
            <div key={`${player.name}-${i}`} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, zIndex: 10 }}>
              <PlayerDot
                p={player}
                accent={accent}
                onSelectPlayer={onSelectPlayer}
                dbId={dbId}
              />
            </div>
          );
        })}

        {/* Subs bench */}
        {subs.length > 0 && (
          <div
            className={`absolute bottom-0 left-0 right-0 px-2 py-1.5 border-t z-20
              ${isHome ? "border-emerald-500/20 bg-emerald-950/50" : "border-cyan-500/20 bg-cyan-950/50"}
            `}
          >
            <span className="text-[7px] font-bold text-slate-500 block mb-1">ذخیره‌ها</span>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {subs.map((p, i) => {
                const dbId = resolveDbId(p, players);
                const isClickable = !!dbId && !!onSelectPlayer;
                return (
                  <span
                    key={i}
                    onClick={isClickable ? () => onSelectPlayer!(dbId) : undefined}
                    className={`text-[8px] font-bold inline-flex items-center gap-0.5 ${
                      isHome ? "text-emerald-400/60" : "text-cyan-400/60"
                    } ${isClickable ? "hover:text-white cursor-pointer transition" : ""}`}
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

      {/* Pitch — single SVG field behind both halves */}
      <div className="relative flex" style={{ minHeight: 440 }}>
        {/* Pitch background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Grass */}
          <div className="absolute inset-0 bg-gradient-to-b from-green-900/30 via-green-800/20 to-green-900/30" />

          {/* Mowing stripes */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0"
              style={{
                top: `${i * 12.5}%`,
                height: "12.5%",
                background: i % 2 === 0 ? "rgba(34,197,94,0.03)" : "transparent",
              }}
            />
          ))}

          {/* Pitch lines SVG */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.12]" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Outer boundary */}
            <rect x="1" y="1" width="98" height="98" fill="none" stroke="white" strokeWidth="0.3" />
            {/* Center line (vertical = dividing the two halves) */}
            <line x1="50" y1="1" x2="50" y2="99" stroke="white" strokeWidth="0.25" />
            {/* Center circle */}
            <circle cx="50" cy="50" r="8" fill="none" stroke="white" strokeWidth="0.2" />
            <circle cx="50" cy="50" r="0.5" fill="white" />
            {/* Home penalty area (left) */}
            <rect x="1" y="30" width="12" height="40" fill="none" stroke="white" strokeWidth="0.15" />
            <rect x="1" y="37" width="5" height="26" fill="none" stroke="white" strokeWidth="0.15" />
            <circle cx="9" cy="50" r="0.4" fill="white" />
            {/* Away penalty area (right) */}
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
        {renderHalf(homePositions, homeSubs, homeName, "emerald", "home")}

        {/* Away half */}
        {renderHalf(awayPositions, awaySubs, awayName, "cyan", "away")}
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
