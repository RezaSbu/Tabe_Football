import { describe, it, expect } from "vitest";
import { setDb, loadDB } from "../state";
import { recalculateAndSyncDatabase } from "../services/stats";

// Phase 6 — season-history acceptance matrix. Each scenario is a real
// regression risk, not a vanity check:
//   A  player mid-season transfer -> buckets split by PLAYED side
//   A2 transfer immutability -> later team_id edits never rewrite history
//   B  coach appearing for two clubs in one season
//   C  same-name players in the SAME club never mix
//   D  Transfer News rows never leak into the movement/stat pipeline
//   E  double recalc is byte-identical (rewrite idempotency)
//   F  legacy base pins to the EARLIEST season (fresh seasons stay zero)
//   G  season-less matches fall back to the current season
//   H  deterministic row ids are globally unique

const L = (id: string, name: string) => ({ id, name });
const G = (pid: string, pname: string, team: "home" | "away") => ({ type: "goal", playerId: pid, playerName: pname, team });

function matrixDb() {
  return {
    currentSeason: "1406",
    seasons: [
      { id: "season-1405", name: "1405", label: "1405-1406", isActive: false, isArchived: false, status: "closed" },
      { id: "season-1406", name: "1406", label: "1406-1407", isActive: true, isArchived: false, status: "current" }
    ],
    teams: [
      { id: "t1", name: "تیم الف", stats: {} },
      { id: "t2", name: "تیم ب", stats: {} }
    ],
    coaches: [
      { id: "c1", name: "مربی سیار", teamId: "t1", teamName: "تیم الف", seasonStats: {} },
      { id: "c2", name: "مربی ثابت", teamId: "t2", teamName: "تیم ب", seasonStats: {} }
    ],
    players: [
      { id: "pa", name: "بازیکن انتقالی", teamId: "t2", teamName: "تیم ب", position: "مهاجم" },
      { id: "pb", name: "هم‌نام", teamId: "t1", teamName: "تیم الف", position: "مهاجم" },
      { id: "pc", name: "هم‌نام", teamId: "t1", teamName: "تیم الف", position: "هافبک" },
      { id: "pd", name: "بازیکن قدیمی", teamId: "t1", teamName: "تیم الف", position: "مهاجم", seasonStats: { matches: 3, goals: 2, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 } },
      { id: "pe", name: "بازیکن بدون بازی", teamId: "t1", teamName: "تیم الف", position: "مدافع" }
    ],
    matches: [
      {
        id: "m1", status: "finished", league: "pro-league", sport: "football",
        date: "1405-01-10", time: "17:00",
        teamHome: "تیم الف", teamAway: "تیم ب", teamHomeId: "t1", teamAwayId: "t2",
        scoreHome: 2, scoreAway: 0, season: "1405", seasonId: "season-1405",
        lineups: { home: [L("pa", "بازیکن انتقالی"), L("pb", "هم‌نام")], away: [] },
        events: [G("pa", "بازیکن انتقالی", "home"), G("pb", "هم‌نام", "home")]
      },
      {
        id: "m2", status: "finished", league: "pro-league", sport: "football",
        date: "1405-02-10", time: "17:00", coachHomeId: "c1", coachAwayId: "c2",
        teamHome: "تیم ب", teamAway: "تیم الف", teamHomeId: "t2", teamAwayId: "t1",
        scoreHome: 0, scoreAway: 1, season: "1405", seasonId: "season-1405",
        lineups: { home: [L("pa", "بازیکن انتقالی")], away: [L("pc", "هم‌نام")] },
        events: [G("pc", "هم‌نام", "away")]
      },
      {
        id: "m3", status: "finished", league: "pro-league", sport: "football",
        date: "1406-01-10", time: "17:00",
        teamHome: "تیم الف", teamAway: "تیم ب", teamHomeId: "t1", teamAwayId: "t2",
        scoreHome: 0, scoreAway: 1, season: "1406", seasonId: "season-1406",
        lineups: { home: [], away: [L("pa", "بازیکن انتقالی")] },
        events: [G("pa", "بازیکن انتقالی", "away")]
      },
      {
        // No season fields at all -> must fall back to the current season.
        id: "m4", status: "finished", league: "pro-league", sport: "football",
        date: "1406-02-10", time: "17:00",
        teamHome: "تیم الف", teamAway: "تیم ب", teamHomeId: "t1", teamAwayId: "t2",
        scoreHome: 1, scoreAway: 0,
        lineups: { home: [L("pb", "هم‌نام")], away: [] },
        events: [G("pb", "هم‌نام", "home")]
      }
    ],
    // Transfer NEWS (must never touch the movement ledger or season stats).
    transfers: [
      { id: "news-t1", player_name: "بازیکن انتقالی", from_team: "تیم الف", to_team: "تیم ب", date: "1405-05-01" }
    ],
    teamTransfersList: [
      { id: "ttl-t2", team_name: "تیم ب", incomings: [{ name: "بازیکن انتقالی" }], outgoings: [], probables: [] }
    ],
    playerMovements: [],
    coachMovements: [],
    standings: {},
    stats: {}
  };
}

