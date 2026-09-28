import { describe, it, expect } from "vitest";
import { setDb, loadDB } from "../state";
import { recalculateAndSyncDatabase } from "../services/stats";

// Phase 3: per-(entity, season, club) aggregates accumulated inside recalc.
function lineup(id: string, name: string) {
  return { id, name };
}
function goal(pid: string, pname: string, team: "home" | "away") {
  return { type: "goal", playerId: pid, playerName: pname, team };
}

function fixture() {
  return {
    currentSeason: "1405",
    seasons: [{ id: "season-1405", name: "1405", label: "1405-1406", isActive: true, isArchived: false, status: "current" }],
    teams: [
      { id: "t1", name: "تیم الف", stats: {} },
      { id: "t2", name: "تیم ب", stats: {} }
    ],
    coaches: [
      { id: "c1", name: "مربی الف", teamId: "t1", teamName: "تیم الف", seasonStats: {} },
      { id: "c2", name: "مربی ب", teamId: "t2", teamName: "تیم ب", seasonStats: {} }
    ],
    players: [
      // Base-only veteran: 2 matches / 1 goal of legacy baseline, no matches in db.
      { id: "p1", name: "بازیکن قدیمی", teamId: "t1", teamName: "تیم الف", position: "مهاجم", seasonStats: { matches: 2, goals: 1, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 } },
      // Same-name pair on opposite clubs.
      { id: "p2", name: "سعید کریمی", teamId: "t1", teamName: "تیم الف", position: "مهاجم" },
      { id: "p3", name: "سعید کریمی", teamId: "t2", teamName: "تیم ب", position: "هافبک" },
      // Transferred mid-season: currently t2, but played m1 for t1.
      { id: "p4", name: "بازیکن انتقالی", teamId: "t2", teamName: "تیم ب", position: "مهاجم" },
      // No base, no matches -> must produce no row.
      { id: "p5", name: "بازیکن بدون بازی", teamId: "t1", teamName: "تیم الف", position: "مدافع" }
    ],
    matches: [
      {
        id: "m1", status: "finished", league: "pro-league", sport: "football",
        date: "1405-01-10", time: "17:00",
        teamHome: "تیم الف", teamAway: "تیم ب", teamHomeId: "t1", teamAwayId: "t2",
        scoreHome: 2, scoreAway: 1, season: "1405", seasonId: "season-1405",
        lineups: { home: [lineup("p2", "سعید کریمی"), lineup("p4", "بازیکن انتقالی")], away: [lineup("p3", "سعید کریمی")] },
        events: [goal("p2", "سعید کریمی", "home"), goal("p4", "بازیکن انتقالی", "home"), goal("p3", "سعید کریمی", "away")]
      },
      {
        id: "m2", status: "finished", league: "hazfi-cup", sport: "football",
        date: "1405-01-17", time: "17:00",
        teamHome: "تیم الف", teamAway: "تیم ب", teamHomeId: "t1", teamAwayId: "t2",
        scoreHome: 1, scoreAway: 0, season: "1405", seasonId: "season-1405",
        lineups: { home: [lineup("p2", "سعید کریمی")], away: [] },
        events: [goal("p2", "سعید کریمی", "home")]
      },
      {
        // Archived for standings: teams/coaches skip it, players still count it.
        id: "m3", status: "finished", league: "pro-league", sport: "football",
        archived_standings: true,
        date: "1405-01-24", time: "17:00",
        teamHome: "تیم الف", teamAway: "تیم ب", teamHomeId: "t1", teamAwayId: "t2",
        scoreHome: 3, scoreAway: 0, season: "1405", seasonId: "season-1405",
        lineups: { home: [lineup("p2", "سعید کریمی")], away: [] },
        events: []
      }
    ],
    standings: {},
    stats: {}
  };
}

