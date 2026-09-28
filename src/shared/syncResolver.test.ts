import { describe, it, expect } from "vitest";
import {
  computeResolverFindings,
  buildCorrectedStandingRows,
  isHealEligible,
  normName,
  num,
  storedPlayerStats,
} from "./syncResolver";

const M = (over: any = {}) => ({
  id: "m1", status: "finished", league: "league-1",
  teamHome: "آریو اسلامشهر", teamAway: "نفت مسجدسلیمان",
  scoreHome: 0, scoreAway: 3, events: [], scorersList: [],
  isAutoFinished: false, seasonId: null, season: null,
  ...over,
});

const P = (over: any = {}) => ({
  id: "p1", name: "بازیکن تست", teamName: "شمس آذر",
  seasonStats: { goals: 0, assists: 0, matches: 0 },
  baseMatches: 0, baseGoals: 0, baseAssists: 0,
  ...over,
});

describe("num/normName guards", () => {
  it("num maps NaN/undefined to 0 (scoreless rows never poison tables)", () => {
    expect(num(undefined)).toBe(0);
    expect(num(null)).toBe(0);
    expect(num("")).toBe(0);
    expect(num("abc")).toBe(0);
    expect(num(3)).toBe(3);
  });

  it("normName trims and unifies Persian variants (trailing-space bug)", () => {
    expect(normName("فولاد هرمزگان ")).toBe(normName("فولاد هرمزگان"));
    expect(normName("گیتی پسند")).toBe(normName("گيتي پسند"));
  });
});

describe("Ario scenario (true positive preserved)", () => {
  const matches = [
    M({ id: "m1", teamHome: "نفت و گاز گچساران ", teamAway: "آریو اسلامشهر", scoreHome: 0, scoreAway: 1 }),
    M({ id: "m2", teamHome: "آریو اسلامشهر", teamAway: "نفت مسجدسلیمان", scoreHome: 0, scoreAway: 3 }),
  ];
  const standings = {
    "league-1": [{ team: "آریو اسلامشهر", played: 3, won: 1, drawn: 0, lost: 1, goalsFor: 1, goalsAgainst: 3, points: 3, rank: 5 }],
  };
  it("flags stale played (3 vs 2) as eligible STALE_TABLE", () => {
    const { findings, summary } = computeResolverFindings({ matches, players: [], standings });
    const played = findings.find((f) => f.field === "بازی‌ها");
    expect(played).toBeDefined();
    expect(played!.currentValue).toBe(3);
    expect(played!.computedValue).toBe(2);
    expect(played!.reason).toBe("STALE_TABLE");
    expect(isHealEligible(played!)).toBe(true);
    expect(summary.eligible).toBeGreaterThan(0);
  });

  it("heal rebuilds the row to 2 games (never touches other rows)", () => {
    const rows = buildCorrectedStandingRows("league-1", standings["league-1"], matches, { mode: "all" });
    expect(rows[0].played).toBe(2);
    expect(rows[0].points).toBe(3);
  });
});

describe("Mohammadi regression (phantom top-level goals field)", () => {
  it("produces NO finding when seasonStats.goals=2 and events credit 2 (no top-level goals key)", () => {
    const player = P({
      id: "pm", name: "محمدرضا محمدی", teamName: "شمس آذر",
      seasonStats: { goals: 2, assists: 0, matches: 5 },
    });
    delete (player as any).goals;
    const matches = [
      M({ id: "g1", league: "league-1", teamHome: "شمس آذر", teamAway: "حریف",
        scoreHome: 2, scoreAway: 0,
        events: [{ type: "goal", playerName: "محمدرضا محمدی", team: "home" }] }),
      M({ id: "g2", league: "league-1", teamHome: "حریف", teamAway: "شمس آذر",
        scoreHome: 0, scoreAway: 1,
        events: [{ type: "goal", playerName: "محمدرضا محمدی", team: "away" }] }),
    ];
    const { findings } = computeResolverFindings({ matches, players: [player], standings: {} });
    // The phantom-field bug produced a goals finding (profile read as 0).
    // Matches-count may still flag (participation counting is review-only by design).
    const goalFindings = findings.filter((f) => f.id === "pm" && (f.field === "گل‌های زده" || f.field === "پاس گل"));
    expect(goalFindings).toHaveLength(0);
  });

  it("storedPlayerStats prefers seasonStats over legacy top-level keys", () => {
    expect(storedPlayerStats({ seasonStats: { goals: 2, assists: 1, matches: 5 } })).toEqual({ goals: 2, assists: 1, matches: 5 });
    expect(storedPlayerStats({ goals: 7 } as any)).toEqual({ goals: 7, assists: 0, matches: 0 });
  });
});

