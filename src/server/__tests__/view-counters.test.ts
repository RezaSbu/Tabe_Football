import { describe, it, expect, beforeEach, vi } from "vitest";

// The point of this file: a view-counter flush must touch ONLY the rows whose
// counter changed. Before the fix, two article views rewrote all 5,105 news
// rows plus a DELETE NOT IN over every id (measured: n_tup_upd +5,105).
const queries: Array<{ sql: string; params: any[] }> = [];

vi.mock("../db", () => ({
  dbQuery: async (sql: string, params: any[]) => {
    queries.push({ sql, params });
    return { rows: [], rowCount: 0 };
  },
}));

const { setDb } = await import("../state");
const { buildViewCounterUpdates, flushViewCountsNow, recordView, VIEW_COUNT_TABLES } = await import(
  "../services/viewTracker"
);

describe("view counter persistence", () => {
  beforeEach(() => {
    queries.length = 0;
  });

  it("updates only the tables that have a view_count column", () => {
    const updates = buildViewCounterUpdates([
      { table: "news", id: "n1", count: 10 },
      { table: "news", id: "n2", count: 5 },
      { table: "players", id: "p1", count: 3 },
      { table: "teams", id: "t1", count: 3 },
    ]);
    expect(updates).toHaveLength(1);
    expect(updates[0].table).toBe("news");
    expect(updates[0].params[0]).toEqual(["n1", "n2"]);
    expect(updates[0].params[1]).toEqual([10, 5]);
    expect(updates[0].sql).toContain("UPDATE news");
    expect(updates[0].sql).not.toContain("DELETE");
  });

  it("keeps the whitelist in sync with the real columns", () => {
    expect([...VIEW_COUNT_TABLES].sort()).toEqual(["images", "legionnaires", "news", "transfers"]);
  });

  it("never builds a statement for a table outside the whitelist", () => {
    expect(buildViewCounterUpdates([{ table: "players" as any, id: "p1", count: 1 }])).toEqual([]);
    expect(buildViewCounterUpdates([])).toEqual([]);
  });

  it("flush writes one UPDATE for two views instead of the whole table", async () => {
    setDb({
      news: [
        { id: "a", viewCount: 7 },
        { id: "b", viewCount: 0 },
        { id: "c", viewCount: 0 },
      ],
    });
    recordView("news", "a");
    recordView("news", "a");
    const result = await flushViewCountsNow();

    expect(result.applied).toBe(2);
    expect(queries).toHaveLength(1);
    expect(queries[0].params[0]).toEqual(["a"]);
    expect(queries[0].sql).toContain("view_count");
    // and the in-memory counter the payload serves moved forward
    const db: any = (await import("../state")).loadDB();
    expect(db.news[0].viewCount).toBeGreaterThan(7);
  });

  it("a table without a column is not written at all", async () => {
    setDb({ players: [{ id: "p1", viewCount: 0 }], news: [] });
    recordView("players", "p1");
    const result = await flushViewCountsNow();
    expect(result.applied).toBe(1);
    expect(queries).toHaveLength(0);
  });
});