describe("season history acceptance matrix", () => {
  it("A: transferred player splits by played side, career still sums", () => {
    setDb(matrixDb() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    const pa = db.playerSeasonStats.filter((r: any) => r.playerId === "pa");
    expect(pa).toHaveLength(3);
    const at = (s: string, t: string) => pa.find((r: any) => r.seasonId === s && r.teamId === t);
    expect(at("season-1405", "t1")).toMatchObject({ matches: 1, goals: 1 });
    expect(at("season-1405", "t2")).toMatchObject({ matches: 1, goals: 0 });
    expect(at("season-1406", "t2")).toMatchObject({ matches: 1, goals: 1 });
    const p = db.players.find((x: any) => x.id === "pa");
    expect(p.seasonStats.matches).toBe(3);
    expect(p.seasonStats.goals).toBe(2);
  });

  it("A2: later team_id edits never rewrite recorded history", () => {
    setDb(matrixDb() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    // Admin corrects the CURRENT club afterwards (or a movement lands):
    // history buckets must not move.
    db.players.find((x: any) => x.id === "pa").teamId = "t1";
    db.players.find((x: any) => x.id === "pa").teamName = "تیم الف";
    recalculateAndSyncDatabase();
    const db2 = loadDB() as any;
    const pa = db2.playerSeasonStats.filter((r: any) => r.playerId === "pa");
    const at = (s: string, t: string) => pa.find((r: any) => r.seasonId === s && r.teamId === t);
    expect(at("season-1405", "t1").goals).toBe(1);
    expect(at("season-1405", "t2").matches).toBe(1);
    expect(at("season-1406", "t2").goals).toBe(1);
  });

  it("B: one coach, two clubs, one season", () => {
    setDb(matrixDb() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    // c1 coaches t1 in m1/m3 (team map) and t2 in m2 (explicit caretaker id).
    const c1 = db.coachSeasonStats.filter((r: any) => r.coachId === "c1");
    expect(c1).toHaveLength(3);
    const at = (s: string, t: string) => c1.find((r: any) => r.seasonId === s && r.teamId === t);
    expect(at("season-1405", "t1").matches).toBe(1);
    expect(at("season-1405", "t2")).toMatchObject({ matches: 1, losses: 1 });
    // m3 + seasonless m4 (both home t1, both 1406).
    expect(at("season-1406", "t1").matches).toBe(2);
    const c = db.coaches.find((x: any) => x.id === "c1");
    const sumM = c1.reduce((a: number, r: any) => a + r.matches, 0);
    expect(sumM).toBe(c.seasonStats.matches);
  });

  it("C: same name in the SAME club never mixes", () => {
    setDb(matrixDb() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    const pb = db.playerSeasonStats.filter((r: any) => r.playerId === "pb");
    const pc = db.playerSeasonStats.filter((r: any) => r.playerId === "pc");
    // pb: m1 (1405, goal) + m4 (1406 fallback, goal). pc: m2 only.
    expect(pb.reduce((a: number, r: any) => a + r.goals, 0)).toBe(2);
    expect(pc.reduce((a: number, r: any) => a + r.goals, 0)).toBe(1);
    expect(pc).toHaveLength(1);
    expect(pc[0].teamId).toBe("t1");
  });

  it("D: transfer news never touches ledger or stats", () => {
    setDb(matrixDb() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    expect(db.playerMovements).toHaveLength(0);
    expect(db.coachMovements).toHaveLength(0);
    const pa = db.playerSeasonStats.filter((r: any) => r.playerId === "pa");
    expect(pa.reduce((a: number, r: any) => a + r.matches, 0)).toBe(3);
    // News rows themselves are untouched by the pipeline.
    expect(db.transfers).toHaveLength(1);
    expect(db.teamTransfersList).toHaveLength(1);
  });

  it("E: double recalc is byte-identical", () => {
    setDb(matrixDb() as any);
    recalculateAndSyncDatabase();
    // createdAt stamps each run; everything else must be identical.
    const snap = () => JSON.stringify(
      {
        p: (loadDB() as any).playerSeasonStats,
        c: (loadDB() as any).coachSeasonStats,
        t: (loadDB() as any).teamSeasonStats,
      },
      (k, v) => (k === "createdAt" ? undefined : v)
    );
    const first = snap();
    recalculateAndSyncDatabase();
    expect(snap()).toBe(first);
  });

  it("F: legacy base pins to the earliest season; fresh seasons stay zero", () => {
    setDb(matrixDb() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    // pd has ONLY base (3/2): it must land on 1405 even though 1406 is current.
    const pd = db.playerSeasonStats.filter((r: any) => r.playerId === "pd");
    expect(pd).toHaveLength(1);
    expect(pd[0].seasonId).toBe("season-1405");
    expect(pd[0]).toMatchObject({ matches: 3, goals: 2, minutes: 270 });
    // And the fresh season holds no base anywhere.
    const s1406 = db.playerSeasonStats.filter((r: any) => r.seasonId === "season-1406");
    expect(s1406.length).toBeGreaterThan(0); // pa@m3 + pb@m4 are real
    for (const r of s1406) {
      expect(r.minutes).toBe(r.matches * 90); // match-derived only, no base
    }
  });

  it("G: season-less matches fall back to the current season", () => {
    setDb(matrixDb() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    const pb1406 = db.playerSeasonStats.filter((r: any) => r.playerId === "pb" && r.seasonId === "season-1406");
    expect(pb1406).toHaveLength(1);
    expect(pb1406[0]).toMatchObject({ matches: 1, goals: 1 });
    const t1 = db.teamSeasonStats.filter((r: any) => r.teamId === "t1" && r.seasonId === "season-1406");
    expect(t1).toHaveLength(1);
    expect(t1[0]).toMatchObject({ played: 2, won: 1, lost: 1, points: 3 });
  });

  it("H: deterministic row ids are globally unique; idle players get no rows", () => {
    setDb(matrixDb() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    const ids = [
      ...db.playerSeasonStats.map((r: any) => r.id),
      ...db.coachSeasonStats.map((r: any) => r.id),
      ...db.teamSeasonStats.map((r: any) => r.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(db.playerSeasonStats.filter((r: any) => r.playerId === "pe")).toHaveLength(0);
  });

  it("I: team base seeds as stored-minus-calc (never double counts)", () => {
    const db0: any = matrixDb();
    // Stored claims 5 played although db only holds m1/m2/m3/m4 for t1:
    // base must be the unexplained remainder, floored at zero.
    const t1 = db0.teams.find((t: any) => t.id === "t1");
    t1.stats = { played: 5, won: 3, drawn: 1, lost: 1, points: 10, goalsFor: 8, goalsAgainst: 4 };
    delete t1.basePlayed;
    delete t1.baseWon;
    delete t1.baseDrawn;
    delete t1.baseLost;
    delete t1.basePoints;
    delete t1.baseGoalsFor;
    delete t1.baseGoalsAgainst;
    setDb(db0);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    const team = db.teams.find((t: any) => t.id === "t1");
    // db explains: m1 W 2-0, m2 W 0-1 (away), m3 L 0-1, m4 W 1-0
    // = P4 W3 D0 L1 GF4 GA1 Pts9.
    expect(team.basePlayed).toBe(1);
    expect(team.baseWon).toBe(0);
    expect(team.baseDrawn).toBe(1);
    expect(team.baseLost).toBe(0);
    expect(team.basePoints).toBe(1);
    expect(team.baseGoalsFor).toBe(4);
    expect(team.baseGoalsAgainst).toBe(3);
    // Displayed totals = base + calc, never calc twice.
    expect(team.stats.played).toBe(5);
    expect(team.stats.points).toBe(10);
  });
});
