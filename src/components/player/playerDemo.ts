// ============================================================================
// DEMO PREVIEW DATA — TEMPORARY, REMOVE BEFORE PRODUCTION
// Purpose: preview the player-profile sections that have no real data yet
// (market value, radar attributes, career mini, next match) on ONE player.
// - Gated to DEMO_PLAYER_IDS only; every other player is untouched.
// - Each field loses automatically once the backend provides the real one
//   (wiring uses `player.X ?? demo?.X ?? null`), EXCEPT careerHistory and
//   nextMatch which fall back explicitly — delete those two fallbacks too.
// - To remove fully: delete this file + the 4 marked usages in
//   src/components/PlayerDetail.tsx (search for "playerDemo").
// ============================================================================

export interface DemoMarket {
  value: number;
  currency: string;
  changePct: number;
  history: { season: string; value: number }[];
}

export interface DemoExtras {
  marketValue: DemoMarket;
  careerHistory: { club: string; season: string; apps: number; goals: number; assists: number }[];
  nextMatch: {
    id: string;
    teamHome: string;
    teamAway: string;
    date: string;
    time: string;
    venue: string;
  };
}

const DEMO_PLAYER_IDS = new Set<string>([
  "player-1786732602038", // یاسر آسانی (preview only)
]);

const DEMO: DemoExtras = {
  marketValue: {
    value: 1800000,
    currency: "€",
    changePct: 8.4,
    history: [
      { season: "1399", value: 300000 },
      { season: "1400", value: 450000 },
      { season: "1401", value: 700000 },
      { season: "1402", value: 1200000 },
      { season: "1403", value: 1500000 },
      { season: "1404", value: 1800000 },
    ],
  },
  careerHistory: [
    { club: "استقلال", season: "1404", apps: 7, goals: 3, assists: 1 },
    { club: "سپاهان", season: "1403", apps: 24, goals: 5, assists: 7 },
    { club: "گل‌گهر", season: "1402", apps: 26, goals: 4, assists: 6 },
  ],
  nextMatch: {
    id: "demo-next-1",
    teamHome: "استقلال",
    teamAway: "پرسپولیس",
    date: "2026-10-17",
    time: "19:30",
    venue: "ورزشگاه آزادی",
  },
};

/** Returns demo extras for preview-gated players, else null. */
export function getPlayerDemo(playerId?: string | null): DemoExtras | null {
  if (!playerId || !DEMO_PLAYER_IDS.has(String(playerId))) return null;
  return DEMO;
}
