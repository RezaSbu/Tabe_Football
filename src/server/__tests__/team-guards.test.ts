import { describe, it, expect } from "vitest";
import {
  validateCreateTeamRef,
  findDuplicateTeam,
  countTeamRefs,
} from "../routes/teams";

describe("creation team-ref guard", () => {
  it("allows free agents (empty or label names)", () => {
    expect(validateCreateTeamRef("", "")).toEqual({ ok: true });
    expect(validateCreateTeamRef(null, null)).toEqual({ ok: true });
    expect(validateCreateTeamRef("", "بازیکن آزاد")).toEqual({ ok: true });
    expect(validateCreateTeamRef("", "مربی آزاد")).toEqual({ ok: true });
    expect(validateCreateTeamRef(undefined, "بدون باشگاه")).toEqual({ ok: true });
  });
  it("allows explicit teamId (existence is checked downstream)", () => {
    expect(validateCreateTeamRef("team-1", "هر چیزی")).toEqual({ ok: true });
  });
  it("rejects free-text team names without teamId", () => {
    const r = validateCreateTeamRef("", "آریو اسلاشمهر");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/لیست/);
    expect(validateCreateTeamRef("", "  شاهین بندرعامری  ").ok).toBe(false);
  });
});

describe("duplicate team guard", () => {
  const teams = [
    { id: "team-1", name: "آریو اسلامشهر" },
    { id: "team-2", name: "استقلال خوزستان" },
    { id: "futsal-1", name: "آریو اسلامشهر" },
  ];
  it("catches exact and normalized duplicates", () => {
    expect(findDuplicateTeam(teams, "آریو اسلامشهر", "team")?.id).toBe("team-1");
    expect(findDuplicateTeam(teams, "  آریو اسلامشهر ", "team")?.id).toBe("team-1");
    expect(findDuplicateTeam(teams, "آريو اسلامشهر", "team")?.id).toBe("team-1"); // Arabic ي
  });
  it("allows multisport same-name clubs and empty names", () => {
    expect(findDuplicateTeam(teams, "آریو اسلامشهر", "futsal")?.id).toBe("futsal-1");
    expect(findDuplicateTeam(teams, "", "team")).toBeNull();
    expect(findDuplicateTeam(teams, "تیم تازه", "team")).toBeNull();
  });
});

describe("team delete reference counter", () => {
  const db = {
    teams: [{ id: "t1", name: "شاهین بندرعامری" }],
    players: [{ id: "p1", teamId: "t1" }, { id: "p2", teamId: null }],
    coaches: [{ id: "c1", teamId: "t1" }],
    matches: [
      { id: "m1", teamHomeId: "t1", teamAwayId: "t2" },
      { id: "m2", teamHomeId: null, teamAwayId: null, teamHome: "شاهین بندرعامری ", teamAway: "حریف" },
    ],
    playerMovements: [{ playerId: "p1", fromTeamId: "t1", toTeamId: null }],
    coachMovements: [],
    lifecycleEvents: [{ personId: "c1", teamId: "t1" }],
    coachAppointments: [],
  };
  it("counts every referencing domain, incl. legacy name-only matches", () => {
    expect(countTeamRefs(db, "t1")).toEqual({
      players: 1, coaches: 1, matches: 2, movements: 1, lifecycle: 1,
    });
  });
  it("returns zeros for an unreferenced team", () => {
    expect(countTeamRefs(db, "t9")).toEqual({
      players: 0, coaches: 0, matches: 0, movements: 0, lifecycle: 0,
    });
  });
});
