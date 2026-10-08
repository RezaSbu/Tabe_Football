import { describe, it, expect } from "vitest";
import {
  computeTfRating,
  valueMarketHistory,
  blockAdjustment,
  replayCareer,
  leagueCoeff,
  minuteTier,
  positionGroupOf,
  TF_START,
  TF_FLOOR,
  TF_CAP,
  MARKET_FLOOR,
} from "../services/stats";

// Agreed scoring rules: TF starts 70, range [60, 99], no season reset.
// Per played match: appearance +1, goal +1, assist +1,
// rating > 7.5 => +2, rating 6..7.5 => +1, rating (0,6) => -1,
// red card -1, own goal -1. Market prices complete 5-game blocks:
// goal +20M, assist +20M, >7.5 +30M, 6..7.5 +10M, (0,6) -10M, floor 1e9.

const G = (goals = 0, assists = 0, rating: number | null = null, redCards = 0, ownGoals = 0) => ({
  goals,
  assists,
  rating,
  redCards,
  ownGoals,
});

describe("computeTfRating", () => {
  it("starts every player at 70 with no matches", () => {
    expect(computeTfRating([])).toBe(TF_START);
    expect(TF_START).toBe(70);
  });

  it("adds appearance + goal + assist + high rating in one match", () => {
    // 70 +1 (app) +1 (goal) +1 (assist) +2 (>7.5) = 75
    expect(computeTfRating([G(1, 1, 8.0)])).toBe(75);
  });

  it("applies the mid rating band and the low band", () => {
    // 70 +1 +1 (6.8 band) = 72
    expect(computeTfRating([G(0, 0, 6.8)])).toBe(72);
    // 70 +1 -1 (5.5 band) = 70
    expect(computeTfRating([G(0, 0, 5.5)])).toBe(70);
  });

  it("penalizes red cards and own goals", () => {
    // 70 +1 (app) -1 (red) = 70
    expect(computeTfRating([G(0, 0, null, 1, 0)])).toBe(70);
    // 70 +1 (app) -1 (own goal) = 70
    expect(computeTfRating([G(0, 0, null, 0, 1)])).toBe(70);
  });

  it("never drops below the 60 floor", () => {
    const bad = Array.from({ length: 30 }, () => G(0, 0, 4.0, 1, 1));
    expect(computeTfRating(bad)).toBe(TF_FLOOR);
  });

  it("never exceeds the 99 cap", () => {
    const great = Array.from({ length: 30 }, () => G(2, 2, 9.0));
    expect(computeTfRating(great)).toBe(TF_CAP);
  });

  it("replays chronologically (order matters at the floor)", () => {
    // Bad stretch first (clamped at 60), then recovery.
    const seq = [G(0, 0, 4.0), G(0, 0, 4.0), G(1, 0, 8.0)];
    // 70+1-1=70, 70+1-1=70, 70+1+1+2=74
    expect(computeTfRating(seq)).toBe(74);
  });

  it("detects the position group from the Persian position string", () => {
    expect(positionGroupOf("دروازه‌بان")).toBe("GK");
    expect(positionGroupOf("مدافع مرکزی")).toBe("DF");
    expect(positionGroupOf("مدافع چپ")).toBe("DF");
    expect(positionGroupOf("هافبک")).toBe("OUT");
    expect(positionGroupOf("مهاجم نوک")).toBe("OUT");
    expect(positionGroupOf(null)).toBe("OUT");
  });

  it("rewards goalkeeper clean sheets like goals", () => {
    const CS = (rating: number | null) => ({ goals: 0, assists: 0, rating, redCards: 0, ownGoals: 0, cleanSheets: 1 });
    // GK: 70 +1 (app) +2 (CS) +1 (7.0 band) = 74
    expect(computeTfRating([CS(7.0)], "GK")).toBe(74);
    // Same match as outfielder: no CS bonus => 72
    expect(computeTfRating([CS(7.0)], "OUT")).toBe(72);
    // DF: half rate => 70 +1 +1 +1 = 73
    expect(computeTfRating([CS(7.0)], "DF")).toBe(73);
  });

  it("prices clean sheets in market blocks (GK 20M, DF 10M)", () => {
    const gkBlock = Array.from({ length: 5 }, () => ({ goals: 0, assists: 0, rating: 7.0, redCards: 0, ownGoals: 0, cleanSheets: 1 }));
    // per game: 10M (rating) + 20M (CS) = 30M; x5 = 150M
    expect(valueMarketHistory(gkBlock, MARKET_FLOOR, () => "1405", "GK").value).toBe(MARKET_FLOOR + 150000000);
    const dfBlock = Array.from({ length: 5 }, () => ({ goals: 0, assists: 0, rating: 7.0, redCards: 0, ownGoals: 0, cleanSheets: 1 }));
    // per game: 10M + 10M = 20M; x5 = 100M
    expect(valueMarketHistory(dfBlock, MARKET_FLOOR, () => "1405", "DF").value).toBe(MARKET_FLOOR + 100000000);
    // Outfielders get nothing for a team clean sheet.
    expect(blockAdjustment({ goals: 0, assists: 0, rating: 7.0, cleanSheets: 1 }, "OUT")).toBe(10000000);
  });
});

