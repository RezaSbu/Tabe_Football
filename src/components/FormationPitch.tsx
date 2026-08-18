import React, { useState } from "react";
import { normalizePersianString, getSafeImageUrl, toPersianDigits } from "../utils";

/**
 * FormationPitch — Horizontal football pitch.
 *
 *   TEAM 2 (LEFT)                        TEAM 1 (RIGHT)
 *   GK → DEF → MID → ATT    |    ATT ← MID ← DEF ← GK
 *
 *  X = depth (goal→center), Y = width (spread within line)
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

function assignLines(lineup: PitchPlayer[], formation: string): Map<number, PitchPlayer[]> {
  const parts = parseFormation(formation);
  const limits: Record<number, number> = { 0: 1, 1: 0, 2: 0, 3: 0 };

  if (parts.length === 3) {
    limits[1] = parts[0]; limits[2] = parts[1]; limits[3] = parts[2];
  } else if (parts.length === 2) {
    limits[1] = parts[0]; limits[2] = parts[1];
    limits[3] = Math.max(0, 10 - parts[0] - parts[1]);
  } else if (parts.length === 1) {
    limits[1] = parts[0]; limits[2] = Math.max(0, 10 - parts[0]);
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

function computePositions(
  lineup: PitchPlayer[],
  formation: string,
  isHome: boolean,
): Array<{ player: PitchPlayer; x: number; y: number }> {
  const groups = assignLines(lineup, formation);
  // Shifted further apart: more gap between ATT lines
  const xHome: Record<number, number> = { 0: 92, 1: 76, 2: 63, 3: 55 };
  const xAway: Record<number, number> = { 0: 8, 1: 24, 2: 37, 3: 45 };
  const xMap = isHome ? xHome : xAway;

  const result: Array<{ player: PitchPlayer; x: number; y: number }> = [];
  for (const line of [0, 1, 2, 3]) {
    const players = groups.get(line) || [];
    if (players.length === 0) continue;
    const x = xMap[line];
    const yMin = 12, yMax = 88;
    if (players.length === 1) {
      result.push({ player: players[0], x, y: 50 });
    } else {
      for (let i = 0; i < players.length; i++) {
        const y = yMin + ((yMax - yMin) * i) / (players.length - 1);
        result.push({ player: players[i], x, y });
      }
    }
  }
  return result;
}

/* ─── Football boot SVG icon (Fotmob-style) ─── */
function BootIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15.5c-.3 0-.5-.1-.7-.3l-1.2-1.1c-.2-.2-.5-.3-.8-.3H15v-1h2.8c.5 0 1-.3 1.2-.7l1.5-3c.1-.2.2-.4.2-.6 0-.5-.4-1-1-1H14.5l-1.5 2H9.7L8 9.5C7.8 9.2 7.4 9 7 9H4c-.6 0-1 .4-1 1v4c0 .3.2.5.5.5.1 0 .2 0 .3-.1l1.8-1.8c.2-.2.5-.3.8-.3H8v1H5.5c-.8 0-1.5.7-1.5 1.5S4.7 17 5.5 17h3.3c.5 0 1-.3 1.2-.7l1.8-2.8c.2-.3.5-.5.8-.5h4.4c.8 0 1.5-.7 1.5-1.5 0-.3-.1-.5-.3-.7l-1.8-1.3c-.3-.2-.4-.5-.4-.8V8.5c0-.6.4-1 1-1h2.5c.3 0 .6.2.8.4l1 2c.2.4.3.8.3 1.3v3.3c0 .5-.2 1-.6 1.3-.1.1-.3.2-.5.2z" />
    </svg>
  );
}

/* ─── Player photo badge ─── */
function PlayerAvatar({
  image, accent,
}: { image?: string; accent: "emerald" | "cyan" }) {
  const [imgErr, setImgErr] = useState(false);
  if (!image || imgErr) return null;
  const border = accent === "emerald" ? "border-emerald-300" : "border-cyan-300";
  return (
    <img
      loading="lazy" decoding="async"
      src={getSafeImageUrl(image)}
      alt=""
      className={`absolute inset-0 w-full h-full rounded-full object-cover border-2 ${border}`}
      referrerPolicy="no-referrer"
      onError={() => setImgErr(true)}
    />
  );
}