describe("recalculateAndSyncDatabase — per-season aggregates", () => {
  it("builds club-scoped player rows with league/cup split and legacy base", () => {
    setDb(fixture() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    const rows: any[] = db.playerSeasonStats;
    expect(Array.isArray(rows)).toBe(true);

    // p2: m1 league goal + m2 cup goal + m3 league (no goal, archived for teams only)
    const p2 = rows.filter((r) => r.playerId === "p2");
    expect(p2).toHaveLength(1);
    expect(p2[0].seasonId).toBe("season-1405");
    expect(p2[0].teamId).toBe("t1");
    expect(p2[0].matches).toBe(3);
    expect(p2[0].goals).toBe(2);
    expect(p2[0].leagueStats.matches).toBe(2);
    expect(p2[0].leagueStats.goals).toBe(1);
    expect(p2[0].cupStats.matches).toBe(1);
    expect(p2[0].cupStats.goals).toBe(1);

    // Same-name p3 on the other club stays fully separate.
    const p3 = rows.filter((r) => r.playerId === "p3");
    expect(p3).toHaveLength(1);
    expect(p3[0].teamId).toBe("t2");
    expect(p3[0].matches).toBe(1);
    expect(p3[0].goals).toBe(1);

    // Transferred p4: bucket follows the played side (t1), not the current club (t2).
    const p4 = rows.filter((r) => r.playerId === "p4");
    expect(p4).toHaveLength(1);
    expect(p4[0].teamId).toBe("t1");
    expect(p4[0].goals).toBe(1);

    // Base-only p1 lands on the current season with base minutes (2 x 90).
    const p1 = rows.filter((r) => r.playerId === "p1");
    expect(p1).toHaveLength(1);
    expect(p1[0].seasonId).toBe("season-1405");
    expect(p1[0].matches).toBe(2);
    expect(p1[0].goals).toBe(1);
    expect(p1[0].minutes).toBe(180);
    expect(p1[0].leagueStats.matches).toBe(2);

    // Idle p5 produces no row.
    expect(rows.filter((r) => r.playerId === "p5")).toHaveLength(0);
  });

  it("keeps career == sum(seasons) for every player row", () => {
    setDb(fixture() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    for (const p of db.players) {
      const prow = db.playerSeasonStats.filter((r: any) => r.playerId === p.id);
      const sumM = prow.reduce((a: number, r: any) => a + r.matches, 0);
      const sumG = prow.reduce((a: number, r: any) => a + r.goals, 0);
      expect(sumM).toBe(p.seasonStats.matches);
      expect(sumG).toBe(p.seasonStats.goals);
    }
  });

  it("mirrors team/coach gates (archived_standings excluded, cups league-only)", () => {
    setDb(fixture() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;

    // t1: only m1 counts for the league bucket (m2 is cup, m3 archived).
    const t1 = db.teamSeasonStats.filter((r: any) => r.teamId === "t1");
    expect(t1).toHaveLength(1);
    expect(t1[0].seasonId).toBe("season-1405");
    expect(t1[0].played).toBe(1);
    expect(t1[0].won).toBe(1);
    expect(t1[0].points).toBe(3);
    // Reconciles with the displayed all-time league numbers.
    const t1obj = db.teams.find((t: any) => t.id === "t1");
    expect(t1[0].played).toBe(t1obj.stats.played);
    expect(t1[0].points).toBe(t1obj.stats.points);

    // Coaches: m1 (league) + m2 (cup) count; m3 is excluded by the
    // standings gate that structurally wraps the coach block (same as teams).
    const c1 = db.coachSeasonStats.filter((r: any) => r.coachId === "c1");
    const c1obj = db.coaches.find((c: any) => c.id === "c1");
    expect(c1).toHaveLength(1);
    expect(c1[0].matches).toBe(2);
    expect(c1[0].wins).toBe(2);
    expect(c1[0].matches).toBe(c1obj.seasonStats.matches);
    expect(c1[0].wins).toBe(c1obj.seasonStats.wins);
  });

  it("tags ratingsHistory entries with the match season", () => {
    setDb(fixture() as any);
    recalculateAndSyncDatabase();
    const db = loadDB() as any;
    const p2 = db.players.find((p: any) => p.id === "p2");
    expect(p2.ratingsHistory.length).toBeGreaterThan(0);
    for (const h of p2.ratingsHistory) {
      expect(h.seasonId).toBe("season-1405");
    }
  });
});
