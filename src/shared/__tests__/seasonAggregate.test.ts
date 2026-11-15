import { describe, it, expect } from "vitest";
import { aggregateSeasonRows, toPositionCandidates } from "../seasonAggregate";
import { buildPositionLeaders } from "../positionLeaders";

// These two helpers decide WHO appears on every leaderboard and per-position
// board. The rules are shared by the stats page and the league tables, so they
// are pinned here: current-club league membership, cup scope, and summing the
// same player across seasons.

const teams = [
  { id: "t-pro", name: "تیم لیگ برتر", divisionKey: "pro-league" },
  { id: "t-l2", name: "تیم لیگ دو", divisionKey: "league-2" },
];

const players = [
  { id: "p1", name: "دروازه‌بان یک", position: "دروازه‌بان", teamId: "t-pro", teamName: "تیم لیگ برتر" },
  { id: "p2", name: "مدافع دو", position: "مدافع", teamId: "t-pro", teamName: "تیم لیگ برتر" },
  { id: "p3", name: "مهاجم سه", position: "مهاجم", teamId: "t-l2", teamName: "تیم لیگ دو" },
  { id: "p4", name: "بازیکن آزاد", position: "هافبک", teamId: "", teamName: "بازیکن آزاد" },
  { id: "p5", name: "وینگر پنج", position: "وینگر", teamId: "t-pro", teamName: "تیم لیگ برتر" },
];

const row = (playerId: string, stats: Record<string, unknown>, seasonId = "season-1405") => ({
  playerId,
  seasonId,
  leagueStats: { goals: 0, assists: 0, cleanSheets: 0, ratingSum: 0, ratingCount: 0, matches: 0 },
  cupStats: { goals: 0, assists: 0, cleanSheets: 0, ratingSum: 0, ratingCount: 0, matches: 0 },
  ...stats,
});

describe("aggregateSeasonRows", () => {
  it("keeps only players whose current club is in the requested league", () => {
    const rows = [
      row("p1", { leagueStats: { matches: 4, ratingSum: 28, ratingCount: 4 } }),
      row("p2", { leagueStats: { matches: 4, ratingSum: 24, ratingCount: 4 } }),
      row("p3", { leagueStats: { matches: 4, ratingSum: 26, ratingCount: 4 } }),
      row("p4", { leagueStats: { matches: 4, ratingSum: 27, ratingCount: 4 } }),
      row("p5", { leagueStats: { matches: 4, ratingSum: 25, ratingCount: 4 } }),
    ];
    const pro = aggregateSeasonRows({ rows, players, teams, split: "leagueStats", wantLeague: "pro-league" });
    expect(pro.map((p) => p.id).sort()).toEqual(["p1", "p2", "p5"]);
    expect(pro.find((p) => p.id === "p1")?.team).toBe("تیم لیگ برتر");
    // A free agent has no club, so no league ever claims them.
    expect(pro.some((p) => p.id === "p4")).toBe(false);
  });

  it("sums a player across club rows and seasons", () => {
    const rows = [
      row("p1", { leagueStats: { matches: 3, ratingSum: 21, ratingCount: 3 } }, "season-1404"),
      row("p1", { leagueStats: { matches: 2, ratingSum: 15, ratingCount: 2 } }, "season-1405"),
    ];
    const [aggregated] = aggregateSeasonRows({ rows, players, teams, split: "leagueStats", wantLeague: "pro-league" });
    expect(aggregated.matches).toBe(5);
    expect(aggregated.ratingCount).toBe(5);
    expect(aggregated.ratingSum).toBe(36);
  });

  it("drops rows that only carry minutes (no numbers, no ratings)", () => {
    const rows = [row("p2", { leagueStats: { minutes: 90, matches: 1 } })];
    expect(aggregateSeasonRows({ rows, players, teams, split: "leagueStats", wantLeague: "pro-league" })).toEqual([]);
  });

  it("uses cup scope without league filtering", () => {
    const rows = [
      row("p3", { cupStats: { goals: 1, matches: 2, ratingSum: 13, ratingCount: 2 } }),
      row("p4", { cupStats: { goals: 2, matches: 1, ratingSum: 7, ratingCount: 1 } }),
      row("p2", { cupStats: { matches: 1 } }),
    ];
    const cup = aggregateSeasonRows({ rows, players, teams, split: "cupStats", wantLeague: null });
    expect(cup.map((p) => p.id).sort()).toEqual(["p3", "p4"]);
    expect(cup.find((p) => p.id === "p4")?.team).toBe("بازیکن آزاد");
  });

  it("tolerates missing arrays and null rows", () => {
    const out = aggregateSeasonRows({
      rows: [null as any, row("p1", {})],
      players: null as any,
      teams: null as any,
      split: "leagueStats",
      wantLeague: "pro-league",
    });
    expect(out).toEqual([]);
  });
});

describe("toPositionCandidates", () => {
  it("computes the average rating and carries position/matches through", () => {
    const rows = [
      row("p1", { leagueStats: { matches: 4, ratingSum: 28, ratingCount: 4 } }),
      row("p2", { leagueStats: { matches: 4, ratingSum: 24, ratingCount: 4 } }),
      row("p5", { leagueStats: { matches: 3, ratingSum: 21, ratingCount: 3 } }),
    ];
    const candidates = toPositionCandidates(
      aggregateSeasonRows({ rows, players, teams, split: "leagueStats", wantLeague: "pro-league" })
    );
    const p1 = candidates.find((c) => c.id === "p1");
    expect(p1?.rating).toBeCloseTo(7);
    expect(p1?.position).toBe("دروازه‌بان");
    expect(p1?.matches).toBe(4);

    // The whole chain: 3-match gate keeps p5 even though nobody has 5 games.
    const boards = buildPositionLeaders(candidates);
    expect(boards.map((g) => g.key).sort()).toEqual(["cb", "fw", "gk"]);
    expect(boards.find((g) => g.key === "fw")?.players.map((p) => p.id)).toEqual(["p5"]);
  });

  it("gives rating 0 when there are no ratings (excluded by the board gate)", () => {
    const rows = [row("p1", { leagueStats: { goals: 2, matches: 5 } })];
    const candidates = toPositionCandidates(
      aggregateSeasonRows({ rows, players, teams, split: "leagueStats", wantLeague: "pro-league" })
    );
    expect(candidates[0].rating).toBe(0);
    expect(buildPositionLeaders(candidates)).toEqual([]);
  });
});
