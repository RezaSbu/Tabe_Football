import React from "react";
import { getFormationPositions, isFormationKey, defaultFormation } from "./formations";
import { EventIcon, MvpStarIcon, ratingColor } from "./EventIcon";
import { formatStatNumber, getSafeImageUrl } from "../utils";
import TeamLogo from "../components/TeamLogo";
import type { MatchFormationKey } from "../types";

export interface PitchPlayer {
  id: string;
  name: string;
  position: string;
  rating?: number | null;
  image?: string;
  captain?: boolean;
  x?: number;
  y?: number;
  events: { type: string; minute?: string; player2Name?: string; role?: "goal" | "assist" | "sub-out" | "sub-in" | "other" }[];
  subInMinute?: string;
  isMvp?: boolean;
}

export interface PitchCoach {
  id: string;
  name: string;
  side: "home" | "away";
  image?: string;
}

interface MatchPitchProps {
  home: PitchPlayer[];
  away: PitchPlayer[];
  homeSubs: PitchPlayer[];
  awaySubs: PitchPlayer[];
  homeName: string;
  awayName: string;
  homeLogo?: string;
  awayLogo?: string;
  formationHome?: string;
  formationAway?: string;
  onSelectPlayer?: (playerId: string) => void;
  coaches?: PitchCoach[];
  onSelectCoach?: (coachId: string) => void;
}

// Infer a formation key from coarse Persian position buckets when the
// admin has not stored one explicitly. Falls back to 4-4-2.
export function inferFormation(players: { position: string }[]): MatchFormationKey {
  const norm = (p: string) => p || "";
  const df = players.filter(p => norm(p.position).includes("مدافع")).length;
  const mf = players.filter(p => norm(p.position).includes("هافبک") || norm(p.position).includes("وینگر")).length;
  const fw = players.filter(p => norm(p.position).includes("مهاجم")).length;
  if (df + mf + fw >= 9) {
    const key = `${df}-${mf}-${fw}`;
    if (isFormationKey(key)) return key;
  }
  return defaultFormation();
}

