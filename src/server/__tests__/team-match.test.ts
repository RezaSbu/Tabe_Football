import { describe, it, expect } from "vitest";
import { resolveTeam, isExactTeamName } from "../../shared/teamMatch";

const teams = [
  { id: "team-1785484986454", name: "استقلال خوزستان", logo: "khuzestan.png" },
  { id: "team-1785483285455", name: "استقلال", logo: "esteghlal.png" },
  { id: "futsal-sun", name: "سونگون" },
];

describe("resolveTeam", () => {
  it("resolves by exact id", () => {
    expect(resolveTeam(teams, "team-1785484986454")?.id).toBe("team-1785484986454");
  });

  it("resolves 'استقلال' to the exact team, not the substring match", () => {
    const result = resolveTeam(teams, "استقلال");
    expect(result?.id).toBe("team-1785483285455");
    expect(result?.name).toBe("استقلال");
  });

  it("resolves 'استقلال خوزستان' to its exact team", () => {
    const result = resolveTeam(teams, "استقلال خوزستان");
    expect(result?.id).toBe("team-1785484986454");
  });

  it("is stable regardless of array order", () => {
    const reversed = [...teams].reverse();
    expect(resolveTeam(reversed, "استقلال")?.id).toBe("team-1785483285455");
    expect(resolveTeam(reversed, "استقلال خوزستان")?.id).toBe("team-1785484986454");
  });

  it("normalizes Persian character variants", () => {
    const yVariants = [{ id: "t1", name: "میلاد" }, { id: "t2", name: "استقلال" }];
    expect(resolveTeam(yVariants, "ميلاد")?.id).toBe("t1");
  });

  it("picks the most specific (shortest) name for partial input", () => {
    const partial = resolveTeam(teams, "استقل");
    expect(partial?.name).toBe("استقلال");
  });

  it("returns null for unknown input", () => {
    expect(resolveTeam(teams, "باشگاه ناشناخته")).toBeNull();
    expect(resolveTeam(teams, "")).toBeNull();
    expect(resolveTeam([], "استقلال")).toBeNull();
  });
});

describe("isExactTeamName", () => {
  it("matches equal normalized names", () => {
    expect(isExactTeamName("استقلال", "استقلال")).toBe(true);
    expect(isExactTeamName("استقلال", "استقلال خوزستان")).toBe(false);
  });
});
