import { describe, it, expect } from "vitest";
import { normalizeMatchGroup, groupLabel, resolveMatchGroup, matchGroupTabs } from "../../shared/matchGroup";

const teams = [
  { id: "t-a1", name: "تیم الف‌یک", divisionKey: "league-2-group-a" },
  { id: "t-a2", name: "تیم الف‌دو", divisionKey: "league-2-group-a" },
  { id: "t-b1", name: "تیم ب‌یک", divisionKey: "league-2-group-b" },
  { id: "t-p1", name: "تیم برتر", divisionKey: "pro-league" },
];

describe("normalizeMatchGroup", () => {
  it("accepts only a/b", () => {
    expect(normalizeMatchGroup("a")).toBe("a");
    expect(normalizeMatchGroup("b")).toBe("b");
    expect(normalizeMatchGroup("A")).toBe(null);
    expect(normalizeMatchGroup("")).toBe(null);
    expect(normalizeMatchGroup(undefined)).toBe(null);
    expect(normalizeMatchGroup("league-2-group-a")).toBe(null);
  });
});

describe("groupLabel", () => {
  it("returns Persian labels", () => {
    expect(groupLabel("a")).toBe("گروه الف");
    expect(groupLabel("b")).toBe("گروه ب");
    expect(groupLabel(null)).toBe("");
  });
});

describe("resolveMatchGroup", () => {
  it("returns null for non-league-2 matches", () => {
    expect(resolveMatchGroup({ league: "pro-league", group: "a" }, teams)).toBe(null);
    expect(resolveMatchGroup(null, teams)).toBe(null);
  });
  it("explicit group wins", () => {
    const m = { league: "league-2", group: "b", teamHomeId: "t-a1", teamAwayId: "t-a2" };
    expect(resolveMatchGroup(m, teams)).toBe("b");
  });
  it("derives from teams when both agree", () => {
    expect(resolveMatchGroup({ league: "league-2", teamHomeId: "t-a1", teamAwayId: "t-a2" }, teams)).toBe("a");
    expect(resolveMatchGroup({ league: "league-2", teamHome: "تیم ب‌یک", teamAway: "تیم برتر" }, teams)).toBe(null);
  });
  it("returns null when teams disagree or are unknown", () => {
    expect(resolveMatchGroup({ league: "league-2", teamHomeId: "t-a1", teamAwayId: "t-b1" }, teams)).toBe(null);
    expect(resolveMatchGroup({ league: "league-2", teamHome: "ناشناس", teamAway: "ناشناس‌تر" }, teams)).toBe(null);
    expect(resolveMatchGroup({ league: "league-2" }, [])).toBe(null);
  });
});

describe("matchGroupTabs", () => {
  it("grouped matches list under their group only", () => {
    expect(matchGroupTabs({ league: "league-2", group: "a" }, teams)).toEqual(["a"]);
  });
  it("ungrouped matches list under both tabs (nothing disappears)", () => {
    expect(matchGroupTabs({ league: "league-2" }, teams)).toEqual(["a", "b"]);
    expect(matchGroupTabs({ league: "pro-league" }, teams)).toEqual(["a", "b"]);
  });
});
