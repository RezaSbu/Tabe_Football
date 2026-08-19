import React, { useState } from "react";
import { normalizePersianString, getSafeImageUrl, toPersianDigits } from "../utils";

/**
 * FormationPitch — Professional football formation display.
 *
 *   TEAM 2 (LEFT)                        TEAM 1 (RIGHT)
 *   GK → DEF → MID → ATT    |    ATT ← MID ← DEF ← GK
 *
 * Formation-aware positioning with compact strikers, wide wingers,
 * and role-based Y spread. All event icons are SVG, no emoji.
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
  substituted?: boolean;
  subMinute?: number | string | null;
  isCaptain?: boolean;
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

/* ═══════════════════════════════════════════════════════════════
   SVG Event Icons — unified design language, no emoji
   ═══════════════════════════════════════════════════════════════ */

const ICON = "w-3 h-3 sm:w-3.5 sm:h-3.5";

function GoalIcon() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.5" stroke="#facc15" strokeWidth="1.5" />
      <path d="M8 1.5L6.2 5.5H9.8L8 1.5Z" fill="#facc15" opacity="0.7" />
      <path d="M1.5 8L5.5 6.2V9.8L1.5 8Z" fill="#facc15" opacity="0.7" />
      <path d="M14.5 8L10.5 9.8V6.2L14.5 8Z" fill="#facc15" opacity="0.7" />
      <path d="M8 14.5L9.8 10.5H6.2L8 14.5Z" fill="#facc15" opacity="0.7" />
    </svg>
  );
}

function AssistIcon() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="5" cy="8" r="3" stroke="#38bdf8" strokeWidth="1.3" />
      <path d="M8 8L13 4" stroke="#38bdf8" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 3L13 4L12 6" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function YellowCardIcon() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="2" width="8" height="11" rx="1.5" fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" />
    </svg>
  );
}

function RedCardIcon() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="2" width="8" height="11" rx="1.5" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" />
    </svg>
  );
}

function SubIcon() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2V14" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5 5L8 2L11 5" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 11L8 14L11 11" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OwnGoalIcon() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.5" stroke="#f87171" strokeWidth="1.5" />
      <path d="M8 1.5L6.2 5.5H9.8L8 1.5Z" fill="#f87171" opacity="0.6" />
      <path d="M5 11L11 5" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function PenaltyIcon() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="9" r="5.5" stroke="#facc15" strokeWidth="1.3" />
      <path d="M8 3.5L7 6.5H9L8 3.5Z" fill="#facc15" opacity="0.6" />
      <line x1="8" y1="1" x2="8" y2="3" stroke="#facc15" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function MissedPenaltyIcon() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" stroke="#71717a" strokeWidth="1.2" strokeDasharray="2 1.5" />
      <path d="M5.5 5.5L10.5 10.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.5 5.5L5.5 10.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function VarIcon() {
  return (
    <svg className={ICON} viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="2" width="18" height="12" rx="2" fill="#6366f1" opacity="0.9" />
      <text x="10" y="11" textAnchor="middle" fill="white" fontSize="7" fontWeight="900" fontFamily="monospace">VAR</text>
    </svg>
  );
}

function CaptainIcon() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" stroke="#f59e0b" strokeWidth="1.3" />
      <text x="8" y="11.5" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="900" fontFamily="monospace">C</text>
    </svg>
  );
}

function InjuryIcon() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" stroke="#ef4444" strokeWidth="1.3" />
      <rect x="7" y="4" width="2" height="8" rx="0.5" fill="#ef4444" />
      <rect x="4" y="7" width="8" height="2" rx="0.5" fill="#ef4444" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

