import { describe, it, expect } from "vitest";
import {
  CURRENT_SEASON_KEY,
  filterBySeason,
  groupBySeason,
  normalizeSeasonId,
  seasonKeyOf,
  seasonLabelOf,
} from "../totwSeasons";

// TOTW weeks restart every season, so docs must be bucketed before week
// numbers are compared. Legacy rows (no seasonId) belong to the live season.

const combos = [
  { id: "a", week: 1 },                                        // legacy -> current
  { id: "b", week: 2, seasonId: "season-1405" },               // current season
  { id: "c", week: 1, seasonId: "season-1404" },               // archive
  { id: "d", week: 2, seasonId: "season-1404" },               // archive
];

describe("TOTW season archive helpers", () => {
  it("normalizes season ids", () => {
    expect(normalizeSeasonId("1404")).toBe("season-1404");
    expect(normalizeSeasonId("season-1404")).toBe("season-1404");
    expect(normalizeSeasonId("  SEASON-1404 ")).toBe("season-1404");
    expect(normalizeSeasonId("")).toBeNull();
    expect(normalizeSeasonId(null)).toBeNull();
  });

  it("treats legacy rows and the active season as the current bucket", () => {
    expect(seasonKeyOf(combos[0], "1405")).toBe(CURRENT_SEASON_KEY);
    expect(seasonKeyOf(combos[1], "1405")).toBe(CURRENT_SEASON_KEY);
    expect(seasonKeyOf(combos[2], "1405")).toBe("season-1404");
  });

  it("moves last season into the archive after the season rolls over", () => {
    expect(seasonKeyOf({ seasonId: "season-1405" }, "1406")).toBe("season-1405");
    // ...and the current-season row is still identified as current
    expect(seasonKeyOf({ seasonId: "season-1406" }, "1406")).toBe(CURRENT_SEASON_KEY);
  });

  it("groups current season first, older seasons newest-first", () => {
    const groups = groupBySeason(
      [...combos, { id: "e", week: 3, seasonId: "season-1403" }],
      "1405"
    );
    expect(groups.map(g => g.key)).toEqual([CURRENT_SEASON_KEY, "season-1404", "season-1403"]);
    expect(groups[0].combinations.map(c => c.id)).toEqual(["a", "b"]);
    expect(groups[1].combinations.map(c => c.id)).toEqual(["c", "d"]);
  });

  it("filters by bucket without losing the current season's legacy rows", () => {
    expect(filterBySeason(combos, CURRENT_SEASON_KEY, "1405").map(c => c.id)).toEqual(["a", "b"]);
    expect(filterBySeason(combos, "season-1404", "1405").map(c => c.id)).toEqual(["c", "d"]);
    expect(filterBySeason(combos, "season-1400", "1405")).toEqual([]);
  });

  it("labels buckets with the season number", () => {
    expect(seasonLabelOf(CURRENT_SEASON_KEY, "1405")).toBe("1405");
    expect(seasonLabelOf("season-1404", "1405")).toBe("1404");
    expect(seasonLabelOf(CURRENT_SEASON_KEY, "")).toBe("");
  });
});
