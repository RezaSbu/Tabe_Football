import { describe, it, expect } from "vitest";
import { seasonIdFromTag, normalizeSeasonTag } from "../services/database";

describe("seasonIdFromTag", () => {
  it("derives season-1405 from tag 1405", () => {
    expect(seasonIdFromTag("1405")).toBe("season-1405");
  });

  it("passes through ids that already have the prefix", () => {
    expect(seasonIdFromTag("season-1405")).toBe("season-1405");
  });

  it("returns null for empty/missing tags", () => {
    expect(seasonIdFromTag("")).toBeNull();
    expect(seasonIdFromTag(null)).toBeNull();
    expect(seasonIdFromTag(undefined)).toBeNull();
    expect(seasonIdFromTag("   ")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(seasonIdFromTag(" 1405 ")).toBe("season-1405");
  });
});

describe("normalizeSeasonTag", () => {
  it("keeps plain tags", () => {
    expect(normalizeSeasonTag("1405")).toBe("1405");
  });

  it("reduces admin range labels to the start year", () => {
    // The match form defaults to "1405-1406"; the seasons table only has
    // "1405". Writing the range into season_id violates fk_matches_season.
    expect(normalizeSeasonTag("1405-1406")).toBe("1405");
  });

  it("unwraps season ids back to tags", () => {
    expect(normalizeSeasonTag("season-1405")).toBe("1405");
  });

  it("returns null for empty or tagless input", () => {
    expect(normalizeSeasonTag("")).toBeNull();
    expect(normalizeSeasonTag(null)).toBeNull();
    expect(normalizeSeasonTag(undefined)).toBeNull();
    expect(normalizeSeasonTag("آینده")).toBeNull();
  });
});
