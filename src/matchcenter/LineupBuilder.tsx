import React, { useMemo, useState } from "react";
import { FORMATION_KEYS, getFormationPositions, isFormationKey, defaultFormation, getFormationSlots } from "./formations";
import { formatStatNumber, getSafeImageUrl } from "../utils";
import type { MatchFormationKey } from "../types";

export interface BuilderRosterPlayer {
  id: string;
  name: string;
  position: string;
  teamName?: string;
  image?: string;
}

export interface BuilderValue {
  home: any[];
  away: any[];
  homeSubs: any[];
  awaySubs: any[];
  formationHome?: string;
  formationAway?: string;
}

interface LineupBuilderProps {
  homeName: string;
  awayName: string;
  homeRoster: BuilderRosterPlayer[];
  awayRoster: BuilderRosterPlayer[];
  value: BuilderValue;
  onChange: (v: BuilderValue) => void;
}

type Side = "home" | "away";

interface Placed { id: string; name: string; position: string; image?: string; rating: number | null; captain: boolean; x: number; y: number }

function toPlaced(raw: any, roster: BuilderRosterPlayer[]): Placed | null {
  if (!raw || (!raw.id && !raw.name)) return null;
  const id = String(raw.id || raw.name);
  const live = roster.find(p => String(p.id) === id);
  const rating = typeof raw.rating === "number" ? raw.rating : null;
  return {
    id,
    name: live?.name || raw.name || id,
    position: raw.position || live?.position || "",
    image: live?.image,
    rating,
    captain: raw.captain === true,
    x: typeof raw.x === "number" ? raw.x : -1,
    y: typeof raw.y === "number" ? raw.y : -1,
  };
}