/* ─── Player dot ─── */
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

  return (
    <div
      className={`relative -translate-x-1/2 -translate-y-1/2 ${isClickable ? "cursor-pointer group" : ""}`}
      onClick={isClickable ? () => onSelectPlayer!(dbId) : undefined}
    >
      {/* Circle — photo or number */}
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

      {/* Name below */}
      <div className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none mt-0.5">
        <span className={`text-[7px] sm:text-[8px] font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)] leading-none ${isClickable ? "text-white" : "text-slate-300/80"}`}>
          {p.name}
        </span>
      </div>

      {/* Goals — ⚽ */}
      {p.goals ? (
        <span className="absolute -top-3 -right-3 flex items-center z-20">
          {Array.from({ length: Math.min(p.goals, 5) }).map((_, i) => (
            <span key={i} className="text-xs leading-none" style={{ marginLeft: i > 0 ? -3 : 0 }}>⚽</span>
          ))}
          {p.goals > 5 && (
            <span className="text-[8px] font-black text-amber-400 ml-0.5">+{p.goals - 5}</span>
          )}
        </span>
      ) : null}

      {/* Assists — football boot SVG */}
      {p.assists ? (
        <span className="absolute -top-3 -left-3 flex items-center gap-px z-20">
          {Array.from({ length: Math.min(p.assists, 5) }).map((_, i) => (
            <span key={i} className="text-sky-400" style={{ marginRight: i > 0 ? -2 : 0 }}>
              <BootIcon className="w-3.5 h-3.5" />
            </span>
          ))}
          {p.assists > 5 && (
            <span className="text-[8px] font-black text-sky-400">+{p.assists - 5}</span>
          )}
        </span>
      ) : null}

      {/* Yellow card */}
      {p.yellowCard ? (
        <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-2 h-3 rounded-[1px] bg-yellow-400 border border-yellow-600 shadow z-20" />
      ) : null}

      {/* Red card */}
      {p.redCard ? (
        <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2 h-3 rounded-[1px] bg-red-500 border border-red-700 shadow z-20" />
      ) : null}

      {/* Substituted — 🔄 + minute */}
      {p.substituted && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-px z-20 whitespace-nowrap">
          <span className="text-[10px] leading-none">🔄</span>
          {p.subMinute != null && (
            <span className="text-[8px] font-mono font-black text-amber-400">{toPersianDigits(String(p.subMinute))}'</span>
          )}
        </span>
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

      {/* Pitch */}
      <div className="relative" style={{ minHeight: 480 }}>
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
                const dbId = db ? String(db.id) : undefined;
                const clickable = !!dbId && !!onSelectPlayer;
                return (
                  <span key={i} onClick={clickable ? () => onSelectPlayer!(dbId) : undefined}
                    className={`text-[8px] font-bold inline-flex items-center gap-0.5 text-cyan-400/60 ${clickable ? "hover:text-white cursor-pointer transition" : ""}`}>
                    <span className="font-mono opacity-40">{p.number || ""}</span>
                    <span>{p.name}</span>
                    {p.substituted && <span className="text-[8px] mr-0.5">🔄</span>}
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
                const dbId = db ? String(db.id) : undefined;
                const clickable = !!dbId && !!onSelectPlayer;
                return (
                  <span key={i} onClick={clickable ? () => onSelectPlayer!(dbId) : undefined}
                    className={`text-[8px] font-bold inline-flex items-center gap-0.5 text-emerald-400/60 ${clickable ? "hover:text-white cursor-pointer transition" : ""}`}>
                    <span className="font-mono opacity-40">{p.number || ""}</span>
                    <span>{p.name}</span>
                    {p.substituted && <span className="text-[8px] mr-0.5">🔄</span>}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-white/5 text-[8px] sm:text-[9px] text-slate-500 font-bold">
        <span className="flex items-center gap-1"><span className="text-xs">⚽</span> گل</span>
        <span className="flex items-center gap-1"><span className="text-sky-400"><BootIcon className="w-3.5 h-3.5" /></span> پاس گل</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-3 rounded-sm bg-yellow-400 border border-yellow-600 inline-block" /> کارت زرد
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-3 rounded-sm bg-red-500 border border-red-700 inline-block" /> کارت قرمز
        </span>
        <span className="flex items-center gap-1"><span className="text-xs">🔄</span> تعویض</span>
      </div>
    </div>
  );
}