describe("engine v2 — tiers, leagues, dampening, star, age", () => {
  const G = (goals = 0, assists = 0, rating: number | null = null, extra: any = {}) => ({
    goals,
    assists,
    rating,
    redCards: 0,
    ownGoals: 0,
    cleanSheets: 0,
    league: "pro-league",
    minutes: 90,
    duration: 90,
    ...extra,
  });

  it("maps league coefficients", () => {
    expect(leagueCoeff("pro-league")).toBe(1.0);
    expect(leagueCoeff("hazfi-cup")).toBe(0.8);
    expect(leagueCoeff("league-1")).toBe(0.7);
    expect(leagueCoeff("league-2")).toBe(0.5);
    expect(leagueCoeff("league-2-a")).toBe(0.5);
    expect(leagueCoeff("futsal")).toBe(0.6);
    expect(leagueCoeff(null)).toBe(1.0);
  });

  it("tiers minutes (full/half/low/cameo, missing = full)", () => {
    expect(minuteTier(90, 90)).toBe(1);
    expect(minuteTier(75, 90)).toBe(1);
    expect(minuteTier(60, 90)).toBe(0.7);
    expect(minuteTier(45, 90)).toBe(0.7);
    expect(minuteTier(30, 90)).toBe(0.5);
    expect(minuteTier(10, 90)).toBe(0);
    expect(minuteTier(undefined, 90)).toBe(1);
    expect(minuteTier(30, 40)).toBe(1); // futsal full
    expect(minuteTier(20, 40)).toBe(0.7);
  });

  it("scales a substitute cameo down but keeps his goal", () => {
    // 20-minute sub, no goal, 7.0 rating, pro league:
    // (app 1 + band 1) * 0.5 * L1 = 1 -> TF 71 (no damp at 70)
    expect(computeTfRating([G(0, 0, 7.0, { minutes: 20 })])).toBe(71);
    // Same cameo WITH a goal: +1 goal unscaled => 72
    expect(computeTfRating([G(1, 0, null, { minutes: 20 })])).toBe(72);
    // 10-minute cameo, unrated: appearance earns nothing => stays 70
    expect(computeTfRating([G(0, 0, null, { minutes: 10 })])).toBe(70);
  });

  it("weights lower leagues less", () => {
    const pro = computeTfRating([G(1, 0, 8.0, { league: "pro-league" })]);
    const l2 = computeTfRating([G(1, 0, 8.0, { league: "league-2" })]);
    // pro: (1+2+1)*1 = 4 -> 74 ; L2: round(4*0.5)=2 -> 72
    expect(pro).toBe(74);
    expect(l2).toBe(72);
  });

  it("dampens gains near the cap so stars keep separating", () => {
    const great = () => G(1, 0, 8.5);
    const r5 = replayCareer([great(), great(), great(), great(), great()], {});
    const r10 = replayCareer(Array.from({ length: 10 }, great), {});
    // Naive sum would be 70 + 10*4 = 110 -> capped 99 long ago;
    // dampened growth must stay strictly below the cap after 5.
    expect(r5.tf).toBeLessThan(99);
    expect(r10.tf).toBeGreaterThan(r5.tf);
    expect(r10.tf).toBeLessThanOrEqual(99);
    // Monotonic non-decreasing on uniformly great games.
    expect(r10.tf).toBeGreaterThanOrEqual(r5.tf);
  });

  it("pays the star bonus only when TF >= 85 at block completion", () => {
    // Mid-table player (TF ~77 after block): no bonus.
    const mid = replayCareer(Array.from({ length: 5 }, () => G(0, 0, 7.0)), { withStar: true });
    // 5x10M = 50M, TF ends below 85 -> no +10M.
    expect(mid.value).toBe(MARKET_FLOOR + 50000000);
    // Block 1 (plain 6.0 games, TF ends ~80): no bonus. Block 2 (great games,
    // TF ends >= 85): exactly one +10M star bonus.
    const starGames = [
      ...Array.from({ length: 5 }, () => G(0, 0, 6.0)),
      ...Array.from({ length: 5 }, () => G(2, 0, 9.0)),
    ];
    const star = replayCareer(starGames, { withStar: true });
    const noStar = replayCareer(starGames, { withStar: false });
    expect(star.value - noStar.value).toBe(10000000);
  });

  it("applies the one-shot age curve at the end", () => {
    const games = Array.from({ length: 5 }, () => G(1, 0, 8.0));
    // per game: (20M + 30M) x5 = 250M -> 1.25e9 base value
    const prime = replayCareer(games, { age: 27 });
    expect(prime.value).toBe(1250000000);
    const vet = replayCareer(games, { age: 34 });
    expect(vet.value).toBe(Math.round(1250000000 * 0.92));
    const kid = replayCareer(games, { age: 19 });
    expect(kid.value).toBe(Math.round(1250000000 * 1.05));
  });

  it("keeps legacy wrappers backward compatible", () => {
    // No league/minutes on entries => L=1, full tier (old behavior).
    expect(computeTfRating([{ goals: 1, assists: 1, rating: 8.0 }])).toBe(75);
    const r = valueMarketHistory(
      [{ goals: 1, assists: 0, rating: 8.0 }, { goals: 0, assists: 0, rating: 7.0 }, { goals: 0, assists: 0, rating: 7.0 }, { goals: 0, assists: 0, rating: 7.0 }, { goals: 0, assists: 0, rating: 7.0 }],
      MARKET_FLOOR,
      () => "1405"
    );
    // (20+30) + 10*4 = 90M
    expect(r.value).toBe(MARKET_FLOOR + 90000000);
  });
});

