import { describe, it, expect } from "vitest";
import { getLeagueLabel, UNKNOWN_COMPETITION_LABEL } from "./leagueLabel";

describe("getLeagueLabel (League-1 vs Hazfi Cup regression)", () => {
  it("labels league-1 as Azadegan League, not Hazfi Cup", () => {
    expect(getLeagueLabel("league-1")).toBe("لیگ آزادگان");
  });

  it("labels hazfi-cup as Hazfi Cup", () => {
    expect(getLeagueLabel("hazfi-cup")).toBe("جام حذفی");
  });

  it("labels pro-league fully", () => {
    expect(getLeagueLabel("pro-league")).toBe("لیگ برتر خلیج فارس");
  });

  it("never falls back to a real competition for missing values", () => {
    for (const v of [null, undefined, "", "   "]) {
      expect(getLeagueLabel(v)).toBe(UNKNOWN_COMPETITION_LABEL);
    }
  });

  it("never falls back to Hazfi Cup for unknown values", () => {
    expect(getLeagueLabel("something-else")).toBe(UNKNOWN_COMPETITION_LABEL);
    expect(getLeagueLabel("something-else")).not.toContain("حذفی");
  });
});
