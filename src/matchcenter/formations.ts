import type { MatchFormationKey } from "../types";

export interface PitchCoord { x: number; y: number }

// === SINGLE SOURCE OF TRUTH FOR TEAM SIDES ===
// The UI is RTL: the first DOM column of every grid renders on the physical
// RIGHT. Header scoreboard, timeline cards and subs boxes all render the
// HOME team first, so HOME is physically RIGHT everywhere.
// Convention (physical, RTL/LTR-independent):
//   HOME defends the RIGHT half (x 55..95), AWAY defends LEFT half (x 5..45).
// y is 0..100 top-to-bottom. Away mirrors both axes (symmetric attack).
// Never derive sides from CSS direction; always use these helpers.
export const HOME_PHYSICAL_SIDE = "right" as const;
export const AWAY_PHYSICAL_SIDE = "left" as const;

// Explicit presets for the 7 supported systems, stored in HOME orientation
// (right half). Away = mirror of home.
const PRESETS: Record<MatchFormationKey, { x: number; y: number }[]> = {
  "4-4-2": [
    { x: 94, y: 50 },
    { x: 82, y: 16 }, { x: 85, y: 38 }, { x: 85, y: 62 }, { x: 82, y: 84 },
    { x: 68, y: 14 }, { x: 71, y: 38 }, { x: 71, y: 62 }, { x: 68, y: 86 },
    { x: 58, y: 36 }, { x: 58, y: 64 },
  ],
  "4-3-3": [
    { x: 94, y: 50 },
    { x: 82, y: 16 }, { x: 85, y: 38 }, { x: 85, y: 62 }, { x: 82, y: 84 },
    { x: 70, y: 26 }, { x: 73, y: 50 }, { x: 70, y: 74 },
    { x: 58, y: 18 }, { x: 56, y: 50 }, { x: 58, y: 82 },
  ],
  "4-2-3-1": [
    { x: 94, y: 50 },
    { x: 82, y: 16 }, { x: 85, y: 38 }, { x: 85, y: 62 }, { x: 82, y: 84 },
    { x: 73, y: 36 }, { x: 73, y: 64 },
    { x: 64, y: 16 }, { x: 62, y: 50 }, { x: 64, y: 84 },
    { x: 56, y: 50 },
  ],
  "3-5-2": [
    { x: 94, y: 50 },
    { x: 84, y: 26 }, { x: 87, y: 50 }, { x: 84, y: 74 },
    { x: 72, y: 12 }, { x: 73, y: 36 }, { x: 75, y: 50 }, { x: 73, y: 64 }, { x: 72, y: 88 },
    { x: 58, y: 36 }, { x: 58, y: 64 },
  ],
  "3-4-3": [
    { x: 94, y: 50 },
    { x: 84, y: 26 }, { x: 87, y: 50 }, { x: 84, y: 74 },
    { x: 70, y: 14 }, { x: 72, y: 38 }, { x: 72, y: 62 }, { x: 70, y: 86 },
    { x: 58, y: 18 }, { x: 56, y: 50 }, { x: 58, y: 82 },
  ],
  "5-3-2": [
    { x: 94, y: 50 },
    { x: 83, y: 12 }, { x: 86, y: 31 }, { x: 88, y: 50 }, { x: 86, y: 69 }, { x: 83, y: 88 },
    { x: 71, y: 30 }, { x: 73, y: 50 }, { x: 71, y: 70 },
    { x: 58, y: 36 }, { x: 58, y: 64 },
  ],
  "5-4-1": [
    { x: 94, y: 50 },
    { x: 83, y: 12 }, { x: 86, y: 31 }, { x: 88, y: 50 }, { x: 86, y: 69 }, { x: 83, y: 88 },
    { x: 70, y: 14 }, { x: 72, y: 38 }, { x: 72, y: 62 }, { x: 70, y: 86 },
    { x: 56, y: 50 },
  ],
};

