import { describe, it, expect } from "vitest";
import { buildLitePayload, LITE_NEWS_LIMIT } from "../state";

const mkNews = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `n${i}`,
    title: `title ${i}`,
    // createdAt ascending with i: n0 oldest ... n(n-1) newest
    createdAt: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
    content: `FULL-BODY-${i}`,
    image: `img-${i}`,
  }));

const fullDb = () => ({
  status: "ok",
  news: mkNews(100),
  matches: [{ id: "m1" }],
  teams: [{ id: "t1" }],
  players: [{ id: "p1" }],
  standings: { x: [] },
  stats: {},
  transfers: [],
  teamTransfersList: [],
  heroSlides: [],
  ads: [{ id: "a1" }],
  coaches: [],
  liveGoals: [],
  media_files: [{ id: "huge" }],
  football_Finished_Games: [{ id: "arch" }],
  futsal_Finished_Games: [],
  football_Now_Games: [],
  futsal_Now_Games: [],
  Feature_Games: [{ id: "draft" }],
  football_Feature_Games: [{ id: "draft2" }],
  futsal_Feature_Games: [],
  submissions: [{ id: "inbox" }],
  playerMovements: [{ id: "hist" }],
  lifecycleEvents: [],
  lifecycleReasons: [],
});

describe("buildLitePayload", () => {
  it("drops the heavy admin/archive tables", () => {
    const lite = buildLitePayload(fullDb());
    for (const k of [
      "media_files",
      "football_Finished_Games",
      "futsal_Finished_Games",
      "football_Now_Games",
      "futsal_Now_Games",
      "Feature_Games",
      "football_Feature_Games",
      "futsal_Feature_Games",
      "submissions",
      "playerMovements",
      "lifecycleEvents",
      "lifecycleReasons",
    ]) {
      expect(lite, `key ${k}`).not.toHaveProperty(k);
    }
  });

  it("keeps every first-paint table by reference", () => {
    const db = fullDb();
    const lite = buildLitePayload(db);
    for (const k of [
      "matches",
      "teams",
      "players",
      "standings",
      "stats",
      "transfers",
      "teamTransfersList",
      "heroSlides",
      "ads",
      "coaches",
      "liveGoals",
    ]) {
      expect(lite[k]).toBe(db[k as keyof typeof db]);
    }
  });

  it(`trims news to the newest ${LITE_NEWS_LIMIT} with bodies intact`, () => {
    const lite = buildLitePayload(fullDb());
    expect(lite.news).toHaveLength(LITE_NEWS_LIMIT);
    // newest-first: createdAt must be non-increasing
    const dates = lite.news.map((n: any) => n.createdAt);
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
    // detail pages keep working: bodies survive the trim
    for (const n of lite.news) {
      expect(n.content).toMatch(/^FULL-BODY-/);
    }
  });

  it("keeps all news when under the limit, newest-first", () => {
    const db = fullDb();
    db.news = mkNews(10);
    const lite = buildLitePayload(db);
    expect(lite.news).toHaveLength(10);
    expect(lite.news[0].createdAt >= lite.news[9].createdAt).toBe(true);
  });

  it("tolerates missing/empty input without throwing", () => {
    expect(buildLitePayload(null)).toMatchObject({ news: [] });
    expect(buildLitePayload({})).toMatchObject({ news: [] });
    expect(buildLitePayload({ news: null }).news).toEqual([]);
  });
});
