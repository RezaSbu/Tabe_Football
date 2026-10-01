import type { MatchFormationKey } from "../types";

export interface PitchCoord { x: number; y: number }

// Explicit presets for the 7 supported systems. Coordinates are percent
// positions on a horizontal pitch: home defends the LEFT half (x 5..45),
// away mirrors to the RIGHT half (x 55..95). y is 0..100 top-to-bottom.
const PRESETS: Record<MatchFormationKey, { x: number; y: number }[]> = {
  "4-4-2": [
    { x: 6, y: 50 },
    { x: 18, y: 16 }, { x: 15, y: 38 }, { x: 15, y: 62 }, { x: 18, y: 84 },
    { x: 32, y: 14 }, { x: 29, y: 38 }, { x: 29, y: 62 }, { x: 32, y: 86 },
    { x: 42, y: 36 }, { x: 42, y: 64 },
  ],
  "4-3-3": [
    { x: 6, y: 50 },
    { x: 18, y: 16 }, { x: 15, y: 38 }, { x: 15, y: 62 }, { x: 18, y: 84 },
    { x: 30, y: 26 }, { x: 27, y: 50 }, { x: 30, y: 74 },
    { x: 42, y: 18 }, { x: 44, y: 50 }, { x: 42, y: 82 },
  ],
  "4-2-3-1": [
    { x: 6, y: 50 },
    { x: 18, y: 16 }, { x: 15, y: 38 }, { x: 15, y: 62 }, { x: 18, y: 84 },
    { x: 27, y: 36 }, { x: 27, y: 64 },
    { x: 36, y: 16 }, { x: 38, y: 50 }, { x: 36, y: 84 },
    { x: 44, y: 50 },
  ],
  "3-5-2": [
    { x: 6, y: 50 },
    { x: 16, y: 26 }, { x: 13, y: 50 }, { x: 16, y: 74 },
    { x: 28, y: 12 }, { x: 27, y: 36 }, { x: 25, y: 50 }, { x: 27, y: 64 }, { x: 28, y: 88 },
    { x: 42, y: 36 }, { x: 42, y: 64 },
  ],
  "3-4-3": [
    { x: 6, y: 50 },
    { x: 16, y: 26 }, { x: 13, y: 50 }, { x: 16, y: 74 },
    { x: 30, y: 14 }, { x: 28, y: 38 }, { x: 28, y: 62 }, { x: 30, y: 86 },
    { x: 42, y: 18 }, { x: 44, y: 50 }, { x: 42, y: 82 },
  ],
  "5-3-2": [
    { x: 6, y: 50 },
    { x: 17, y: 12 }, { x: 14, y: 31 }, { x: 12, y: 50 }, { x: 14, y: 69 }, { x: 17, y: 88 },
    { x: 29, y: 30 }, { x: 27, y: 50 }, { x: 29, y: 70 },
    { x: 42, y: 36 }, { x: 42, y: 64 },
  ],
  "5-4-1": [
    { x: 6, y: 50 },
    { x: 17, y: 12 }, { x: 14, y: 31 }, { x: 12, y: 50 }, { x: 14, y: 69 }, { x: 17, y: 88 },
    { x: 30, y: 14 }, { x: 28, y: 38 }, { x: 28, y: 62 }, { x: 30, y: 86 },
    { x: 44, y: 50 },
  ],
};

export const FORMATION_KEYS: MatchFormationKey[] = ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "3-4-3", "5-3-2", "5-4-1"];

export function isFormationKey(v: unknown): v is MatchFormationKey {
  return typeof v === "string" && (FORMATION_KEYS as string[]).includes(v);
}

// Generic parser for any "N-N-...-N" system summing to 10 outfield players.
// Home occupies x 16..44 ascending toward midfield; away mirrors.
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
  const out: PitchCoord[] = [{ x: isHome ? 5 : 95, y: 50 }];
  const n = lines.length;
  lines.forEach((count, li) => {
    const homeX = n === 1 ? 30 : 16 + (li * (44 - 16)) / (n - 1);
    for (const y of yFor(count, li)) {
      const rawY = isHome ? y : 100 - y;
      out.push({ x: Math.round((isHome ? homeX : 100 - homeX) * 10) / 10, y: Math.round(rawY * 10) / 10 });
    }
  });
  while (out.length < 11) out.push({ x: isHome ? 25 : 75, y: 50 });
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
