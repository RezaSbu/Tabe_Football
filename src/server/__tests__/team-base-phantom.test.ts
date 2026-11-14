import { describe, it, expect } from "vitest";
import { setDb, loadDB } from "../state";
import { recalculateAndSyncDatabase, hasPriorSeasonInDb, normalizeTeamBase } from "../services/stats";

// Root cause of the آکو مد اردبیل table bug: base* (the "not present in
// db.matches" remainder) was frozen forever. The table showed base + matches,
// so one phantom game from an old manual entry kept growing on top of real
// matches. These tests pin the two invariants that now prevent it:
//   1. no base without a prior season,
//   2. base never exceeds the unexplained part of the stored totals.

const match = (id: string, home: string, away: string, hs: number, as: number) => ({
  id,
  status: "finished",
  league: "league-2",
  sport: "football",
  date: "2026-11-01",
  time: "15:00",
  teamHome: home,
  teamAway: away,
  teamHomeId: home === "آکو مد اردبیل" ? "t-ako" : `t-${id}-h`,
  teamAwayId: away === "آکو مد اردبیل" ? "t-ako" : `t-${id}-a`,
  scoreHome: hs,
  scoreAway: as,
  season: "1405",
  seasonId: "season-1405",
});

const fourMatches = () => [
  match("m1", "آکو مد اردبیل", "سپیدرود رشت", 1, 0),
  match("m2", "نفت و گاز ایلام", "آکو مد اردبیل", 0, 0),
  match("m3", "آکو مد اردبیل", "نود ارومیه", 3, 0),
  match("m4", "شهرداری ماهشهر", "آکو مد اردبیل", 1, 0),
];

const akoTeam = (overrides: any = {}) => ({
  id: "t-ako",
  name: "آکو مد اردبیل",
  divisionKey: "league-2-group-a",
  stats: { played: 5, won: 3, drawn: 1, lost: 1, points: 10, goalsFor: 5, goalsAgainst: 1 },
  basePlayed: 1,
  baseWon: 1,
  baseDrawn: 0,
  baseLost: 0,
  basePoints: 3,
  baseGoalsFor: 1,
  baseGoalsAgainst: 0,
  ...overrides,
});

const singleSeasonDb = () => ({
  currentSeason: "1405",
  seasons: [{ id: "season-1405", name: "1405", isActive: true, status: "current" }],
  teams: [akoTeam()],
  players: [],
  coaches: [],
  matches: fourMatches(),
  playerSeasonStats: [],
  coachSeasonStats: [],
  teamSeasonStats: [],
  standings: { "league-2-group-a": [] },
});

describe("team base phantom guard", () => {
  it("detects whether a prior season exists", () => {
    expect(hasPriorSeasonInDb(singleSeasonDb())).toBe(false);
    expect(hasPriorSeasonInDb({ ...singleSeasonDb(), seasons: [
      { id: "season-1404", name: "1404", isActive: false, status: "closed" },
      { id: "season-1405", name: "1405", isActive: true, status: "current" },
    ] })).toBe(true);
  });

  it("zeroes a phantom base when the only season already has tracked matches", () => {
    setDb(singleSeasonDb() as any);
    recalculateAndSyncDatabase();
    const team = (loadDB() as any).teams.find((t: any) => t.id === "t-ako");

    // 4 finished matches: W 1-0, D 0-0, W 3-0, L 0-1 -> P4 W2 D1 L1, 7 pts
    expect(team.basePlayed).toBe(0);
    expect(team.baseWon).toBe(0);
    expect(team.basePoints).toBe(0);
    expect(team.baseGoalsFor).toBe(0);
    expect(team.stats).toMatchObject({ played: 4, won: 2, drawn: 1, lost: 1, points: 7, goalsFor: 4, goalsAgainst: 1 });
  });

  it("keeps the base when an older season justifies a legacy remainder", () => {
    const db = singleSeasonDb();
    db.seasons = [
      { id: "season-1404", name: "1404", isActive: false, status: "closed" },
      { id: "season-1405", name: "1405", isActive: true, status: "current" },
    ];
    setDb(db as any);
    recalculateAndSyncDatabase();
    const team = (loadDB() as any).teams.find((t: any) => t.id === "t-ako");
    expect(team.basePlayed).toBe(1);
    expect(team.stats).toMatchObject({ played: 5, points: 10 });
  });

  it("clamps a stale base to the unexplained part of the stored totals", () => {
    const db = singleSeasonDb();
    db.seasons = [
      { id: "season-1404", name: "1404", isActive: false, status: "closed" },
      { id: "season-1405", name: "1405", isActive: true, status: "current" },
    ];
    // stored says 5 played but base claims 3 -> only 1 can be unexplained
    db.teams = [akoTeam({ basePlayed: 3, basePoints: 9 })];
    setDb(db as any);
    recalculateAndSyncDatabase();
    const team = (loadDB() as any).teams.find((t: any) => t.id === "t-ako");
    expect(team.basePlayed).toBe(1);
    expect(team.basePoints).toBe(3);
  });

  it("keeps a pure legacy base when the team has no tracked matches", () => {
    const db = singleSeasonDb();
    db.matches = [];
    db.teams = [akoTeam({ basePlayed: 5, basePoints: 10, baseWon: 2, stats: { played: 5, won: 2, drawn: 1, lost: 2, points: 10, goalsFor: 6, goalsAgainst: 5 } })];
    setDb(db as any);
    recalculateAndSyncDatabase();
    const team = (loadDB() as any).teams.find((t: any) => t.id === "t-ako");
    expect(team.basePlayed).toBe(5);
    expect(team.stats.played).toBe(5);
  });

  it("is idempotent: a second recalc changes nothing", () => {
    setDb(singleSeasonDb() as any);
    recalculateAndSyncDatabase();
    const first = JSON.stringify((loadDB() as any).teams);
    recalculateAndSyncDatabase();
    const second = JSON.stringify((loadDB() as any).teams);
    expect(second).toBe(first);
  });

  it("normalizeTeamBase reports whether it changed anything", () => {
    const team: any = akoTeam();
    expect(normalizeTeamBase(team, { played: 4, won: 2, drawn: 1, lost: 1, points: 7, goalsFor: 4, goalsAgainst: 1 }, false)).toBe(true);
    expect(team.basePlayed).toBe(0);
    expect(normalizeTeamBase(team, { played: 4, won: 2, drawn: 1, lost: 1, points: 7, goalsFor: 4, goalsAgainst: 1 }, false)).toBe(false);
  });
});
