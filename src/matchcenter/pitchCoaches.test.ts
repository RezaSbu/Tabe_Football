import { describe, it, expect } from "vitest";
import { resolveSideCoach } from "./toPitchPlayer";

const coaches = [
  { id: "cA", name: "مربی الف", teamId: "tA", teamName: "تیم الف" },
  { id: "cB", name: "مربی ب", teamId: "tB", teamName: "تیم ب" },
];
const teams = [
  { id: "tA", name: "تیم الف" },
  { id: "tB", name: "تیم ب" },
];

describe("resolveSideCoach", () => {
  it("prefers the stamped coach id", () => {
    const match = { coachHomeId: "cA", teamHome: "تیم الف", teamHomeId: "tA", date: "2026-09-01" };
    const got = resolveSideCoach(match, "home", coaches, { teams });
    expect(got?.id).toBe("cA");
    expect(got?.side).toBe("home");
  });

  it("tenure bounds an appointment: released coach owns old dates only", () => {
    const coaches2 = [
      { id: "cOld", name: "مربی قبلی", teamId: null, teamName: null },
      { id: "cNew", name: "مربی جدید", teamId: "tA", teamName: "تیم الف" },
    ];
    const movements = [
      { coachId: "cOld", fromTeamId: "tA", toTeamId: null, movementDate: "2026-09-25" },
      { coachId: "cNew", fromTeamId: null, toTeamId: "tA", movementDate: "2026-10-04" },
    ];
    const oldMatch = { teamHome: "تیم الف", teamHomeId: "tA", date: "2026-09-13" };
    const newMatch = { teamHome: "تیم الف", teamHomeId: "tA", date: "2026-10-10" };
    expect(resolveSideCoach(oldMatch, "home", coaches2, { movements, teams })?.id).toBe("cOld");
    expect(resolveSideCoach(newMatch, "home", coaches2, { movements, teams })?.id).toBe("cNew");
  });

  it("falls back to current holder when no tenure evidence", () => {
    const match = { teamHome: "تیم الف", teamHomeId: "tA", date: "2026-09-01" };
    const got = resolveSideCoach(match, "home", coaches, { teams });
    expect(got?.id).toBe("cA");
  });

  it("resolves team by name when id is missing", () => {
    const match = { teamAway: "تیم ب", date: "2026-09-01" };
    const got = resolveSideCoach(match, "away", coaches, { teams });
    expect(got?.id).toBe("cB");
    expect(got?.side).toBe("away");
  });

  it("returns null when the team is unknown", () => {
    const match = { teamHome: "تیم ناشناس", date: "2026-09-01" };
    expect(resolveSideCoach(match, "home", coaches, { teams })).toBeNull();
    expect(resolveSideCoach(null, "home", coaches, { teams })).toBeNull();
  });

  it("ignores blank stamp ids", () => {
    const match = { coachHomeId: "", teamHome: "تیم الف", teamHomeId: "tA", date: "2026-09-01" };
    expect(resolveSideCoach(match, "home", coaches, { teams })?.id).toBe("cA");
  });
});