describe("auto-finished exclusion (Persepolis +1 phantom game)", () => {
  it("an auto-finished 0-0 draw creates NO finding", () => {
    const matches = [
      M({ id: "a1", league: "pro-league", teamHome: "خیبر", teamAway: "پرسپولیس", scoreHome: 0, scoreAway: 0, isAutoFinished: true }),
      M({ id: "r1", league: "pro-league", teamHome: "پرسپولیس", teamAway: "استقلال", scoreHome: 2, scoreAway: 1 }),
    ];
    const standings = {
      "pro-league": [
        { team: "پرسپولیس", played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 1, points: 3, rank: 1 },
        { team: "استقلال", played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 1, goalsAgainst: 2, points: 0, rank: 2 },
        { team: "خیبر", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, rank: 3 },
      ],
    };
    const { findings, summary } = computeResolverFindings({ matches, players: [], standings });
    expect(findings).toHaveLength(0);
    expect(summary.skippedAutoFinished).toBe(1);
  });
});

describe("baseline-aware comparison (imported history is not an error)", () => {
  it("current == computed + base produces NO finding", () => {
    const player = P({
      id: "pb", name: "بازیکن باسابقه",
      seasonStats: { goals: 5, assists: 0, matches: 3 },
      baseGoals: 4, baseMatches: 2,
    });
    const matches = [
      M({ id: "g1", teamHome: "شمس آذر", teamAway: "حریف", scoreHome: 1, scoreAway: 0,
        events: [{ type: "goal", playerName: "بازیکن باسابقه", team: "home" }] }),
    ];
    const { findings, summary } = computeResolverFindings({ matches, players: [player], standings: {} });
    expect(findings.filter((f) => f.id === "pb")).toHaveLength(0);
    expect(summary.baselineExplained).toBeGreaterThan(0);
  });

  it("unexplained gap WITH nonzero base is REAL_MISMATCH (medium, eligible)", () => {
    const player = P({
      id: "px", seasonStats: { goals: 9, assists: 0, matches: 1 }, baseGoals: 4,
    });
    const { findings } = computeResolverFindings({ matches: [], players: [player], standings: {} });
    const g = findings.find((f) => f.id === "px" && f.field === "گل‌های زده");
    expect(g).toBeDefined();
    expect(g!.reason).toBe("REAL_MISMATCH");
    expect(g!.severity).toBe("medium");
    expect(isHealEligible(g!)).toBe(true);
  });
});

describe("name-mismatch guard (archived-spelling rows)", () => {
  it("table row with numbers but no matching matches is NAME_MISMATCH low, ineligible, and heal keeps it", () => {
    const standings = {
      "league-2-group-a": [{ team: "تیم غایب ", played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 0, points: 3, rank: 1 }],
    };
    const { findings } = computeResolverFindings({ matches: [], players: [], standings });
    const f = findings.find((x) => x.name.includes("تیم غایب"));
    expect(f).toBeDefined();
    expect(f!.reason).toBe("NAME_MISMATCH");
    expect(f!.severity).toBe("low");
    expect(isHealEligible(f!)).toBe(false);
    const rows = buildCorrectedStandingRows("league-2-group-a", standings["league-2-group-a"], [], { mode: "all" });
    expect(rows[0].points).toBe(3); // never zeroed
  });
});

