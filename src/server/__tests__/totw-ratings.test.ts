import { describe, it, expect, vi, afterEach } from "vitest";
import { weekNumberOf, buildWeekRatings, resolveTotwRating } from "../../shared/totwRatings";
import { recordView, pendingViewTotal } from "../services/viewTracker";

const lineup = (entries: any[]) => ({ home: entries, away: [], homeSubs: [], awaySubs: [] });

describe("totwRatings.weekNumberOf", () => {
  it("parses fa/en week labels", () => {
    expect(weekNumberOf("هفته 6")).toBe(6);
    expect(weekNumberOf("هفته ۶")).toBe(6);
    expect(weekNumberOf(6)).toBe(6);
    expect(weekNumberOf(null)).toBe(0);
    expect(weekNumberOf("نامشخص")).toBe(0);
  });
});

describe("totwRatings.buildWeekRatings", () => {
  const matches = [
    { id: "m1", league: "pro-league", week: "هفته 6", lineups: lineup([{ id: "p1", rating: 8.5 }, { id: "p2", rating: "7" }]) },
    { id: "m2", league: "pro-league", week: "هفته 6", lineups: lineup([{ id: "p1", rating: 9 }]) },
    { id: "m3", league: "pro-league", week: "هفته 5", lineups: lineup([{ id: "p1", rating: 5 }]) },
    { id: "m4", league: "league-1", week: "هفته 6", lineups: lineup([{ id: "p1", rating: 4 }]) },
    { id: "m5", league: "league-2", group: "b", week: "هفته 6", lineups: lineup([{ id: "p9", rating: 7.5 }]) },
    { id: "m6", league: "league-2", group: "a", week: "هفته 6", lineups: lineup([{ id: "p9", rating: 6 }]) },
  ];
  it("takes the best rating of the same week+league (string ratings count)", () => {
    const map = buildWeekRatings(matches, "pro-league", "", 6);
    expect(map.get("p1")).toBe(9);
    expect(map.get("p2")).toBe(7);
  });
  it("ignores other weeks and leagues, respects league-2 groups", () => {
    expect(buildWeekRatings(matches, "pro-league", "", 6).has("p9")).toBe(false);
    expect(buildWeekRatings(matches, "league-2", "a", 6).get("p9")).toBe(6);
    expect(buildWeekRatings(matches, "league-2", "b", 6).get("p9")).toBe(7.5);
  });
  it("empty week returns empty map", () => {
    expect(buildWeekRatings(matches, "pro-league", "", 0).size).toBe(0);
  });
});

describe("totwRatings.resolveTotwRating", () => {
  const week = new Map([["p1", 8.5]]);
  it("prefers week-match rating, then live, then stored", () => {
    expect(resolveTotwRating(week, "p1", 9.5, 8)).toBe(8.5);
    expect(resolveTotwRating(week, "p2", 9.5, 8)).toBe(9.5);
    expect(resolveTotwRating(week, "p3", null, 8)).toBe(8);
    expect(resolveTotwRating(week, "p4", null, null)).toBeNull();
  });
});

describe("viewTracker batch queue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  it("records visits into the pending bucket without touching viewCount", async () => {
    vi.useFakeTimers();
    const { setDb, loadDB } = await import("../state");
    setDb({ news: [{ id: "n-batch-test", title: "t", viewCount: 100 }] } as any);
    const before = (loadDB() as any).news[0].viewCount;
    expect(recordView("news", "n-batch-test")).toBeGreaterThanOrEqual(1);
    recordView("news", "n-batch-test");
    // Still unbumped: application happens only on flush.
    expect((loadDB() as any).news[0].viewCount).toBe(before);
    expect(pendingViewTotal()).toBeGreaterThanOrEqual(2);
  });
});
