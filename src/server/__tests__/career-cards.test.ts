import { describe, it, expect } from "vitest";
import { buildCareerCards } from "../../shared/career";

// Spec acceptance: Career is (person, season id, club id) — never names.
// Transfer History answers WHERE; Career answers HOW (per season + club).

const seasons = [
  { id: "season-1404", name: "1404", label: "1404-1405" },
  { id: "season-1405", name: "1405", label: "1405-1406", isActive: true, status: "current" },
  { id: "season-1406", name: "1406", label: "1406-1407" },
];

function playerRow(playerId: string, seasonId: string, teamId: string, teamName: string, stats: any) {
  return {
    id: `pss-${playerId}~${seasonId}~${teamId}`,
    playerId, seasonId, season: seasonId.replace("season-", ""), teamId, teamName,
    matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0,
    minutes: 0, mvps: 0,
    ratings: { count: 0, sum: 0 },
    leagueStats: { matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, minutes: 0, mvps: 0, ratingSum: 0, ratingCount: 0, averageRating: null },
    cupStats: { matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, minutes: 0, mvps: 0, ratingSum: 0, ratingCount: 0, averageRating: null },
    ...stats,
  };
}

describe("buildCareerCards", () => {
  it("Test 1+2: consecutive seasons in one club yield separate cards", () => {
    const rows = [
      playerRow("p1", "season-1404", "t-pers", "پرسپولیس", { matches: 24, goals: 12, assists: 6 }),
      playerRow("p1", "season-1405", "t-pers", "پرسپولیس", { matches: 18, goals: 9, assists: 4 }),
    ];
    const { cards, totals } = buildCareerCards({ kind: "player", seasonRows: rows, movements: [], seasons, currentClubId: "t-pers", currentClubName: "پرسپولیس" });
    const filled = cards.filter((c) => !c.isEmpty);
    expect(filled).toHaveLength(2);
    const c1404 = filled.find((c) => c.seasonId === "season-1404");
    const c1405 = filled.find((c) => c.seasonId === "season-1405");
    expect(c1404).toMatchObject({ clubId: "t-pers", matches: 24, goals: 12, assists: 6 });
    expect(c1405).toMatchObject({ clubId: "t-pers", matches: 18, goals: 9, assists: 4 });
    expect(c1404?.seasonLabel).toBe("1404-1405");
    expect(totals).toHaveLength(2);
  });

  it("Test 3: mid-season transfer yields TWO cards for the same season", () => {
    const rows = [
      playerRow("p1", "season-1405", "t-pers", "پرسپولیس", { matches: 20, goals: 10, assists: 5 }),
      playerRow("p1", "season-1405", "t-est", "استقلال", { matches: 12, goals: 6, assists: 4 }),
    ];
    const movements = [{ id: "m1", fromTeamId: "t-pers", toTeamId: "t-est", seasonId: "season-1405", movementDate: "1405-09-15" }];
    const { cards, totals } = buildCareerCards({ kind: "player", seasonRows: rows, movements, seasons, currentClubId: "t-est", currentClubName: "استقلال" });
    const filled = cards.filter((c) => !c.isEmpty);
    expect(filled).toHaveLength(2);
    expect(filled[0].seasonId).toBe(filled[1].seasonId);
    expect(new Set(filled.map((c) => c.clubId)).size).toBe(2);
    const total = totals.find((t) => t.seasonId === "season-1405");
    expect(total).toMatchObject({ clubs: 2, matches: 32, goals: 16, assists: 9 });
  });

  it("Test 4+6: staying put still splits by season", () => {
    const rows = [
      playerRow("p1", "season-1405", "t-est", "استقلال", { matches: 25, goals: 10, assists: 7 }),
      playerRow("p1", "season-1406", "t-est", "استقلال", { matches: 18, goals: 8, assists: 5 }),
    ];
    const { cards } = buildCareerCards({ kind: "player", seasonRows: rows, movements: [], seasons, currentClubId: "t-est", currentClubName: "استقلال" });
    const filled = cards.filter((c) => !c.isEmpty);
    expect(filled).toHaveLength(2);
    expect(new Set(filled.map((c) => c.seasonId)).size).toBe(2);
  });

  it("transfer with no matches yields an explicit zero card (no fake matches)", () => {
    const rows = [playerRow("p1", "season-1405", "t-pers", "پرسپولیس", { matches: 20, goals: 10, assists: 5 })];
    const movements = [{ id: "m1", fromTeamId: "t-pers", toTeamId: "t-est", seasonId: "season-1405", movementDate: "1405-09-15" }];
    const { cards } = buildCareerCards({ kind: "player", seasonRows: rows, movements, seasons, currentClubId: "t-est", currentClubName: "استقلال" });
    expect(cards).toHaveLength(2);
    const zero = cards.find((c) => c.clubId === "t-est");
    expect(zero).toMatchObject({ matches: 0, goals: 0, assists: 0, isEmpty: true });
  });

  it("release produces a free-agent span, not a club card", () => {
    const rows = [playerRow("p1", "season-1405", "t-pers", "پرسپولیس", { matches: 20, goals: 10, assists: 5 })];
    const movements = [{ id: "m1", fromTeamId: "t-pers", toTeamId: null, seasonId: "season-1405", movementDate: "1405-09-15" }];
    const { cards, freeSpans } = buildCareerCards({ kind: "player", seasonRows: rows, movements, seasons });
    expect(cards.filter((c) => !c.isEmpty)).toHaveLength(1);
    expect(cards.some((c) => c.clubId == null)).toBe(false);
    expect(freeSpans).toEqual([{ from: "1405-09-15", to: null }]);
  });

  it("release then signing closes the free-agent span", () => {
    const movements = [
      { id: "m1", fromTeamId: "t-pers", toTeamId: null, seasonId: "season-1405", movementDate: "1405-09-15" },
      { id: "m2", fromTeamId: null, toTeamId: "t-est", seasonId: "season-1405", movementDate: "1405-10-03" },
    ];
    const { freeSpans } = buildCareerCards({ kind: "player", seasonRows: [], movements, seasons });
    expect(freeSpans).toEqual([{ from: "1405-09-15", to: "1405-10-03" }]);
  });

  it("Test 5: history rows and career cards never merge (different builders)", () => {
    const movements = [{ id: "m1", fromTeamId: "t-pers", toTeamId: "t-est", seasonId: "season-1405", movementDate: "1405-09-15" }];
    const { cards } = buildCareerCards({ kind: "player", seasonRows: [], movements, seasons });
    // A movement-only input produces only an empty card shell, never numbers.
    expect(cards).toHaveLength(1);
    expect(cards[0].matches).toBe(0);
    expect(cards[0].goals).toBe(0);
  });

  it("Test 9+10: same-name players have fully independent careers by id", () => {
    const a = buildCareerCards({
      kind: "player",
      seasonRows: [playerRow("pa", "season-1405", "t-pers", "پرسپولیس", { matches: 20, goals: 10, assists: 5 })],
      movements: [], seasons,
    });
    const b = buildCareerCards({
      kind: "player",
      seasonRows: [playerRow("pb", "season-1405", "t-est", "استقلال", { matches: 5, goals: 1, assists: 0 })],
      movements: [], seasons,
    });
    expect(a.cards.filter((c) => !c.isEmpty)).toHaveLength(1);
    expect(b.cards.filter((c) => !c.isEmpty)).toHaveLength(1);
    expect(a.cards[0].goals).toBe(10);
    expect(b.cards[0].goals).toBe(1);
    expect(a.cards[0].clubId).not.toBe(b.cards[0].clubId);
  });

  it("coach cards carry W/D/L, win rate, and joined team points/rank", () => {
    const rows = [{
      id: "css-c1~season-1405~t-pers", coachId: "c1", seasonId: "season-1405",
      season: "1405", teamId: "t-pers", teamName: "پرسپولیس",
      matches: 30, wins: 20, draws: 6, losses: 4, goalsFor: 60, goalsAgainst: 25,
      winRate: 66.7, teamPoints: 66, teamRank: 1,
    }];
    const { cards } = buildCareerCards({ kind: "coach", seasonRows: rows, movements: [], seasons });
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ matches: 30, wins: 20, draws: 6, losses: 4, winRate: 66.7, teamPoints: 66, teamRank: 1 });
  });
});