function NodeAvatar({ p, size = 44 }: { p: PitchPlayer; size?: number }) {
  if (p.image) {
    return (
      <img
        src={getSafeImageUrl(p.image)}
        alt={p.name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
        className="rounded-full object-cover border-2 border-white/25 bg-slate-800"
      />
    );
  }
  const initial = (p.name || "?").trim().charAt(0);
  return (
    <span
      style={{ width: size, height: size }}
      className="rounded-full border-2 border-white/25 bg-slate-700 text-white font-black flex items-center justify-center text-sm shrink-0"
    >
      {initial}
    </span>
  );
}

function PlayerNode({ p, onSelect }: { p: PitchPlayer; onSelect?: (id: string) => void }) {
  // Role-aware counting: a goal event where this player is the assister
  // (player2) counts as an assist, never as a goal. Falls back to legacy
  // type-only logic when no role was attached.
  const isGoal = (e: PitchPlayer["events"][number]) =>
    e.role ? e.role === "goal" : (e.type === "goal" || e.type === "penalty");
  const isAssist = (e: PitchPlayer["events"][number]) =>
    e.role ? e.role === "assist" : e.type === "assist";
  const goals = p.events.filter(isGoal).length;
  const assists = p.events.filter(isAssist).length;
  const subOut = p.events.find(e => (e.role ? e.role === "sub-out" : e.type === "substitution"));
  const subIn = p.events.find(e => e.role === "sub-in");
  const yellow = p.events.some(e => e.type === "yellow-card");
  const red = p.events.some(e => e.type === "red-card");
  const rating = typeof p.rating === "number" ? p.rating : null;
  return (
    <button
      type="button"
      onClick={() => onSelect && p.id && onSelect(p.id)}
      className="mc-node absolute flex flex-col items-center gap-0.5 cursor-pointer group"
      style={{ left: `${p.x ?? 50}%`, top: `${p.y ?? 50}%`, transform: "translate(-50%, -50%)" }}
      title={p.name}
    >
      <span className="relative inline-flex">
        <NodeAvatar p={p} />
        {p.captain && (
          <span className="absolute -left-1 -bottom-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center border border-slate-950" title="کاپیتان">C</span>
        )}
        {rating != null ? (
          <span className={`absolute -top-2 -right-2 inline-flex items-center gap-0.5 text-[9px] font-black font-mono px-1 rounded border ${ratingColor(rating)}`}>
            {p.isMvp && <MvpStarIcon size={10} />}
            {formatStatNumber(rating.toFixed(1))}
          </span>
        ) : p.isMvp ? (
          <span className="absolute -top-2 -right-2"><MvpStarIcon size={14} /></span>
        ) : null}
      </span>
      <span className="flex items-center gap-0.5">
        {goals > 0 && <span className="inline-flex items-center gap-0.5"><EventIcon type="goal" size={13} />{goals > 1 && <span className="text-[9px] font-black text-emerald-400 font-mono">x{formatStatNumber(goals)}</span>}</span>}
        {assists > 0 && <span className="inline-flex items-center gap-0.5"><EventIcon type="assist" size={13} />{assists > 1 && <span className="text-[9px] font-black text-cyan-400 font-mono">x{formatStatNumber(assists)}</span>}</span>}
        {yellow && <EventIcon type="yellow-card" size={12} />}
        {red && <EventIcon type="red-card" size={12} />}
        {subOut && <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/15 border border-rose-500/30 px-1"><span className="text-rose-400 font-black text-[10px] leading-none">↘</span>{subOut.minute && <span className="text-[9px] font-mono text-rose-300">{formatStatNumber(subOut.minute)}'</span>}</span>}
        {subIn && <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 px-1"><span className="text-emerald-400 font-black text-[10px] leading-none">↗</span>{subIn.minute && <span className="text-[9px] font-mono text-emerald-300">{formatStatNumber(subIn.minute)}'</span>}</span>}
      </span>
      <span className="max-w-[92px] truncate text-[10px] font-bold text-white bg-black/55 rounded px-1 group-hover:text-emerald-300 transition">{p.name}</span>
    </button>
  );
}

export default function MatchPitch(props: MatchPitchProps) {
  const { home, away, homeSubs, awaySubs, homeName, awayName, homeLogo, awayLogo, onSelectPlayer, coaches = [], onSelectCoach } = props;

  const formHome = isFormationKey(props.formationHome) ? props.formationHome : inferFormation(home);
  const formAway = isFormationKey(props.formationAway) ? props.formationAway : inferFormation(away);
  const homePos = getFormationPositions(formHome, true);
  const awayPos = getFormationPositions(formAway, false);

  const placedHome = home.slice(0, 11).map((p, i) => ({ ...p, x: p.x ?? homePos[i]?.x ?? 80, y: p.y ?? homePos[i]?.y ?? 50 }));
  const placedAway = away.slice(0, 11).map((p, i) => ({ ...p, x: p.x ?? awayPos[i]?.x ?? 20, y: p.y ?? awayPos[i]?.y ?? 50 }));

  const renderSubRow = (p: PitchPlayer) => {
    const goals = p.events.filter(e => (e.role ? e.role === "goal" : (e.type === "goal" || e.type === "penalty"))).length;
    const assists = p.events.filter(e => (e.role ? e.role === "assist" : e.type === "assist")).length;
    const yellow = p.events.some(e => e.type === "yellow-card");
    const red = p.events.some(e => e.type === "red-card" || e.type === "second-yellow");
    const subOut = p.events.find(e => (e.role ? e.role === "sub-out" : false));
    const subInMinute = p.events.find(e => (e.role ? e.role === "sub-in" : false))?.minute ?? p.subInMinute;
    return (
    <button
      key={String(p.id || p.name)}
      type="button"
      onClick={() => onSelectPlayer && p.id && onSelectPlayer(p.id)}
      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] transition cursor-pointer text-right"
    >
      <NodeAvatar p={p} size={30} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-white truncate">{p.name}</span>
        <span className="block text-[10px] text-slate-500">{p.position || "بازیکن"}</span>
      </span>
      <span className="flex items-center gap-1 shrink-0">
        {goals > 0 && <span className="inline-flex items-center gap-0.5"><EventIcon type="goal" size={13} />{goals > 1 && <span className="text-[9px] font-black text-emerald-400 font-mono">x{formatStatNumber(goals)}</span>}</span>}
        {assists > 0 && <span className="inline-flex items-center gap-0.5"><EventIcon type="assist" size={13} /></span>}
        {yellow && <EventIcon type="yellow-card" size={12} />}
        {red && <EventIcon type="red-card" size={12} />}
        {subOut && <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/15 border border-rose-500/30 px-1" title={`خروج ${formatStatNumber(subOut.minute || "")}'`}><span className="text-rose-400 font-black text-[10px] leading-none">↓</span>{subOut.minute && <span className="text-[9px] font-mono text-rose-300" dir="ltr">{formatStatNumber(subOut.minute)}'</span>}</span>}
        {subInMinute && <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 px-1" title={`ورود ${formatStatNumber(subInMinute)}'`}><span className="text-emerald-400 font-black text-[10px] leading-none">↑</span><span className="text-[9px] font-mono text-emerald-300" dir="ltr">{formatStatNumber(subInMinute)}'</span></span>}
      </span>
      {typeof p.rating === "number" && p.rating > 0 && (
        <span className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded border ${ratingColor(p.rating)}`}>{formatStatNumber(p.rating.toFixed(1))}</span>
      )}
    </button>
    );
  };

  const renderCoachCard = (side: "home" | "away") => {
    const c = coaches.find(k => k.side === side);
    const teamName = side === "home" ? homeName : awayName;
    const cardCls = "w-full flex items-center gap-2.5 rounded-2xl border border-white/5 bg-[#141418] px-4 py-2.5 text-right min-h-[62px]";
    if (!c) {
      return (
        <div key={`coach-${side}-empty`} className={`${cardCls} opacity-60`} aria-hidden="true">
          <span className="w-9 h-9 rounded-full bg-slate-800 border border-white/5 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-600">سرمربی ثبت نشده است</span>
            <span className="block text-[10px] text-slate-600">سرمربی {teamName}</span>
          </span>
        </div>
      );
    }
    return (
      <button
        key={`coach-${side}`}
        type="button"
        onClick={() => onSelectCoach && onSelectCoach(c.id)}
        className={`${cardCls} transition cursor-pointer ${side === "home" ? "hover:border-emerald-500/30" : "hover:border-cyan-500/30"}`}
      >
        {c.image ? (
          <img src={getSafeImageUrl(c.image)} alt={c.name} loading="lazy" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover border border-white/15 bg-slate-800 shrink-0" />
        ) : (
          <span className="w-9 h-9 rounded-full bg-slate-700 text-white text-xs font-black flex items-center justify-center shrink-0">{c.name.trim().charAt(0)}</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-black text-white truncate">{c.name}</span>
          <span className="block text-[10px] text-slate-500">سرمربی {teamName}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/5 bg-black/25 px-4 py-2.5">
        <span className="flex items-center gap-2 min-w-0">
          <TeamLogo logo={homeLogo} fallback="🛡️" size="sm" />
          <span className="text-xs font-black text-white truncate">{homeName}</span>
          <span className="font-mono text-[10px] text-emerald-400/90" dir="ltr">{formHome}</span>
        </span>
        <span className="text-[10px] text-slate-600 font-black shrink-0">ترکیب اصلی</span>
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] text-cyan-400/90" dir="ltr">{formAway}</span>
          <span className="text-xs font-black text-white truncate">{awayName}</span>
          <TeamLogo logo={awayLogo} fallback="⚔️" size="sm" />
        </span>
      </div>

      <div className="w-full overflow-x-auto pb-2">
        <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-700/60 mx-auto pitch-stripes" style={{ width: "100%", minWidth: 720, height: 500 }}>
          <svg className="mc-pitch-markings absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 68" preserveAspectRatio="none" aria-hidden="true">
            <rect x="2" y="2" width="96" height="64" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
            <line x1="50" y1="2" x2="50" y2="66" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
            <circle cx="50" cy="34" r="8" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
            <circle cx="50" cy="34" r="0.6" fill="#ffffff" />
            <rect x="2" y="14" width="16" height="40" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
            <rect x="2" y="23" width="6" height="22" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
            <circle cx="12" cy="34" r="0.6" fill="#ffffff" />
            <path d="M 18 26 A 8 8 0 0 1 18 42" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
            <rect x="0.5" y="28" width="1.5" height="12" fill="rgba(255,255,255,0.2)" stroke="#ffffff" strokeWidth="0.6" />
            <rect x="82" y="14" width="16" height="40" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
            <rect x="92" y="23" width="6" height="22" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
            <circle cx="88" cy="34" r="0.6" fill="#ffffff" />
            <path d="M 82 26 A 8 8 0 0 0 82 42" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
            <rect x="98" y="28" width="1.5" height="12" fill="rgba(255,255,255,0.2)" stroke="#ffffff" strokeWidth="0.6" />
            <path d="M 2 4 A 2 2 0 0 0 4 2" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
            <path d="M 96 2 A 2 2 0 0 0 98 4" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
            <path d="M 2 64 A 2 2 0 0 1 4 66" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
            <path d="M 96 66 A 2 2 0 0 1 98 64" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
          </svg>
          {placedHome.map(p => <PlayerNode key={`h-${p.id || p.name}`} p={p} onSelect={onSelectPlayer} />)}
          {placedAway.map(p => <PlayerNode key={`a-${p.id || p.name}`} p={p} onSelect={onSelectPlayer} />)}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#141418] border border-white/5 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/5 text-xs font-black text-emerald-400 flex items-center justify-between gap-2">
              <span className="truncate">ذخیره‌های {homeName}</span>
              <span className="font-mono text-[10px] text-slate-500 bg-white/5 rounded-full px-2 py-0.5 shrink-0" dir="ltr">{formatStatNumber(homeSubs.length)}</span>
            </div>
            <div className="divide-y divide-white/[0.04] h-[260px] overflow-y-auto scrollbar-thin">
              {homeSubs.length > 0 ? homeSubs.map(p => renderSubRow(p)) : <p className="px-4 py-3 text-[11px] text-slate-500">بازیکن ذخیره‌ای ثبت نشده است.</p>}
            </div>
          </div>
          {renderCoachCard("home")}
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#141418] border border-white/5 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/5 text-xs font-black text-cyan-400 flex items-center justify-between gap-2">
              <span className="truncate">ذخیره‌های {awayName}</span>
              <span className="font-mono text-[10px] text-slate-500 bg-white/5 rounded-full px-2 py-0.5 shrink-0" dir="ltr">{formatStatNumber(awaySubs.length)}</span>
            </div>
            <div className="divide-y divide-white/[0.04] h-[260px] overflow-y-auto scrollbar-thin">
              {awaySubs.length > 0 ? awaySubs.map(p => renderSubRow(p)) : <p className="px-4 py-3 text-[11px] text-slate-500">بازیکن ذخیره‌ای ثبت نشده است.</p>}
            </div>
          </div>
          {renderCoachCard("away")}
        </div>
      </div>
    </div>
  );
}
