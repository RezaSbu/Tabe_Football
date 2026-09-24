import { describe, it, expect } from "vitest";
import { setDb, loadDB } from "../state";
import { recalculateAndSyncDatabase } from "../services/stats";

// Coach career matrix: transfers, releases, newcomers, same-name coaches.
// Attribution is stamped ids -> movement-aware tenure; NEVER live mapping.
function coachMatrixDb() {
  return {
    currentSeason: "1405",
    seasons: [{ id: "season-1405", name: "1405", label: "1405-1406", isActive: true, isArchived: false, status: "current" }],
    teams: [
      { id: "tA", name: "تیم الف", stats: {} },
      { id: "tB", name: "تیم ب", stats: {} }
    ],
    coaches: [
      { id: "cX", name: "مربی سیار", teamId: "tB", teamName: "تیم ب", seasonStats: {} },
      { id: "cY", name: "مربی آزادشده", teamId: null, teamName: null, seasonStats: {} },
      { id: "cZ", name: "مربی تازه‌کار", teamId: "tA", teamName: "تیم الف", seasonStats: {} },
      { id: "cN1", name: "مربی هم‌نام", teamId: "tA", teamName: "تیم الف", seasonStats: {} },
      { id: "cN2", name: "مربی هم‌نام", teamId: "tB", teamName: "تیم ب", seasonStats: {} }
    ],
    coachMovements: [
      { id: "cm-x", coachId: "cX", fromTeamId: "tA", toTeamId: "tB", seasonId: "season-1405", movementDate: "1405-05-01" },
      { id: "cm-y", coachId: "cY", fromTeamId: "tB", toTeamId: null, seasonId: "season-1405", movementDate: "1405-04-01" },
      { id: "cm-z", coachId: "cZ", fromTeamId: null, toTeamId: "tA", seasonId: "season-1405", movementDate: "1405-07-01" }
    ],
    players: [],
    matches: [
      {
        id: "m1", status: "finished", league: "pro-league", sport: "football",
        date: "1405-01-10", time: "17:00",
        teamHome: "تیم الف", teamAway: "تیم ب", teamHomeId: "tA", teamAwayId: "tB",
        scoreHome: 2, scoreAway: 0, season: "1405", seasonId: "season-1405",
        lineups: { home: [], away: [] }, events: []
      },
      {
        id: "m2", status: "finished", league: "pro-league", sport: "football",
        date: "1405-06-10", time: "17:00",
        teamHome: "تیم ب", teamAway: "تیم الف", teamHomeId: "tB", teamAwayId: "tA",
        scoreHome: 1, scoreAway: 0, season: "1405", seasonId: "season-1405",
        lineups: { home: [], away: [] }, events: []
      },
      {
        id: "m3", status: "finished", league: "pro-league", sport: "football",
        date: "1406-01-10", time: "17:00",
        teamHome: "تیم ب", teamAway: "تیم الف", teamHomeId: "tB", teamAwayId: "tA",
        scoreHome: 2, scoreAway: 1, season: "1406", seasonId: "season-1406",
        lineups: { home: [], away: [] }, events: []
      },
      {
        id: "m4", status: "finished", league: "pro-league", sport: "football",
        date: "1406-02-10", time: "17:00",
        teamHome: "تیم الف", teamAway: "تیم ب", teamHomeId: "tA", teamAwayId: "tB",
        scoreHome: 1, scoreAway: 1, season: "1406", seasonId: "season-1406",
        lineups: { home: [], away: [] }, events: []
      }
    ],
    standings: {},
    stats: {}
  };
}

describe("coach career matrix", () => {
  it("transferred coach keeps old-club record, earns new-club record", () => {
    setDb(coachMatrixDb() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    const cX = db.coachSeasonStats.filter((r: any) => r.coachId === "cX");
    const at = (s: string, t: string) => cX.find((r: any) => r.seasonId === s && r.teamId === t);
    expect(at("season-1405", "tA")).toMatchObject({ matches: 1, wins: 1 });
    expect(at("season-1405", "tB")).toMatchObject({ matches: 1, wins: 1 });
    expect(at("season-1406", "tB")).toMatchObject({ matches: 2, wins: 1, draws: 1 });
    const c = db.coaches.find((x: any) => x.id === "cX");
    expect(cX.reduce((a: number, r: any) => a + r.matches, 0)).toBe(c.seasonStats.matches);
  });

  it("released coach keeps only pre-release matches", () => {
    setDb(coachMatrixDb() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    const cY = db.coachSeasonStats.filter((r: any) => r.coachId === "cY");
    expect(cY).toHaveLength(1);
    expect(cY[0]).toMatchObject({ seasonId: "season-1405", teamId: "tB", matches: 1, losses: 1 });
  });

  it("newcomer from free agency earns only post-hire matches", () => {
    setDb(coachMatrixDb() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    const cZ = db.coachSeasonStats.filter((r: any) => r.coachId === "cZ");
    expect(cZ).toHaveLength(1);
    expect(cZ[0]).toMatchObject({ seasonId: "season-1406", teamId: "tA", matches: 2, losses: 1, draws: 1 });
  });

  it("same-name coaches never share rows; legacy fills only ledger silence", () => {
    setDb(coachMatrixDb() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    const n1 = db.coachSeasonStats.filter((r: any) => r.coachId === "cN1");
    const n2 = db.coachSeasonStats.filter((r: any) => r.coachId === "cN2");
    // cN1 (movement-less, teamA): ledger covers A except the 05-01..07-01 gap,
    // where only m2 falls.
    expect(n1).toHaveLength(1);
    expect(n1[0]).toMatchObject({ seasonId: "season-1405", teamId: "tA", matches: 1 });
    // cN2 (movement-less, teamB): B fully covered by Y+X spans -> nothing.
    expect(n2).toHaveLength(0);
  });

  it("history is stable across repeated recalcs", () => {
    setDb(coachMatrixDb() as any);
    recalculateAndSyncDatabase();
    const snap = () => JSON.stringify(
      (loadDB() as any).coachSeasonStats,
      (k, v) => (k === "createdAt" ? undefined : v)
    );
    const first = snap();
    recalculateAndSyncDatabase();
    expect(snap()).toBe(first);
  });
});