// Semantic slot keys per formation, back-to-front order, aligned 1:1 with PRESETS.
const FORMATION_SLOTS: Record<MatchFormationKey, string[]> = {
  "4-4-2": ["GK", "LB", "LCB", "RCB", "RB", "LM", "LCM", "RCM", "RM", "LS", "RS"],
  "4-3-3": ["GK", "LB", "LCB", "RCB", "RB", "LCM", "CDM", "RCM", "LW", "ST", "RW"],
  "4-2-3-1": ["GK", "LB", "LCB", "RCB", "RB", "LCDM", "RCDM", "LM", "CAM", "RM", "ST"],
  "3-5-2": ["GK", "LCB", "CCB", "RCB", "LWB", "LCM", "CDM", "RCM", "RWB", "LS", "RS"],
  "3-4-3": ["GK", "LCB", "CCB", "RCB", "LM", "LCM", "RCM", "RM", "LW", "ST", "RW"],
  "5-3-2": ["GK", "LWB", "LCB", "CCB", "RCB", "RWB", "LCM", "CM", "RCM", "LS", "RS"],
  "5-4-1": ["GK", "LWB", "LCB", "CCB", "RCB", "RWB", "LM", "LCM", "RCM", "RM", "ST"],
};

export function getFormationSlots(formation: string): string[] {
  if (isFormationKey(formation)) return [...FORMATION_SLOTS[formation]];
  return Array.from({ length: 11 }, (_, i) => (i === 0 ? "GK" : `SLOT_${i}`));
}

export const FORMATION_KEYS: MatchFormationKey[] = ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "3-4-3", "5-3-2", "5-4-1"];

export function isFormationKey(v: unknown): v is MatchFormationKey {
  return typeof v === "string" && (FORMATION_KEYS as string[]).includes(v);
}

// Generic parser for any "N-N-...-N" system summing to 10 outfield players.
// Home occupies x 56..84 ascending toward midfield (right half); away mirrors.
function parseFormation(formation: string, isHome: boolean): PitchCoord[] {
  const parts = formation.split("-").map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n) && n > 0);
  const lines = parts.reduce((a, b) => a + b, 0) === 10 ? parts : [4, 3, 3];
  const yFor = (count: number, lineIndex: number): number[] => {
    const isStriker = lineIndex === lines.length - 1;
    const isDefense = lineIndex === 0;
    if (count === 1) return [50];
    if (count === 2) return [36, 64];
    if (count === 3) return isStriker ? [18, 50, 82] : [26, 50, 74];
    if (count === 4) return [16, 38, 62, 84];
    if (count === 5) return [14, 32, 50, 68, 86];
    const span = 72, pad = 14;
    return Array.from({ length: count }, (_, i) => pad + (count === 1 ? 0 : (i / (count - 1)) * span));
  };
  const out: PitchCoord[] = [{ x: isHome ? 95 : 5, y: 50 }];
  const n = lines.length;
  lines.forEach((count, li) => {
    const homeX = n === 1 ? 70 : 84 - (li * (84 - 56)) / (n - 1);
    for (const y of yFor(count, li)) {
      const rawY = isHome ? y : 100 - y;
      out.push({ x: Math.round((isHome ? homeX : 100 - homeX) * 10) / 10, y: Math.round(rawY * 10) / 10 });
    }
  });
  while (out.length < 11) out.push({ x: isHome ? 75 : 25, y: 50 });
  return out.slice(0, 11);
}

export function getFormationPositions(formation: string, isHome: boolean): PitchCoord[] {
  if (isFormationKey(formation)) {
    const base = PRESETS[formation];
    return base.map(p => ({ x: isHome ? p.x : Math.round((100 - p.x) * 10) / 10, y: isHome ? p.y : Math.round((100 - p.y) * 10) / 10 }));
  }
  return parseFormation(formation, isHome);
}

export function defaultFormation(): MatchFormationKey {
  return "4-4-2";
}
