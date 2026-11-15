import { describe, it, expect } from "vitest";
import { setDb, loadDB } from "../state";
import { recalculateAndSyncDatabase } from "../services/stats";

// Disciplinary deductions are a points-only ledger (Malavan −2 in 1405).
// The table must drop by exactly the deduction while every playing record —
// played/won/drawn/lost/goals and the player/coach profiles — stays intact.

const m = (id: string, hs: number, as: number) => ({
  id,
  status: "finished",
  league: "pro-league",
  sport: "football",
  date: "2026-10-01",
  time: "17:00",
  teamHome: "ملوان",
  teamAway: `حریف ${id}`,
  teamHomeId: "t-malavan",
  teamAwayId: `t-${id}`,
  scoreHome: hs,
  scoreAway: as,
  season: "1405",
  seasonId: "season-1405",
});

const malavanDb = (adjustment = -2) => ({
  currentSeason: "1405",
  seasons: [{ id: "season-1405", name: "1405", isActive: true, status: "current" }],
  teams: [{
    id: "t-malavan",
    name: "ملوان",
    divisionKey: "pro-league",
    stats: { played: 3, won: 3, drawn: 0, lost: 0, points: 9, goalsFor: 6, goalsAgainst: 1 },
    basePlayed: 0, baseWon: 0, baseDrawn: 0, baseLost: 0,
    basePoints: 0, baseGoalsFor: 0, baseGoalsAgainst: 0,
    pointsAdjustment: adjustment,
    adjustmentReason: adjustment ? "کسر امتیاز انضباطی" : null,
  }],
  players: [],
  coaches: [],
  matches: [m("a", 2, 0), m("b", 3, 0), m("c", 1, 1)],
  playerSeasonStats: [],
  coachSeasonStats: [],
  teamSeasonStats: [],
  standings: { "pro-league": [] },
});

describe("points adjustment ledger", () => {
  it("applies a deduction to points only, never to W/D/L or goals", () => {
    setDb(malavanDb(-2) as any);
    recalculateAndSyncDatabase();
    const team = (loadDB() as any).teams.find((t: any) => t.id === "t-malavan");

    // 3 matches: W 2-0, W 3-0, D 1-1 -> P3 W2 D1 L0, GF6 GA1, 7 points
    expect(team.stats).toMatchObject({ played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 6, goalsAgainst: 1, points: 5 });
    expect(team.basePoints).toBe(0);
  });

  it("reflects the deduction in the published standings row", () => {
    setDb(malavanDb(-2) as any);
    recalculateAndSyncDatabase();
    const row = (loadDB() as any).standings["pro-league"].find((r: any) => r.id === "t-malavan");
    expect(row).toMatchObject({ played: 3, won: 2, drawn: 1, lost: 0, points: 5 });
  });

  it("is idempotent across recalculations (no double deduction)", () => {
    setDb(malavanDb(-2) as any);
    recalculateAndSyncDatabase();
    const first = JSON.stringify((loadDB() as any).teams);
    recalculateAndSyncDatabase();
    recalculateAndSyncDatabase();
    expect(JSON.stringify((loadDB() as any).teams)).toBe(first);
  });

  it("keeps the current-season archive row in sync with the table", () => {
    setDb(malavanDb(-2) as any);
    recalculateAndSyncDatabase();
    const row = (loadDB() as any).teamSeasonStats.find((r: any) => r.teamId === "t-malavan" && r.seasonId === "season-1405");
    expect(row.points).toBe(5);
  });

  it("leaves everything untouched when there is no adjustment", () => {
    setDb(malavanDb(0) as any);
    recalculateAndSyncDatabase();
    const team = (loadDB() as any).teams.find((t: any) => t.id === "t-malavan");
    expect(team.stats.points).toBe(7);
    expect((loadDB() as any).standings["pro-league"].find((r: any) => r.id === "t-malavan").points).toBe(7);
  });
});
