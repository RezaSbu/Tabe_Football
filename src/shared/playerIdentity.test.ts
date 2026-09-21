import { describe, it, expect } from "vitest";
import {
  buildPlayerIdentityIndex,
  collectPlayerTeamRefs,
  findMatchLineupPlacement,
  isDuplicatePlayerName,
  isSamePlayer,
  normalizePlayerName,
  playerTeamMatchesSide,
} from "./playerIdentity";

const zobPlayer = { id: "player-zob", name: "Saeed Karimi", teamId: "team-zob", teamName: "Zob Ahan" };
const arioPlayer = { id: "player-ario", name: "Saeed Karimi", teamId: "team-ario", teamName: "Ario Eslamshahr" };
const uniquePlayer = { id: "player-ali", name: "Ali Ahmadi", teamId: "team-zob", teamName: "Zob Ahan" };

const zobMatch = {
  id: "m1",
  season: "1405",
  date: "2026-08-24",
  teamHome: "Zob Ahan",
  teamHomeId: "team-zob",
  teamAway: "Foolad",
  teamAwayId: "team-foolad",
};

const arioMatch = {
  id: "m2",
  season: "1405",
  date: "2026-09-16",
  teamHome: "Ario Eslamshahr",
  teamHomeId: "team-ario",
  teamAway: "Naft MIS",
  teamAwayId: "team-naft",
};

describe("normalizePlayerName", () => {
  it("trims, collapses spaces and lowercases", () => {
    expect(normalizePlayerName("  Saeed   Karimi ")).toBe("saeed karimi");
  });

  it("returns empty string for nullish input", () => {
    expect(normalizePlayerName(null)).toBe("");
    expect(normalizePlayerName(undefined)).toBe("");
  });
});

describe("buildPlayerIdentityIndex / isDuplicatePlayerName", () => {
  it("detects duplicate names and collects every id", () => {
    const index = buildPlayerIdentityIndex([zobPlayer, arioPlayer, uniquePlayer]);
    expect(isDuplicatePlayerName("Saeed Karimi", index)).toBe(true);
    expect(isDuplicatePlayerName("Ali Ahmadi", index)).toBe(false);
    expect(index.ids.has("player-zob")).toBe(true);
    expect(index.ids.has("player-ario")).toBe(true);
  });
});

describe("isSamePlayer", () => {
  const index = buildPlayerIdentityIndex([zobPlayer, arioPlayer, uniquePlayer]);

  it("matches on stable id", () => {
    expect(isSamePlayer({ id: "player-zob", name: "Saeed Karimi" }, zobPlayer, zobMatch, index, [])).toBe(true);
    expect(isSamePlayer({ id: "player-zob", name: "Saeed Karimi" }, arioPlayer, arioMatch, index, [])).toBe(false);
  });

  it("never matches an id that belongs to another known player, even with identical name", () => {
    // Wrong-id data: Ario substitution stored with the Zob Ahan id.
    expect(isSamePlayer({ id: "player-zob", name: "Saeed Karimi" }, arioPlayer, arioMatch, index, [])).toBe(false);
    expect(isSamePlayer({ id: "player-ario", name: "Saeed Karimi" }, arioPlayer, arioMatch, index, [])).toBe(true);
  });

  it("accepts a unique bare name without team proof", () => {
    expect(isSamePlayer({ name: "Ali Ahmadi" }, uniquePlayer, zobMatch, index, [])).toBe(true);
  });

  it("rejects a duplicated bare name without team-side proof", () => {
    expect(isSamePlayer({ name: "Saeed Karimi" }, zobPlayer, zobMatch, index, [])).toBe(false);
    expect(isSamePlayer({ name: "Saeed Karimi" }, zobPlayer, zobMatch, index, [], )).toBe(false);
  });

  it("accepts a duplicated bare name on the player's own team side", () => {
    expect(isSamePlayer({ name: "Saeed Karimi", side: "home" }, zobPlayer, zobMatch, index, [])).toBe(true);
    expect(isSamePlayer({ name: "Saeed Karimi", side: "away" }, zobPlayer, zobMatch, index, [])).toBe(false);
    expect(isSamePlayer({ name: "Saeed Karimi", side: "home" }, arioPlayer, arioMatch, index, [])).toBe(true);
    // Cross-team contamination is impossible: Zob evidence never matches Ario player.
    expect(isSamePlayer({ name: "Saeed Karimi", side: "home" }, arioPlayer, zobMatch, index, [])).toBe(false);
  });

  it("uses membership periods for transferred players", () => {
    const transferred = { id: "player-t", name: "Saeed Karimi", teamId: "team-new", teamName: "New Team" };
    const memberships = [
      { playerId: "player-t", teamId: "team-zob", teamName: "Zob Ahan", season: "1405", startDate: "2026-08-01", endDate: "2026-08-31" },
    ];
    const idx = buildPlayerIdentityIndex([zobPlayer, arioPlayer, transferred]);
    expect(isSamePlayer({ name: "Saeed Karimi", side: "home" }, transferred, zobMatch, idx, memberships)).toBe(true);
    expect(isSamePlayer({ name: "Saeed Karimi", side: "home" }, transferred, arioMatch, idx, memberships)).toBe(false);
  });
});

describe("findMatchLineupPlacement", () => {
  const index = buildPlayerIdentityIndex([zobPlayer, arioPlayer, uniquePlayer]);
  const lineups = {
    home: [{ id: "player-zob", name: "Saeed Karimi" }],
    away: [{ id: "player-ali", name: "Ali Ahmadi" }],
    homeSubs: [{ id: "player-sub", name: "Sub Player" }],
    awaySubs: [],
  };
  const subPlayer = { id: "player-sub", name: "Sub Player", teamId: "team-zob", teamName: "Zob Ahan" };
  const idx2 = buildPlayerIdentityIndex([zobPlayer, arioPlayer, uniquePlayer, subPlayer]);
  const m = { ...zobMatch, lineups };

  it("finds starters with the starter role", () => {
    expect(findMatchLineupPlacement(zobPlayer, m, index, [])).toEqual({
      entry: { id: "player-zob", name: "Saeed Karimi" },
      side: "home",
      role: "starter",
    });
  });

  it("finds substitutes with the substitute role", () => {
    expect(findMatchLineupPlacement(subPlayer, m, idx2, [])).toEqual({
      entry: { id: "player-sub", name: "Sub Player" },
      side: "home",
      role: "substitute",
    });
  });

  it("returns empty placement for outsiders", () => {
    expect(findMatchLineupPlacement(arioPlayer, m, idx2, [])).toEqual({
      entry: null,
      side: null,
      role: null,
    });
  });
});

describe("playerTeamMatchesSide / collectPlayerTeamRefs", () => {
  it("prefers teamId, falls back to normalized teamName", () => {
    expect(playerTeamMatchesSide({ teamId: "team-zob", teamName: "Other" }, zobMatch, "home")).toBe(true);
    expect(playerTeamMatchesSide({ teamName: "Zob Ahan" }, zobMatch, "home")).toBe(true);
    expect(playerTeamMatchesSide({ teamName: "Zob Ahan" }, zobMatch, "away")).toBe(false);
  });

  it("collects current club plus covering memberships", () => {
    const refs = collectPlayerTeamRefs(
      { id: "p", teamId: "t-now", teamName: "Now" },
      [{ playerId: "p", teamId: "t-old", teamName: "Old", season: "1405", startDate: "2026-01-01", endDate: "2026-06-01" }],
      { season: "1405", date: "2026-03-01" }
    );
    expect(refs.length).toBe(2);
  });
});