function findDbPlayer(player: PitchPlayer, dbPlayers?: any[]): any | undefined {
  if (!dbPlayers || !player.name) return undefined;
  const n = normalizePersianString(player.name);
  return dbPlayers.find((p: any) => normalizePersianString(p.name || "") === n);
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

/** Resolve formation into {defCount, midCount, fwdCount} from 3 or 4 part string. */
function resolveFormationCounts(formation: string): { def: number; mid: number; fwd: number } {
  const parts = parseFormation(formation);
  if (parts.length === 3) return { def: parts[0], mid: parts[1], fwd: parts[2] };
  if (parts.length === 4) return { def: parts[0], mid: parts[1] + parts[2], fwd: parts[3] };
  if (parts.length === 2) return { def: parts[0], mid: parts[1], fwd: 10 - parts[0] - parts[1] };
  return { def: 4, mid: 4, fwd: 2 };
}

/** Y spread range for a line based on count and context. */
function getYRange(line: 0 | 1 | 2 | 3, count: number): { yMin: number; yMax: number } {
  if (line === 0) return { yMin: 50, yMax: 50 }; // GK always center
  if (line === 1) {
    // DEF: more spread for 4-5, moderate for 3
    if (count >= 4) return { yMin: 12, yMax: 88 };
    if (count === 3) return { yMin: 25, yMax: 75 };
    return { yMin: 35, yMax: 65 };
  }
  if (line === 2) {
    // MID
    if (count >= 5) return { yMin: 10, yMax: 90 };  // wingbacks full width
    if (count === 4) return { yMin: 15, yMax: 85 };
    if (count === 3) return { yMin: 28, yMax: 72 };
    if (count === 2) return { yMin: 38, yMax: 62 };  // double pivot compact
    return { yMin: 45, yMax: 55 };
  }
  // FWD
  if (count === 1) return { yMin: 50, yMax: 50 };
  if (count === 2) return { yMin: 38, yMax: 62 };   // compact pair
  if (count === 3) return { yMin: 12, yMax: 88 };   // wide trident: LW, ST, RW
  return { yMin: 15, yMax: 85 };
}

/**
 * Compute positions for one team. Formation-aware, compact strikers, wide wingers.
 *
 * X: depth from own goal toward center
 * Y: width within each line, using formation-aware spread
 */
function computePositions(
  lineup: PitchPlayer[],
  formation: string,
  isHome: boolean,
): Array<{ player: PitchPlayer; x: number; y: number }> {
  const { def, mid, fwd } = resolveFormationCounts(formation);

  // X depth positions — shifted further apart
  const xHome: Record<number, number> = { 0: 92, 1: 76, 2: 63, 3: 55 };
  const xAway: Record<number, number> = { 0: 8, 1: 24, 2: 37, 3: 45 };
  const xMap = isHome ? xHome : xAway;

  // Count per line
  const lineCounts: Record<number, number> = { 1: def, 2: mid, 3: fwd };

  // Assign players to lines
  const sorted = [...lineup].sort((a, b) => {
    const la = a.formationLine ?? posToLine(a);
    const lb = b.formationLine ?? posToLine(b);
    if (la !== lb) return la - lb;
    return (Number(a.number) || 99) - (Number(b.number) || 99);
  });

  const groups = new Map<number, PitchPlayer[]>();
  const limits: Record<number, number> = { 0: 1, 1: def, 2: mid, 3: fwd };
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
    if (!groups.has(line)) groups.set(line, []);
    groups.get(line)!.push(p);
    counts[line]++;
  }

  const result: Array<{ player: PitchPlayer; x: number; y: number }> = [];

  for (const line of [0, 1, 2, 3] as const) {
    const players = groups.get(line) || [];
    if (players.length === 0) continue;

    const x = xMap[line];
    const { yMin, yMax } = getYRange(line, players.length);
    const yRange = yMax - yMin;

    if (players.length === 1 || yRange === 0) {
      for (const p of players) {
        result.push({ player: p, x, y: 50 });
      }
    } else {
      for (let i = 0; i < players.length; i++) {
        const y = yMin + (yRange * i) / (players.length - 1);
        result.push({ player: players[i], x, y });
      }
    }
  }

  return result;
}

/* ═══════════════════════════════════════════════════════════════
   Player Node — circle + name + event container
   ═══════════════════════════════════════════════════════════════ */

function PlayerAvatar({ image, accent }: { image?: string; accent: "emerald" | "cyan" }) {
  const [imgErr, setImgErr] = useState(false);
  if (!image || imgErr) return null;
  const border = accent === "emerald" ? "border-emerald-300" : "border-cyan-300";
  return (
    <img loading="lazy" decoding="async" src={getSafeImageUrl(image)} alt=""
      className={`absolute inset-0 w-full h-full rounded-full object-cover border-2 ${border}`}
      referrerPolicy="no-referrer" onError={() => setImgErr(true)} />
  );
}

function formatMinute(raw: number | string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw);
  if (!s || s === "null") return null;
  return toPersianDigits(s) + "'";
}

