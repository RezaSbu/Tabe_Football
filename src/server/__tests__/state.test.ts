import { describe, it, expect, beforeEach } from "vitest";
import { loadDB, setDb, snapshotDB, restoreDB } from "../state";

describe("State - In-memory DB Management", () => {
  beforeEach(() => {
    setDb({
      currentSeason: "1404",
      news: [],
      teams: [],
      players: [],
    });
  });

  it("loadDB returns current state", () => {
    const db = loadDB();
    expect(db).toBeDefined();
    expect(db.currentSeason).toBe("1404");
  });

  it("setDb replaces the state", () => {
    const newState = { currentSeason: "1403", news: [{ id: "test" }] };
    setDb(newState);
    expect(loadDB().currentSeason).toBe("1403");
    expect(loadDB().news).toHaveLength(1);
  });

  it("snapshotDB returns a deep copy", () => {
    const db = loadDB();
    db.news.push({ id: "added" });
    const snap = snapshotDB();
    expect(snap.news).toHaveLength(1);

    db.news.push({ id: "added2" });
    expect(snap.news).toHaveLength(1);
    expect(loadDB().news).toHaveLength(2);
  });

  it("restoreDB reverts to snapshot", () => {
    const snap = snapshotDB();
    setDb({ currentSeason: "1402", news: [], teams: [] });
    expect(loadDB().currentSeason).toBe("1402");

    restoreDB(snap);
    expect(loadDB().currentSeason).toBe("1404");
  });
});
