import React, { useState } from "react";
import { normalizePersianString, getSafeImageUrl, toPersianDigits } from "../utils";

/**
 * FormationPitch — Vertical football pitch with formation-aware positioning.
 *
 *   TEAM A (TOP)
 *        GK
 *        ↓
 *       DEF
 *        ↓
 *       MID
 *        ↓
 *       ATT
 *  ═══ CENTER ═══
 *       ATT
 *        ↑
 *       MID
 *        ↑
 *       DEF
 *        ↑
 *        GK
 *   TEAM B (BOTTOM)
 *
 * Y = depth (goal→center), X = width (spread within line)
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

const IC = "w-3 h-3 sm:w-3.5 sm:h-3.5";

/* Football/Soccer ball — clean hexagon pattern */
function GoalIcon() {
  return (
    <svg className={IC} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 2a9.96 9.96 0 0 0-6.93 2.87l4.24 2.45A4.47 4.47 0 0 1 12 7.53a4.47 4.47 0 0 1 2.69-.15l4.24-2.45A9.96 9.96 0 0 0 12 2Z" fill="currentColor" opacity="0.15" />
      <path d="M12 2a9.96 9.96 0 0 0-6.93 2.87l4.24 2.45A4.47 4.47 0 0 1 12 7.53" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 2a9.96 9.96 0 0 1 6.93 2.87l-4.24 2.45A4.47 4.47 0 0 0 12 7.53" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
      <path d="M7.76 7.32L3.81 4.45A10.05 10.05 0 0 0 2 12c0 3.5 1.84 6.57 4.6 8.3L12 22l5.4-1.7A10.05 10.05 0 0 0 22 12c0-2.86-1.12-5.46-2.95-7.38l-3.29 2.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="15" r="2" fill="currentColor" opacity="0.25" />
      <circle cx="16" cy="15" r="2" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

/* Football boot — side view silhouette */
function AssistIcon() {
  return (
    <svg className={IC} viewBox="0 0 24 24" fill="none">
      <path d="M3 18h18v1.5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 19.5V18Z" fill="currentColor" opacity="0.2" />
      <path d="M4.5 15c0 0 .5-2 1.5-3s2.5-2 4-3 3-1.5 4-2 2-.5 3 0 2 1 3 2l2.5 3.5c.3.5.5 1.1.5 1.7V18H3v-1c0-.7.2-1.4.6-2L4.5 15Z" fill="currentColor" opacity="0.15" />
      <path d="M4.5 15c0 0 .5-2 1.5-3s2.5-2 4-3 3-1.5 4-2 2-.5 3 0 2 1 3 2l2.5 3.5c.3.5.5 1.1.5 1.7V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="19.5" x2="6" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="19.5" x2="10" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="19.5" x2="14" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="19.5" x2="18" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="11" r="1.5" fill="currentColor" />
    </svg>
  );
}

/* Yellow card — classic rectangle */
function YellowCardIcon() {
  return (
    <svg className={IC} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="16" height="20" rx="2" fill="#facc15" stroke="#ca8a04" strokeWidth="1.2" />
    </svg>
  );
}

/* Red card — classic rectangle */
function RedCardIcon() {
  return (
    <svg className={IC} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="16" height="20" rx="2" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.2" />
    </svg>
  );
}

/* Substitution — two circular arrows */
function SubIcon() {
  return (
    <svg className={IC} viewBox="0 0 24 24" fill="none">
      <path d="M16.5 3.5a3 3 0 0 0-2.83 2H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 3.5A3 3 0 0 1 19.5 6.5v5a3 3 0 0 1-3 3H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 17.5a3 3 0 0 0 2.83-2H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 17.5a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17,2 19.5,3.5 17,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polyline points="7,19 4.5,20.5 7,22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/* Own goal — ball with X */
function OwnGoalIcon() {
  return (
    <svg className={IC} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#f87171" strokeWidth="1.5" />
      <path d="M8 8l8 8M16 8l-8 8" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* Penalty — ball with target */
function PenaltyIcon() {
  return (
    <svg className={IC} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#facc15" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill="#facc15" />
    </svg>
  );
}

/* Missed penalty — dashed ball with X */
function MissedPenaltyIcon() {
  return (
    <svg className={IC} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#71717a" strokeWidth="1.5" strokeDasharray="3 2" />
      <path d="M8 8l8 8M16 8l-8 8" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* VAR — screen monitor */
function VarIcon() {
  return (
    <svg className="w-5 h-3 sm:w-6 sm:h-3.5" viewBox="0 0 26 18" fill="none">
      <rect x="1" y="1" width="24" height="16" rx="3" fill="#6366f1" stroke="#4f46e5" strokeWidth="1" />
      <text x="13" y="12.5" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="system-ui, sans-serif">VAR</text>
    </svg>
  );
}

/* Captain — "C" badge */
function CaptainIcon() {
  return (
    <svg className={IC} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill="#f59e0b" stroke="#d97706" strokeWidth="1.2" />
      <text x="12" y="16.5" textAnchor="middle" fill="#451a03" fontSize="12" fontWeight="800" fontFamily="system-ui, sans-serif">C</text>
    </svg>
  );
}

/* Injury — medical cross */
function InjuryIcon() {
  return (
    <svg className={IC} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="4" stroke="#ef4444" strokeWidth="1.5" />
      <path d="M12 7v10M7 12h10" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
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

function resolveFormationCounts(formation: string): { def: number; mid: number; fwd: number } {
  const parts = parseFormation(formation);
  if (parts.length === 3) return { def: parts[0], mid: parts[1], fwd: parts[2] };
  if (parts.length === 4) return { def: parts[0], mid: parts[1] + parts[2], fwd: parts[3] };
  if (parts.length === 2) return { def: parts[0], mid: parts[1], fwd: Math.max(0, 10 - parts[0] - parts[1]) };
  return { def: 4, mid: 4, fwd: 2 };
}

function formatMinute(raw: number | string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw);
  if (!s || s === "null") return null;
  return toPersianDigits(s) + "\u200F'";
}

/* ═══════════════════════════════════════════════════════════════
   Formation-Aware Positioning — VERTICAL PITCH

   Y = depth (0% = top goal, 100% = bottom goal)
   X = width (0% = left touchline, 100% = right touchline)

   Top team:    GK → DEF → MID → ATT → center
   Bottom team: center → ATT → MID → DEF → GK
   ═══════════════════════════════════════════════════════════════ */

/** X spread range for each line based on count. Safe margins: 12%–88%. */
function getXRange(line: 0 | 1 | 2 | 3, count: number): { xMin: number; xMax: number } {
  if (line === 0) return { xMin: 50, xMax: 50 }; // GK center
  if (line === 1) {
    if (count >= 5) return { xMin: 12, xMax: 88 };
    if (count === 4) return { xMin: 15, xMax: 85 };
    if (count === 3) return { xMin: 25, xMax: 75 };
    return { xMin: 38, xMax: 62 };
  }
  if (line === 2) {
    if (count >= 5) return { xMin: 10, xMax: 90 };
    if (count === 4) return { xMin: 18, xMax: 82 };
    if (count === 3) return { xMin: 28, xMax: 72 };
    if (count === 2) return { xMin: 38, xMax: 62 };
    return { xMin: 45, xMax: 55 };
  }
  // FWD
  if (count === 1) return { xMin: 50, xMax: 50 };
  if (count === 2) return { xMin: 36, xMax: 64 };   // compact pair
  if (count === 3) return { xMin: 14, xMax: 86 };   // wide trident
  return { xMin: 18, xMax: 82 };
}

function computePositions(
  lineup: PitchPlayer[],
  formation: string,
  isTop: boolean,
): Array<{ player: PitchPlayer; x: number; y: number }> {
  const { def, mid, fwd } = resolveFormationCounts(formation);

  // Y positions — depth axis
  // Top team: GK near top → ATT near center
  // Bottom team: ATT near center → GK near bottom (mirror)
  const yTop: Record<number, number> = { 0: 5, 1: 18, 2: 32, 3: 44 };
  const yBottom: Record<number, number> = { 0: 95, 1: 82, 2: 68, 3: 56 };
  const yMap = isTop ? yTop : yBottom;

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

    const y = yMap[line];
    const { xMin, xMax } = getXRange(line, players.length);
    const xRange = xMax - xMin;

    if (players.length === 1 || xRange === 0) {
      for (const p of players) result.push({ player: p, x: 50, y });
    } else {
      for (let i = 0; i < players.length; i++) {
        const x = xMin + (xRange * i) / (players.length - 1);
        result.push({ player: players[i], x, y });
      }
    }
  }

  return result;
}

/* ═══════════════════════════════════════════════════════════════
   Player Node
   ═══════════════════════════════════════════════════════════════ */

function PlayerAvatar({ image, accent }: { image?: string; accent: "emerald" | "cyan" }) {
  const [err, setErr] = useState(false);
  if (!image || err) return null;
  const b = accent === "emerald" ? "border-emerald-300" : "border-cyan-300";
  return (
    <img loading="lazy" decoding="async" src={getSafeImageUrl(image)} alt=""
      className={`absolute inset-0 w-full h-full rounded-full object-cover border-2 ${b}`}
      referrerPolicy="no-referrer" onError={() => setErr(true)} />
  );
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
  const clickable = !!dbId && !!onSelectPlayer;
  const bdr = accent === "emerald" ? "border-emerald-300" : "border-cyan-300";
  const bg = accent === "emerald" ? "bg-emerald-600" : "bg-cyan-600";
  const subMin = formatMinute(p.subMinute);

  return (
    <div
      className={`relative -translate-x-1/2 flex flex-col items-center ${clickable ? "cursor-pointer group" : ""}`}
      style={{ marginTop: -20 }}
      onClick={clickable ? () => onSelectPlayer!(dbId) : undefined}
    >
      {/* Circle — anchored at center */}
      <div className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center
        font-mono text-[8px] sm:text-[9px] font-black shadow-lg transition-all duration-150 shrink-0
        ${bg} ${bdr} text-white shadow-black/40
        ${clickable ? "group-hover:scale-110 group-hover:brightness-110 group-hover:shadow-xl" : "opacity-90"}
      `}>
        {dbImage ? (
          <PlayerAvatar image={dbImage} accent={accent} />
        ) : (
          <span className="relative z-10">{p.number || "?"}</span>
        )}
      </div>

      {/* Name */}
      <div className="whitespace-nowrap pointer-events-none mt-px">
        <span className={`text-[7px] sm:text-[8px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] leading-none ${clickable ? "text-white" : "text-slate-300/80"}`}>
          {p.name}
        </span>
      </div>

      {/* Events — compact horizontal row */}
      {((p.goals || p.assists || p.yellowCard || p.redCard || p.substituted || p.isCaptain) && (
        <div className="flex items-center gap-0.5 mt-px pointer-events-none flex-wrap justify-center" style={{ maxWidth: 80 }}>
          {p.goals ? (
            <div className="flex items-center">
              {Array.from({ length: Math.min(p.goals, 5) }).map((_, i) => <GoalIcon key={`g${i}`} />)}
              {p.goals > 5 && <span className="text-[6px] font-black text-amber-400">+{p.goals - 5}</span>}
            </div>
          ) : null}
          {p.assists ? (
            <div className="flex items-center">
              {Array.from({ length: Math.min(p.assists, 5) }).map((_, i) => <AssistIcon key={`a${i}`} />)}
              {p.assists > 5 && <span className="text-[6px] font-black text-sky-400">+{p.assists - 5}</span>}
            </div>
          ) : null}
          {p.yellowCard ? <YellowCardIcon /> : null}
          {p.redCard ? <RedCardIcon /> : null}
          {p.isCaptain ? <CaptainIcon /> : null}
          {p.substituted && (
            <div className="flex items-center gap-px">
              <SubIcon />
              {subMin && <span className="text-[7px] sm:text-[8px] font-mono font-black text-violet-400 leading-none">{subMin}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component — VERTICAL PITCH
   ═══════════════════════════════════════════════════════════════ */

export default function FormationPitch({
  homeLineup, awayLineup,
  homeSubs = [], awaySubs = [],
  homeFormation, awayFormation,
  homeName, awayName,
  onSelectPlayer, players, onEdit,
}: FormationPitchProps) {
  // Away = top team, Home = bottom team
  const awayPositions = computePositions(awayLineup, awayFormation || "4-4-2", true);
  const homePositions = computePositions(homeLineup, homeFormation || "4-4-2", false);

  return (
    <div className="rounded-2xl bg-[#141418] border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-gradient-to-b from-cyan-500/5 via-transparent to-emerald-500/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-white">ترکیب دو تیم</span>
          {(homeFormation || awayFormation) && (
            <span className="text-[10px] text-slate-500 font-mono">
              {awayFormation || "?"} — {homeFormation || "?"}
            </span>
          )}
        </div>
        {onEdit && (
          <button onClick={onEdit} className="text-[10px] font-bold text-slate-400 hover:text-white transition px-2 py-1 rounded bg-white/5 hover:bg-white/10">
            ویرایش ترکیب
          </button>
        )}
      </div>

      {/* Vertical Pitch */}
      <div className="relative w-full" style={{ paddingBottom: "160%" }}>
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-green-700/40 via-green-600/30 to-green-700/40" />
          {/* Mowing stripes — horizontal bands */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="absolute left-0 right-0" style={{
              top: `${(i / 12) * 100}%`, height: `${100 / 12}%`,
              background: i % 2 === 0 ? "rgba(34,197,94,0.06)" : "transparent",
            }} />
          ))}
          {/* Pitch markings — VERTICAL orientation */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.18]" viewBox="0 0 100 160" preserveAspectRatio="none">
            {/* Outer boundary */}
            <rect x="2" y="2" width="96" height="156" fill="none" stroke="white" strokeWidth="0.3" />
            {/* Center line — HORIZONTAL */}
            <line x1="2" y1="80" x2="98" y2="80" stroke="white" strokeWidth="0.25" />
            {/* Center circle */}
            <ellipse cx="50" cy="80" rx="10" ry="8" fill="none" stroke="white" strokeWidth="0.2" />
            <circle cx="50" cy="80" r="0.5" fill="white" />
            {/* Top penalty area */}
            <rect x="25" y="2" width="50" height="18" fill="none" stroke="white" strokeWidth="0.15" />
            <rect x="35" y="2" width="30" height="8" fill="none" stroke="white" strokeWidth="0.15" />
            <circle cx="50" cy="12" r="0.4" fill="white" />
            {/* Bottom penalty area */}
            <rect x="25" y="140" width="50" height="18" fill="none" stroke="white" strokeWidth="0.15" />
            <rect x="35" y="150" width="30" height="8" fill="none" stroke="white" strokeWidth="0.15" />
            <circle cx="50" cy="148" r="0.4" fill="white" />
            {/* Corner arcs */}
            <path d="M 2 5 A 3 3 0 0 1 5 2" fill="none" stroke="white" strokeWidth="0.15" />
            <path d="M 95 2 A 3 3 0 0 1 98 5" fill="none" stroke="white" strokeWidth="0.15" />
            <path d="M 2 155 A 3 3 0 0 0 5 158" fill="none" stroke="white" strokeWidth="0.15" />
            <path d="M 95 158 A 3 3 0 0 0 98 155" fill="none" stroke="white" strokeWidth="0.15" />
          </svg>
        </div>

        {/* Team labels — left side, aligned with GK */}
        <div className="absolute z-20 px-3 py-1 rounded-md text-[9px] sm:text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
          style={{ left: "2%", top: "3%" }}>
          {awayName}
          {awayFormation && <span className="font-mono opacity-70 mr-1">{awayFormation}</span>}
        </div>
        <div className="absolute z-20 px-3 py-1 rounded-md text-[9px] sm:text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          style={{ left: "2%", bottom: "3%" }}>
          {homeName}
          {homeFormation && <span className="font-mono opacity-70 mr-1">{homeFormation}</span>}
        </div>

        {/* Players — away (top team, cyan) */}
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

        {/* Players — home (bottom team, emerald) */}
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
      </div>

      {/* Subs — outside pitch, as list */}
      {(awaySubs.length > 0 || homeSubs.length > 0) && (
        <div className="px-4 py-3 border-t border-white/5 space-y-2">
          {awaySubs.length > 0 && (
            <div>
              <span className="text-[9px] font-bold text-cyan-400/70 block mb-1">ذخیره‌ها {awayName}</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {awaySubs.map((p, i) => {
                  const db = findDbPlayer(p, players);
                  const clickable = !!db && !!onSelectPlayer;
                  const subMin = formatMinute(p.subMinute);
                  return (
                    <span key={i} onClick={clickable ? () => onSelectPlayer!(String(db!.id)) : undefined}
                      className={`text-[9px] font-bold inline-flex items-center gap-0.5 text-cyan-400/60 ${clickable ? "hover:text-white cursor-pointer transition" : ""}`}>
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
          {homeSubs.length > 0 && (
            <div>
              <span className="text-[9px] font-bold text-emerald-400/70 block mb-1">ذخیره‌ها {homeName}</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {homeSubs.map((p, i) => {
                  const db = findDbPlayer(p, players);
                  const clickable = !!db && !!onSelectPlayer;
                  const subMin = formatMinute(p.subMinute);
                  return (
                    <span key={i} onClick={clickable ? () => onSelectPlayer!(String(db!.id)) : undefined}
                      className={`text-[9px] font-bold inline-flex items-center gap-0.5 text-emerald-400/60 ${clickable ? "hover:text-white cursor-pointer transition" : ""}`}>
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
      )}

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