function nearestSlot(slots: { x: number; y: number }[], x: number, y: number, taken: Set<number>): number {
  let best = -1;
  let bestD = Infinity;
  slots.forEach((s, i) => {
    if (taken.has(i)) return;
    const d = (s.x - x) ** 2 + (s.y - y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

export default function LineupBuilder({ homeName, awayName, homeRoster, awayRoster, value, onChange }: LineupBuilderProps) {
  const [formationHome, setFormationHome] = useState<string>(
    isFormationKey(value.formationHome) ? value.formationHome : defaultFormation()
  );
  const [formationAway, setFormationAway] = useState<string>(
    isFormationKey(value.formationAway) ? value.formationAway : defaultFormation()
  );
  const [activeSide, setActiveSide] = useState<Side>("home");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [inspectedId, setInspectedId] = useState<string | null>(null);

  const slotsHome = useMemo(() => getFormationPositions(formationHome, true), [formationHome]);
  const slotsAway = useMemo(() => getFormationPositions(formationAway, false), [formationAway]);

  // Seat current starters onto slots. Priority: stored formation_slot key,
  // then stored x/y (nearest free slot), then free order. This restores the
  // exact saved board on reload.
  const seat = (list: any[], roster: BuilderRosterPlayer[], slots: { x: number; y: number }[], slotKeys: string[]): (Placed | null)[] => {
    const seated: (Placed | null)[] = Array.from({ length: 11 }, () => null);
    const taken = new Set<number>();
    type Seatable = Placed & { slotKey?: string };
    const pool: Seatable[] = [];
    for (const r of list) {
      const p = toPlaced(r, roster);
      if (!p) continue;
      const sk = typeof r?.formation_slot === "string" ? (r.formation_slot as string) : undefined;
      pool.push({ ...p, slotKey: sk });
      if (pool.length >= 11) break;
    }
    const byKey = pool.filter(p => p.slotKey && slotKeys.includes(p.slotKey));
    const rest = pool.filter(p => !(p.slotKey && slotKeys.includes(p.slotKey)));
    for (const p of byKey) {
      const idx = slotKeys.indexOf(p.slotKey as string);
      if (!taken.has(idx)) {
        taken.add(idx);
        seated[idx] = { ...p, x: slots[idx].x, y: slots[idx].y };
      } else {
        rest.push(p);
      }
    }
    const withCoords = rest.filter(p => p.x >= 0 && p.y >= 0);
    const withoutCoords = rest.filter(p => !(p.x >= 0 && p.y >= 0));
    for (const p of [...withCoords, ...withoutCoords]) {
      let idx: number;
      if (p.x >= 0 && p.y >= 0) {
        idx = nearestSlot(slots, p.x, p.y, taken);
        if (idx < 0) idx = slots.findIndex((_, i) => !taken.has(i));
      } else {
        idx = slots.findIndex((_, i) => !taken.has(i));
      }
      if (idx < 0) break;
      taken.add(idx);
      seated[idx] = { ...p, x: slots[idx].x, y: slots[idx].y };
    }
    return seated;
  };

  const seatedHome = useMemo(() => seat(value.home || [], homeRoster, slotsHome, getFormationSlots(formationHome)), [value.home, homeRoster, slotsHome, formationHome]);
  const seatedAway = useMemo(() => seat(value.away || [], awayRoster, slotsAway, getFormationSlots(formationAway)), [value.away, awayRoster, slotsAway, formationAway]);
  const subsHome = useMemo(() => (value.homeSubs || []).map(r => toPlaced(r, homeRoster)).filter((p): p is Placed => !!p), [value.homeSubs, homeRoster]);
  const subsAway = useMemo(() => (value.awaySubs || []).map(r => toPlaced(r, awayRoster)).filter((p): p is Placed => !!p), [value.awaySubs, awayRoster]);

  const allPlacedIds = useMemo(() => {
    const s = new Set<string>();
    [...seatedHome, ...seatedAway].forEach(p => { if (p) s.add(p.id); });
    return s;
  }, [seatedHome, seatedAway]);

  const emit = (nh: (Placed | null)[], na: (Placed | null)[], sh: Placed[], sa: Placed[], fh: string, fa: string) => {
    const slotKeysH = getFormationSlots(fh);
    const slotKeysA = getFormationSlots(fa);
    const ser = (p: Placed, role: "starter" | "substitute", slotKey?: string) => ({
      id: p.id, name: p.name, position: p.position, role,
      ...(p.rating !== null ? { rating: p.rating } : {}),
      ...(role === "starter" ? { x: p.x, y: p.y } : {}),
      ...(role === "starter" && slotKey ? { formation_slot: slotKey } : {}),
      ...(p.captain ? { captain: true } : {}),
    });
    const serStarters = (arr: (Placed | null)[], keys: string[]) => {
      const out: ReturnType<typeof ser>[] = [];
      arr.forEach((p, i) => { if (p) out.push(ser(p, "starter", keys[i])); });
      return out;
    };
    onChange({
      home: serStarters(nh, slotKeysH),
      away: serStarters(na, slotKeysA),
      homeSubs: sh.map(p => ser(p, "substitute")),
      awaySubs: sa.map(p => ser(p, "substitute")),
      formationHome: fh,
      formationAway: fa,
    });
  };

  const findPlaced = (id: string): { side: Side; slot: number } | null => {
    const hi = seatedHome.findIndex(p => p?.id === id);
    if (hi >= 0) return { side: "home", slot: hi };
    const ai = seatedAway.findIndex(p => p?.id === id);
    if (ai >= 0) return { side: "away", slot: ai };
    return null;
  };

  const placeOnSlot = (side: Side, slot: number, explicitId?: string) => {
    const pid = explicitId ?? pendingId;
    if (!pid) return;
    const slots = side === "home" ? [...seatedHome] : [...seatedAway];
    const coords = side === "home" ? slotsHome : slotsAway;
    const occupant = slots[slot];
    const existing = findPlaced(pid);
    // tap own slot = cancel selection
    if (existing && existing.side === side && existing.slot === slot) { setPendingId(null); return; }
    // cross-side moves are rejected: a player belongs to one team
    if (existing && existing.side !== side) {
      alert("این بازیکن در ترکیب تیم مقابل است و نمی‌تواند به این تیم منتقل شود.");
      setPendingId(null);
      return;
    }

    const pool: Placed[] = [
      ...seatedHome.filter((p): p is Placed => !!p),
      ...seatedAway.filter((p): p is Placed => !!p),
      ...subsHome, ...subsAway,
    ];
    const roster = side === "home" ? homeRoster : awayRoster;
    const live = roster.find(p => String(p.id) === pid);
    const moving = pool.find(p => p.id === pid) ?? (live ? {
      id: String(live.id), name: live.name, position: live.position || "",
      image: live.image, rating: null as number | null, captain: false,
    } : null);
    if (!moving) { setPendingId(null); return; }

    if (existing) {
      // Same-side move/swap (cross-side was rejected above, so
      // existing.side === side here): clear origin, place target,
      // re-snapping both to their slot coords. No duplicates possible.
      slots[existing.slot] = null;
      if (occupant) {
        slots[existing.slot] = { ...occupant, x: coords[existing.slot].x, y: coords[existing.slot].y };
      }
      slots[slot] = { ...moving, x: coords[slot].x, y: coords[slot].y };
      if (side === "home") emit(slots, [...seatedAway], subsHome.filter(p => p.id !== pid), subsAway.filter(p => p.id !== pid), formationHome, formationAway);
      else emit([...seatedHome], slots, subsHome.filter(p => p.id !== pid), subsAway.filter(p => p.id !== pid), formationHome, formationAway);
      setPendingId(null);
      setInspectedId(pid);
      return;
    }
    // fresh placement from roster/bench
    slots[slot] = { ...moving, x: coords[slot].x, y: coords[slot].y };
    let nhSubs = [...subsHome].filter(p => p.id !== pid);
    let naSubs = [...subsAway].filter(p => p.id !== pid);
    if (occupant) {
      // displaced starter goes to ITS OWN side bench
      if (side === "home") nhSubs = [...nhSubs, { ...occupant, x: -1, y: -1 }];
      else naSubs = [...naSubs, { ...occupant, x: -1, y: -1 }];
    }
    if (side === "home") emit(slots, [...seatedAway], nhSubs, naSubs, formationHome, formationAway);
    else emit([...seatedHome], slots, nhSubs, naSubs, formationHome, formationAway);
    setPendingId(null);
    setInspectedId(pid);
  };

  const removeToBench = (side: Side, slot: number) => {
    const slots = side === "home" ? [...seatedHome] : [...seatedAway];
    const other = side === "home" ? [...seatedAway] : [...seatedHome];
    const p = slots[slot];
    if (!p) return;
    slots[slot] = null;
    const entry = { ...p, x: -1, y: -1 };
    if (side === "home") emit(slots, other, [...subsHome, entry], subsAway, formationHome, formationAway);
    else emit(other, slots, subsHome, [...subsAway, entry], formationHome, formationAway);
    setInspectedId(null);
  };

  const setRating = (side: Side, slot: number, v: string) => {
    const num = v.trim() === "" ? null : Math.min(10, Math.max(1, parseFloat(v)));
    const slots = side === "home" ? [...seatedHome] : [...seatedAway];
    const other = side === "home" ? [...seatedAway] : [...seatedHome];
    const p = slots[slot];
    if (!p) return;
    slots[slot] = { ...p, rating: num !== null && !isNaN(num) ? Math.round(num * 10) / 10 : null };
    if (side === "home") emit(slots, other, subsHome, subsAway, formationHome, formationAway);
    else emit(other, slots, subsHome, subsAway, formationHome, formationAway);
  };

  const toggleCaptain = (side: Side, slot: number) => {
    const slots = (side === "home" ? [...seatedHome] : [...seatedAway]).map((p, i) => {
      if (!p) return p;
      if (i === slot) return { ...p, captain: !p.captain };
      return { ...p, captain: false };
    });
    const other = side === "home" ? [...seatedAway] : [...seatedHome];
    if (side === "home") emit(slots, other, subsHome, subsAway, formationHome, formationAway);
    else emit(other, slots, subsHome, subsAway, formationHome, formationAway);
  };

  const changeFormation = (side: Side, f: string) => {
    if (!isFormationKey(f)) return;
    // Re-seat existing starters in order onto the new shape; coords update on emit.
    const nh = side === "home" ? reseat(seatedHome, f, true) : [...seatedHome];
    const na = side === "away" ? reseat(seatedAway, f, false) : [...seatedAway];
    const fh = side === "home" ? f : formationHome;
    const fa = side === "away" ? f : formationAway;
    if (side === "home") setFormationHome(f as MatchFormationKey);
    else setFormationAway(f as MatchFormationKey);
    const coordsH = getFormationPositions(fh, true);
    const coordsA = getFormationPositions(fa, false);
    const snap = (arr: (Placed | null)[], c: { x: number; y: number }[]) => arr.map((p, i) => (p ? { ...p, x: c[i]?.x ?? 50, y: c[i]?.y ?? 50 } : p));
    emit(snap(nh, coordsH), snap(na, coordsA), subsHome, subsAway, fh, fa);
  };

  const reseat = (arr: (Placed | null)[], _f: string, _home: boolean): (Placed | null)[] => arr.slice(0, 11);

  const inspected = inspectedId ? findPlaced(inspectedId) : null;
  const inspectedPlayer = inspected
    ? (inspected.side === "home" ? seatedHome : seatedAway)[inspected.slot]
    : null;

  // Live validation (§8.3): 11 starters, one player per slot, no cross-side
  // duplicates, a goalkeeper on slot 0. Slots are fixed at 11 by
  // construction, so counts above 11 are impossible; warnings cover the rest.
  const validation = useMemo(() => {
    const warns: string[] = [];
    const hc = seatedHome.filter(Boolean).length;
    const ac = seatedAway.filter(Boolean).length;
    if (hc !== 11) warns.push(`${homeName}: ${formatStatNumber(hc)} بازیکن اصلی (باید ۱۱ باشد)`);
    if (ac !== 11) warns.push(`${awayName}: ${formatStatNumber(ac)} بازیکن اصلی (باید ۱۱ باشد)`);
    const seen = new Map<string, string>();
    [...seatedHome.map((p, i) => ({ p, side: "home", i })), ...seatedAway.map((p, i) => ({ p, side: "away", i }))]
      .forEach(({ p, side, i }) => {
        if (!p) return;
        const prev = seen.get(p.id);
        if (prev) warns.push(`بازیکن تکراری: ${p.name} در دو جایگاه (${prev} و ${side === "home" ? homeName : awayName})`);
        else seen.set(p.id, `${side === "home" ? homeName : awayName} #${i + 1}`);
      });
    const gkH = seatedHome[0];
    const gkA = seatedAway[0];
    if (gkH && !gkH.position.includes("دروازه")) warns.push(`${homeName}: جایگاه دروازه‌بان با پست «${gkH.position || "نامشخص"}» پر شده است`);
    if (gkA && !gkA.position.includes("دروازه")) warns.push(`${awayName}: جایگاه دروازه‌بان با پست «${gkA.position || "نامشخص"}» پر شده است`);
    return warns;
  }, [seatedHome, seatedAway, homeName, awayName]);

  const renderSquad = (side: Side) => {
    const roster = side === "home" ? homeRoster : awayRoster;
    const name = side === "home" ? homeName : awayName;
    const accent = side === "home" ? "emerald" : "cyan";
    const placed = side === "home" ? seatedHome : seatedAway;
    const filled = placed.filter(Boolean).length;
    return (
      <div className="rounded-2xl bg-[#0b0b0f] border border-white/5 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-black ${accent === "emerald" ? "text-emerald-400" : "text-cyan-400"}`}>
            {name} ({formatStatNumber(filled)}/11)
          </span>
          <select
            value={side === "home" ? formationHome : formationAway}
            onChange={e => changeFormation(side, e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white font-mono"
            dir="ltr"
          >
            {FORMATION_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
          {roster.map(p => {
            const pid = String(p.id);
            const isPlaced = allPlacedIds.has(pid);
            const isPending = pendingId === pid;
            return (
              <button
                key={pid}
                type="button"
                onClick={() => {
                  if (isPlaced) {
                    const loc = findPlaced(pid);
                    if (loc) setInspectedId(pid);
                    setPendingId(null);
                  } else {
                    setPendingId(isPending ? null : pid);
                    setInspectedId(null);
                  }
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-right transition min-h-[44px] ${
                  isPending ? "border-amber-400 bg-amber-500/10" : isPlaced ? "border-white/5 bg-white/[0.02] opacity-60" : "border-white/5 bg-black/30 hover:border-white/15"
                }`}
              >
                {p.image ? (
                  <img src={getSafeImageUrl(p.image)} alt={p.name} loading="lazy" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover bg-slate-800 shrink-0" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-slate-700 text-white text-[11px] font-black flex items-center justify-center shrink-0">{p.name.trim().charAt(0)}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold text-white truncate">{p.name}</span>
                  <span className="block text-[9px] text-slate-500">{p.position || "بازیکن"}</span>
                </span>
                {isPlaced && <span className="text-[9px] font-bold text-emerald-400 shrink-0">در زمین</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSlot = (side: Side, idx: number) => {
    const slots = side === "home" ? seatedHome : seatedAway;
    const coords = side === "home" ? slotsHome : slotsAway;
    const p = slots[idx];
    const c = coords[idx] || { x: 50, y: 50 };
    const isInspected = inspected?.side === side && inspected.slot === idx;
    return (
      <div key={`${side}-${idx}`} className="absolute" style={{ left: `${c.x}%`, top: `${c.y}%`, transform: "translate(-50%,-50%)" }}>
        {p ? (
          <button
            type="button"
            draggable
            onDragStart={e => { e.dataTransfer.setData("text/mc-player", JSON.stringify({ id: p.id, side })); }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              try {
                const d = JSON.parse(e.dataTransfer.getData("text/mc-player"));
                if (d?.id) { setPendingId(String(d.id)); setTimeout(() => placeOnSlot(side, idx), 0); }
              } catch { /* ignore */ }
            }}
            onClick={() => {
              if (pendingId) placeOnSlot(side, idx);
              else { setPendingId(p.id); setInspectedId(p.id); }
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer rounded-xl p-1 transition ${isInspected ? "ring-2 ring-amber-400 bg-amber-500/10" : "hover:bg-white/5"}`}
            title={p.name}
          >
            <span className="relative inline-flex">
              {p.image ? (
                <img src={getSafeImageUrl(p.image)} alt={p.name} loading="lazy" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border-2 border-white/25 bg-slate-800" />
              ) : (
                <span className="w-10 h-10 rounded-full border-2 border-white/25 bg-slate-700 text-white text-xs font-black flex items-center justify-center">{p.name.trim().charAt(0)}</span>
              )}
              {p.captain && <span className="absolute -left-1 -bottom-1 w-4 h-4 rounded-full bg-fuchsia-500 text-slate-950 text-[9px] font-black flex items-center justify-center border border-white/60">C</span>}
              {p.rating != null && (
                <span className="absolute -top-2 -right-2 text-[9px] font-black font-mono px-1 rounded bg-black/80 border border-white/20 text-amber-300">{formatStatNumber(p.rating.toFixed(1))}</span>
              )}
            </span>
            <span className="max-w-[80px] truncate text-[9px] font-bold text-white bg-black/55 rounded px-1">{p.name}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { if (pendingId) placeOnSlot(side, idx); }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              try {
                const d = JSON.parse(e.dataTransfer.getData("text/mc-player"));
                if (d?.id) { setPendingId(String(d.id)); setTimeout(() => placeOnSlot(side, idx), 0); }
              } catch { /* ignore */ }
            }}
            className={`w-11 h-11 rounded-full border-2 border-dashed flex items-center justify-center text-[10px] font-black transition min-w-[44px] min-h-[44px] ${
              pendingId ? "border-amber-400 text-amber-300 bg-amber-500/10 animate-pulse" : "border-white/20 text-slate-500 hover:border-white/40"
            }`}
            title="جایگاه خالی — اول بازیکن را انتخاب کنید"
          >
            +
          </button>
        )}
      </div>
    );
  };

  const benchOf = (side: Side) => (side === "home" ? subsHome : subsAway);

  const updateRating = (side: Side, slot: number, v: string) => {
    const num = v.trim() === "" ? null : Math.min(10, Math.max(1, parseFloat(v)));
    const s = side === "home" ? [...seatedHome] : [...seatedAway];
    const o = side === "home" ? [...seatedAway] : [...seatedHome];
    const p = s[slot];
    if (!p) return;
    s[slot] = { ...p, rating: num !== null && !isNaN(num) ? Math.round(num * 10) / 10 : null };
    if (side === "home") emit(s, o, subsHome, subsAway, formationHome, formationAway);
    else emit(o, s, subsHome, subsAway, formationHome, formationAway);
  };

  const toggleCaptainBtn = (side: Side, slot: number) => {
    const s = (side === "home" ? [...seatedHome] : [...seatedAway]).map((pl, i) => {
      if (!pl) return pl;
      if (i === slot) return { ...pl, captain: !pl.captain };
      return { ...pl, captain: false };
    });
    const o = side === "home" ? [...seatedAway] : [...seatedHome];
    if (side === "home") emit(s, o, subsHome, subsAway, formationHome, formationAway);
    else emit(o, s, subsHome, subsAway, formationHome, formationAway);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 md:hidden">
        {(["home", "away"] as Side[]).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSide(s)}
            className={`flex-1 py-2 rounded-xl text-xs font-black border transition min-h-[44px] ${activeSide === s ? "bg-emerald-500 text-black border-emerald-500" : "bg-white/5 text-slate-300 border-white/10"}`}
          >
            {s === "home" ? homeName : awayName}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-3 hidden md:block">{renderSquad("home")}</div>
        <div className="md:col-span-6">
          <div className="w-full overflow-x-auto pb-2">
            <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-700/60 mx-auto pitch-stripes" style={{ width: "100%", minWidth: 640, height: 460 }}>
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
              </svg>
              {Array.from({ length: 11 }, (_, i) => renderSlot("home", i))}
              {Array.from({ length: 11 }, (_, i) => renderSlot("away", i))}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-1">بازیکن را از لیست انتخاب کنید، بعد روی جایگاه زمین بزنید (در دسکتاپ: درگ کنید)</p>
          {validation.length > 0 && (
            <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 space-y-1" role="alert">
              {validation.map((w, i) => (
                <p key={i} className="text-[10px] font-bold text-amber-300">⚠ {w}</p>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-3 hidden md:block">{renderSquad("away")}</div>
        <div className="md:hidden">{renderSquad(activeSide)}</div>
      </div>

      {inspected && inspectedPlayer && (
        <div className="rounded-2xl bg-[#0b0b0f] border border-amber-500/30 p-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-white">{inspectedPlayer.name}</span>
          <label className="flex items-center gap-1 text-[11px] text-slate-300">
            نمره
            <input
              type="number" min={1} max={10} step={0.1}
              value={inspectedPlayer.rating ?? ""}
              onChange={e => {
                updateRating(inspected.side, inspected.slot, e.target.value);
              }}
              className="w-16 bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white font-mono"
              dir="ltr"
            />
          </label>
          <button type="button" onClick={() => toggleCaptainBtn(inspected.side, inspected.slot)} className={`px-3 py-1.5 rounded-lg text-[11px] font-black border transition min-h-[40px] ${inspectedPlayer.captain ? "bg-fuchsia-500 text-black border-fuchsia-500" : "bg-white/5 text-slate-300 border-white/10"}`}>
            {inspectedPlayer.captain ? "کاپیتان ✓" : "کاپیتان"}
          </button>
          <button type="button" onClick={() => { removeToBench(inspected.side, inspected.slot); }} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 text-slate-300 border border-white/10 min-h-[40px]">
            انتقال به نیمکت
          </button>
          <button type="button" onClick={() => setInspectedId(null)} className="px-3 py-1.5 rounded-lg text-[11px] text-slate-500 min-h-[40px]">بستن</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(["home", "away"] as Side[]).map(side => (
          <div key={side} className="rounded-2xl bg-[#141418] border border-white/5 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/5 text-xs font-black text-slate-300">
              نیمکت {side === "home" ? homeName : awayName} ({formatStatNumber(benchOf(side).length)})
            </div>
            <div className="divide-y divide-white/[0.04] max-h-[220px] overflow-y-auto">
              {benchOf(side).length > 0 ? benchOf(side).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPendingId(pendingId === p.id ? null : p.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-right transition min-h-[44px] ${pendingId === p.id ? "bg-amber-500/10" : "hover:bg-white/[0.04]"}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-white truncate">{p.name}</span>
                    <span className="block text-[10px] text-slate-500">{p.position || "بازیکن"}</span>
                  </span>
                </button>
              )) : <p className="px-4 py-3 text-[11px] text-slate-500">نیمکت خالی است.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