describe("appearances asymmetry (bench is not an error)", () => {
  it("under-claim (stored < team games: bench/transfer) produces NO finding", () => {
    const player = P({ id: "pb", seasonStats: { goals: 0, assists: 0, matches: 1 } });
    const matches = [
      M({ id: "a", teamHome: "شمس آذر", teamAway: "حریف", scoreHome: 1, scoreAway: 0 }),
      M({ id: "b", teamHome: "حریف", teamAway: "شمس آذر", scoreHome: 0, scoreAway: 0 }),
      M({ id: "c", teamHome: "شمس آذر", teamAway: "حریف", scoreHome: 2, scoreAway: 2 }),
    ];
    const { findings } = computeResolverFindings({ matches, players: [player], standings: {} });
    expect(findings.filter((f) => f.id === "pb")).toHaveLength(0);
  });

  it("over-claim (stored > team games) is review-only, never global-healed", () => {
    const player = P({ id: "po", seasonStats: { goals: 0, assists: 0, matches: 9 } });
    const matches = [M({ id: "a", teamHome: "شمس آذر", teamAway: "حریف", scoreHome: 1, scoreAway: 0 })];
    const { findings } = computeResolverFindings({ matches, players: [player], standings: {} });
    const f = findings.find((x) => x.id === "po" && x.field === "بازی‌ها");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("low");
    expect(isHealEligible(f!)).toBe(false);
  });
  it("over-claim explained by the team's auto-finished games is silent (autoExplained)", () => {
    const player = P({ id: "pa", teamName: "خیبر", seasonStats: { goals: 0, assists: 0, matches: 2 } });
    const matches = [
      M({ id: "a", teamHome: "خیبر", teamAway: "حریف", scoreHome: 1, scoreAway: 0 }),
      M({ id: "b", teamHome: "خیبر", teamAway: "حریف", scoreHome: 0, scoreAway: 0, isAutoFinished: true }),
    ];
    const { findings, summary } = computeResolverFindings({ matches, players: [player], standings: {} });
    expect(findings.filter((f) => f.id === "pa")).toHaveLength(0);
    expect(summary.autoExplained).toBe(1);
  });
});

describe("tainted-league guard (partial name variants)", () => {
  it("STALE_TABLE in a league with NAME_MISMATCH is downgraded to review-only", () => {
    const matches = [
      M({ id: "f1", league: "league-2-group-a", teamHome: "پردیس قزوین", teamAway: "حریف", scoreHome: 0, scoreAway: 4 }),
    ];
    const standings = {
      "league-2-group-a": [
        { team: "پردیس قزوین", played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 1, goalsAgainst: 8, points: 0, rank: 2 },
        { team: "تیم غایب", played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 0, points: 3, rank: 1 },
      ],
    };
    const { findings } = computeResolverFindings({ matches, players: [], standings });
    expect(findings.some((f) => f.reason === "NAME_MISMATCH")).toBe(true);
    const stale = findings.filter((f) => f.reason === "STALE_TABLE");
    expect(stale.length).toBeGreaterThan(0);
    for (const f of stale) {
      expect(f.severity).toBe("low");
      expect(isHealEligible(f)).toBe(false);
    }
  });
});

describe("season awareness (future فصل‌بندی safety)", () => {
  const matches = [
    M({ id: "s1", league: "league-1", seasonId: "1405", teamHome: "تیم الف", teamAway: "تیم ب", scoreHome: 1, scoreAway: 0 }),
    M({ id: "s2", league: "league-1", seasonId: "1404", teamHome: "تیم الف", teamAway: "تیم ب", scoreHome: 0, scoreAway: 5 }),
  ];
  const standings = {
    "league-1": [{ team: "تیم الف", played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 1, goalsAgainst: 0, points: 3, rank: 1 }],
  };
  it("multi-season data without currentSeasonId never globally heals standings", () => {
    const { findings } = computeResolverFindings({ matches, players: [], standings });
    for (const f of findings) expect(isHealEligible(f)).toBe(false);
    expect(findings.some((f) => f.reason === "MULTI_SEASON")).toBe(true);
  });

  it("with currentSeasonId, standings scope to that season (old-season games ignored)", () => {
    const { findings } = computeResolverFindings({ matches, players: [], standings, currentSeasonId: "1405" });
    const played = findings.find((f) => f.field === "بازی‌ها");
    expect(played).toBeUndefined(); // table played=1 matches 1405-only pool
  });

  it("single-scope data behaves all-time (current reality: empty seasons table)", () => {
    const solo = [M({ id: "u1", seasonId: null, season: null })];
    const st = { "league-1": [{ team: "آریو اسلامشهر", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, rank: 1 }] };
    const { findings } = computeResolverFindings({ matches: solo, players: [], standings: st });
    // نفت مسجدسلیمان won 3-0 -> its row absent; آریو row all zeros matches computed zeros-ish?
    // آریو lost 0-3: played table 0 vs computed 1 -> STALE_TABLE eligible
    const ario = findings.find((f) => f.name.includes("آریو") && f.field === "بازی‌ها");
    expect(ario).toBeDefined();
    expect(ario!.reason).toBe("STALE_TABLE");
  });
});
