import { describe, it, expect } from "vitest";
import {
  buildCoachMovementMirror,
  coachMirrorId,
} from "../services/lifecycle";
import { coachOfTeamAt } from "../../shared/coachTenure";

// Lifecycle -> movement-ledger mirror: every coach appointment/departure
// must project a dated movement row, otherwise tenure collapses to
// current-team mapping and a new coach inherits the club's whole past
// (Daghighi showing 7 old Nassaji games on day one).
describe("lifecycle movement mirror", () => {
  it("builds an appointment mirror row (free agent -> team)", () => {
    const row = buildCoachMovementMirror({
      id: "m1", coachId: "cD", fromTeamId: null, toTeamId: "tN",
      seasonId: "season-1405", movementDate: "2026-10-05",
      note: "lifecycle mirror", nowIso: "2026-10-05T00:00:00.000Z",
    });
    expect(row).toMatchObject({
      id: "m1", coachId: "cD", fromTeamId: null, toTeamId: "tN",
      seasonId: "season-1405", movementDate: "2026-10-05",
    });
    expect(row.createdAt).toBe(row.updatedAt);
  });

  it("builds a departure mirror row (team -> free)", () => {
    const row = buildCoachMovementMirror({
      id: "m2", coachId: "cH", fromTeamId: "tN", toTeamId: null,
      seasonId: "season-1405", movementDate: "2026-09-25",
      note: "lifecycle mirror", nowIso: "2026-10-05T00:00:00.000Z",
    });
    expect(row).toMatchObject({ coachId: "cH", fromTeamId: "tN", toTeamId: null });
  });

  it("coerces ids to strings and nulls blanks", () => {
    const row = buildCoachMovementMirror({
      id: 7 as any, coachId: 9 as any, fromTeamId: undefined as any,
      toTeamId: "tN", seasonId: null, movementDate: "2026-10-05",
      note: null, nowIso: "x",
    });
    expect(row.id).toBe("7");
    expect(row.coachId).toBe("9");
    expect(row.fromTeamId).toBeNull();
  });

  it("generates unique mirror ids", () => {
    const a = coachMirrorId();
    const b = coachMirrorId();
    expect(a).toMatch(/^ccm-lc-/);
    expect(a).not.toBe(b);
  });

  // Tenure outcomes with mirrored rows (the Daghighi/Hosseini cases).
  const coaches = [
    { id: "cD", teamId: "tN" }, // Daghighi, current holder
    { id: "cH", teamId: null }, // Hosseini, released
  ];
  const at = (cid: string, date: string) =>
    coachOfTeamAt(
      "tN",
      date,
      coaches,
      [
        { coachId: "cD", fromTeamId: null, toTeamId: "tN", movementDate: "2026-10-04" },
        { coachId: "cH", fromTeamId: "tN", toTeamId: null, movementDate: "2026-09-25" },
      ].filter((m) => m.coachId === cid)
    );

  it("new appointee owns nothing before appointment day", () => {
    expect(at("cD", "2026-09-13")).not.toBe("cD");
    expect(at("cD", "2026-10-04")).toBe("cD");
    expect(at("cD", "2026-11-01")).toBe("cD");
  });

  it("release-only history bounds the past holder", () => {
    expect(at("cH", "2026-09-13")).toBe("cH");
    expect(at("cH", "2026-09-25")).not.toBe("cH");
    expect(at("cH", "2026-11-01")).not.toBe("cH");
  });
});