describe("blockAdjustment + valueMarketHistory", () => {
  it("prices a single entry with the agreed rates", () => {
    // 1 goal (20M) + 1 assist (20M) + rating 8.0 (30M) = 70M
    expect(blockAdjustment(G(1, 1, 8.0))).toBe(70000000);
    // rating 6.8 => +10M
    expect(blockAdjustment(G(0, 0, 6.8))).toBe(10000000);
    // rating 5.5 => -10M
    expect(blockAdjustment(G(0, 0, 5.5))).toBe(-10000000);
    // unrated appearance => 0
    expect(blockAdjustment(G(0, 0, null))).toBe(0);
  });

  it("only prices complete 5-game blocks", () => {
    const four = [G(2, 0, 9.0), G(2, 0, 9.0), G(2, 0, 9.0), G(2, 0, 9.0)];
    const r4 = valueMarketHistory(four, MARKET_FLOOR, () => "1405");
    expect(r4.value).toBe(MARKET_FLOOR); // 4 games: nothing priced
    expect(r4.pricedMatches).toBe(0);
    const five = [...four, G(2, 0, 9.0)];
    const r5 = valueMarketHistory(five, MARKET_FLOOR, () => "1405");
    // per game: 2*20M + 30M = 70M; x5 = 350M
    expect(r5.value).toBe(MARKET_FLOOR + 350000000);
    expect(r5.pricedMatches).toBe(5);
  });

  it("floors the value at 1 milliard", () => {
    const bad = Array.from({ length: 5 }, () => G(0, 0, 4.0));
    const r = valueMarketHistory(bad, MARKET_FLOOR, () => "1405");
    expect(r.value).toBe(MARKET_FLOOR);
  });

  it("builds one history snapshot per season in order", () => {
    const entries = [G(1, 0, 8.0), G(0, 0, 7.0), G(0, 0, 7.0), G(0, 0, 7.0), G(0, 0, 7.0), G(1, 0, 8.0)];
    const seasons = ["1404", "1404", "1404", "1404", "1404", "1405"];
    const r = valueMarketHistory(entries, MARKET_FLOOR, (_e, i) => seasons[i]);
    expect(r.history.map((h) => h.season)).toEqual(["1404", "1405"]);
    // block1 (first 5): (20M + 30M) + 10M*4 = 90M -> 1.09e9 snapshot for 1404
    expect(r.history[0]).toEqual({ season: "1404", value: 1090000000 });
  });
});