function PlayerDot({
  p, accent, onSelectPlayer, dbId, dbImage,
}: {
  p: PitchPlayer;
  accent: "emerald" | "cyan";
  onSelectPlayer?: (id: string) => void;
  dbId?: string;
  dbImage?: string;
}) {
  const isClickable = !!dbId && !!onSelectPlayer;
  const border = accent === "emerald" ? "border-emerald-300" : "border-cyan-300";
  const bg = accent === "emerald" ? "bg-emerald-600" : "bg-cyan-600";

  const hasEvents = !!(p.goals || p.assists || p.yellowCard || p.redCard || p.substituted || p.isCaptain);
  const subMin = formatMinute(p.subMinute);

  return (
    <div
      className={`relative -translate-x-1/2 flex flex-col items-center ${isClickable ? "cursor-pointer group" : ""}`}
      onClick={isClickable ? () => onSelectPlayer!(dbId) : undefined}
    >
      {/* Player circle */}
      <div className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center
        font-mono text-[9px] sm:text-[10px] font-black shadow-lg transition-all duration-150
        ${bg} ${border} text-white shadow-black/40
        ${isClickable ? "group-hover:scale-110 group-hover:brightness-110 group-hover:shadow-xl" : "opacity-90"}
      `}>
        {dbImage ? (
          <PlayerAvatar image={dbImage} accent={accent} />
        ) : (
          <span className="relative z-10">{p.number || "?"}</span>
        )}
      </div>

      {/* Name */}
      <div className="whitespace-nowrap pointer-events-none mt-0.5">
        <span className={`text-[7px] sm:text-[8px] font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)] leading-none ${isClickable ? "text-white" : "text-slate-300/80"}`}>
          {p.name}
        </span>
      </div>

      {/* Event container — below name, independent layer */}
      {hasEvents && (
        <div className="flex flex-col items-center gap-px mt-0.5 pointer-events-none">
          {/* Goals */}
          {p.goals ? (
            <div className="flex items-center gap-px">
              {Array.from({ length: Math.min(p.goals, 5) }).map((_, i) => (
                <GoalIcon key={`g${i}`} />
              ))}
              {p.goals > 5 && <span className="text-[7px] font-black text-amber-400">+{p.goals - 5}</span>}
            </div>
          ) : null}

          {/* Assists */}
          {p.assists ? (
            <div className="flex items-center gap-px">
              {Array.from({ length: Math.min(p.assists, 5) }).map((_, i) => (
                <AssistIcon key={`a${i}`} />
              ))}
              {p.assists > 5 && <span className="text-[7px] font-black text-sky-400">+{p.assists - 5}</span>}
            </div>
          ) : null}

          {/* Yellow card */}
          {p.yellowCard ? <YellowCardIcon /> : null}

          {/* Red card */}
          {p.redCard ? <RedCardIcon /> : null}

          {/* Captain */}
          {p.isCaptain ? <CaptainIcon /> : null}

          {/* Substitution + minute */}
          {p.substituted ? (
            <div className="flex items-center gap-0.5">
              <SubIcon />
              {subMin && (
                <span className="text-[7px] sm:text-[8px] font-mono font-black text-violet-400 leading-none">{subMin}</span>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */

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

      {/* Pitch */}
      <div className="relative" style={{ minHeight: 520 }}>
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-green-900/30 via-green-800/20 to-green-900/30" />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="absolute left-0 right-0" style={{
              top: `${i * 10}%`, height: "10%",
              background: i % 2 === 0 ? "rgba(34,197,94,0.03)" : "transparent",
            }} />
          ))}
          <svg className="absolute inset-0 w-full h-full opacity-[0.12]" viewBox="0 0 100 100" preserveAspectRatio="none">
            <rect x="1" y="1" width="98" height="98" fill="none" stroke="white" strokeWidth="0.3" />
            <line x1="50" y1="1" x2="50" y2="99" stroke="white" strokeWidth="0.25" />
            <circle cx="50" cy="50" r="8" fill="none" stroke="white" strokeWidth="0.2" />
            <circle cx="50" cy="50" r="0.5" fill="white" />
            <rect x="1" y="30" width="12" height="40" fill="none" stroke="white" strokeWidth="0.15" />
            <rect x="1" y="37" width="5" height="26" fill="none" stroke="white" strokeWidth="0.15" />
            <circle cx="9" cy="50" r="0.4" fill="white" />
            <rect x="87" y="30" width="12" height="40" fill="none" stroke="white" strokeWidth="0.15" />
            <rect x="94" y="37" width="5" height="26" fill="none" stroke="white" strokeWidth="0.15" />
            <circle cx="91" cy="50" r="0.4" fill="white" />
            <path d="M 1 3 A 2 2 0 0 1 3 1" fill="none" stroke="white" strokeWidth="0.15" />
            <path d="M 97 1 A 2 2 0 0 1 99 3" fill="none" stroke="white" strokeWidth="0.15" />
            <path d="M 1 97 A 2 2 0 0 0 3 99" fill="none" stroke="white" strokeWidth="0.15" />
            <path d="M 97 99 A 2 2 0 0 0 99 97" fill="none" stroke="white" strokeWidth="0.15" />
          </svg>
        </div>

        {/* Team labels */}
        <div className="absolute z-20 px-3 py-1 rounded-md text-[9px] sm:text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
          style={{ left: "2%", top: 6 }}>
          {awayName}
          {awayFormation && <span className="font-mono opacity-70 ml-1">{awayFormation}</span>}
        </div>
        <div className="absolute z-20 px-3 py-1 rounded-md text-[9px] sm:text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          style={{ right: "2%", top: 6 }}>
          {homeName}
          {homeFormation && <span className="font-mono opacity-70 ml-1">{homeFormation}</span>}
        </div>

        {/* Players */}
        {awayPositions.map(({ player, x, y }, i) => {
          const db = findDbPlayer(player, players);
          const dbId = db ? String(db.id) : undefined;
          const dbImage = db?.image;
          return (
            <div key={`away-${player.name}-${player.number || i}`}
              style={{ position: "absolute", left: `${x}%`, top: `${y}%`, zIndex: 10 }}>
              <PlayerDot p={player} accent="cyan" onSelectPlayer={onSelectPlayer} dbId={dbId} dbImage={dbImage} />
            </div>
          );
        })}
        {homePositions.map(({ player, x, y }, i) => {
          const db = findDbPlayer(player, players);
          const dbId = db ? String(db.id) : undefined;
          const dbImage = db?.image;
          return (
            <div key={`home-${player.name}-${player.number || i}`}
              style={{ position: "absolute", left: `${x}%`, top: `${y}%`, zIndex: 10 }}>
              <PlayerDot p={player} accent="emerald" onSelectPlayer={onSelectPlayer} dbId={dbId} dbImage={dbImage} />
            </div>
          );
        })}

        {/* Subs — away (bottom-left) */}
        {awaySubs.length > 0 && (
          <div className="absolute bottom-0 left-0 px-2 py-1.5 border-t border-r border-cyan-500/20 bg-cyan-950/60 z-20"
            style={{ maxWidth: "48%" }}>
            <span className="text-[7px] font-bold text-slate-500 block mb-1">ذخیره‌ها {awayName}</span>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {awaySubs.map((p, i) => {
                const db = findDbPlayer(p, players);
                const clickable = !!db && !!onSelectPlayer;
                const subMin = formatMinute(p.subMinute);
                return (
                  <span key={i} onClick={clickable ? () => onSelectPlayer!(String(db!.id)) : undefined}
                    className={`text-[8px] font-bold inline-flex items-center gap-0.5 text-cyan-400/60 ${clickable ? "hover:text-white cursor-pointer transition" : ""}`}>
                    <span className="font-mono opacity-40">{p.number || ""}</span>
                    <span>{p.name}</span>
                    {p.substituted && (
                      <span className="inline-flex items-center gap-px ml-0.5">
                        <SubIcon />{subMin && <span className="text-[7px] font-mono text-violet-400">{subMin}</span>}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Subs — home (bottom-right) */}
        {homeSubs.length > 0 && (
          <div className="absolute bottom-0 right-0 px-2 py-1.5 border-t border-l border-emerald-500/20 bg-emerald-950/60 z-20"
            style={{ maxWidth: "48%" }}>
            <span className="text-[7px] font-bold text-slate-500 block mb-1">ذخیره‌ها {homeName}</span>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {homeSubs.map((p, i) => {
                const db = findDbPlayer(p, players);
                const clickable = !!db && !!onSelectPlayer;
                const subMin = formatMinute(p.subMinute);
                return (
                  <span key={i} onClick={clickable ? () => onSelectPlayer!(String(db!.id)) : undefined}
                    className={`text-[8px] font-bold inline-flex items-center gap-0.5 text-emerald-400/60 ${clickable ? "hover:text-white cursor-pointer transition" : ""}`}>
                    <span className="font-mono opacity-40">{p.number || ""}</span>
                    <span>{p.name}</span>
                    {p.substituted && (
                      <span className="inline-flex items-center gap-px ml-0.5">
                        <SubIcon />{subMin && <span className="text-[7px] font-mono text-violet-400">{subMin}</span>}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 border-t border-white/5 text-[8px] sm:text-[9px] text-slate-500 font-bold">
        <span className="flex items-center gap-1"><GoalIcon /> <span>گل</span></span>
        <span className="flex items-center gap-1"><AssistIcon /> <span>پاس گل</span></span>
        <span className="flex items-center gap-1"><YellowCardIcon /> <span>کارت زرد</span></span>
        <span className="flex items-center gap-1"><RedCardIcon /> <span>کارت قرمز</span></span>
        <span className="flex items-center gap-1"><SubIcon /> <span>تعویض</span></span>
        <span className="flex items-center gap-1"><CaptainIcon /> <span>کاپیتان</span></span>
      </div>
    </div>
  );
}
