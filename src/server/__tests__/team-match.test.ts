import { describe, it, expect } from "vitest";
import { resolveTeam, isExactTeamName, resolveTeamLeague, normalizeLeagueKey } from "../../shared/teamMatch";

const teams = [
  { id: "team-1785484986454", name: "استقلال خوزستان", logo: "khuzestan.png", divisionKey: "pro-league" },
  { id: "team-1785483285455", name: "استقلال", logo: "esteghlal.png", divisionKey: "pro-league" },
  { id: "team-gol-gohar", name: "گل گهر سیرجان", divisionKey: "pro-league" },
  { id: "futsal-sun", name: "سونگون", divisionKey: "futsal" },
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

describe("resolveTeamLeague", () => {
  it("inherits divisionKey from a team record matched by id", () => {
    expect(resolveTeamLeague(teams, "team-gol-gohar")).toBe("pro-league");
  });

  it("resolves a short name like 'گل گهر' to its record and current division", () => {
    expect(resolveTeamLeague(teams, "", "گل گهر")).toBe("pro-league");
    expect(resolveTeamLeague(teams, undefined, "گل گهر")).toBe("pro-league");
  });

  it("resolves overlapping names to the exact team", () => {
    expect(resolveTeamLeague(teams, "", "استقلال")).toBe("pro-league");
    expect(resolveTeamLeague(teams, "", "استقلال خوزستان")).toBe("pro-league");
  });

  it("returns null when no record carries a divisionKey", () => {
    expect(resolveTeamLeague([{ id: "t1", name: "بدون لیگ" }], "", "بدون لیگ")).toBeNull();
    expect(resolveTeamLeague([], "", "گل گهر")).toBeNull();
  });
});

describe("normalizeLeagueKey", () => {
  it("collapses league-2 groups into league-2", () => {
    expect(normalizeLeagueKey("league-2-group-a")).toBe("league-2");
    expect(normalizeLeagueKey("league-2-group-b")).toBe("league-2");
    expect(normalizeLeagueKey("league-1")).toBe("league-1");
    expect(normalizeLeagueKey("pro-league")).toBe("pro-league");
    expect(normalizeLeagueKey(null)).toBe("");
  });
});
