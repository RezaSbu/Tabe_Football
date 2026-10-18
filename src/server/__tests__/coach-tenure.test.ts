import { describe, it, expect } from "vitest";
import { comparableDay, tenureIntervals, coachOfTeamAt, coachOfTeamAtDated } from "../../shared/coachTenure";

describe("comparableDay", () => {
  it("maps the live movement date 2026-09-23 to Jalali 1405-07-01", () => {
    expect(comparableDay("2026-09-23")).toBe(comparableDay("1405-07-01"));
  });

  it("maps 2026-09-24 to 1405-07-02 (Tartar transfer day)", () => {
    expect(comparableDay("2026-09-24")).toBe(comparableDay("1405-07-02"));
  });

  it("anchors Nowruz 1405-01-01 to 2026-03-21", () => {
    expect(comparableDay("1405-01-01")).toBe(comparableDay("2026-03-21"));
  });

  it("orders across calendars and rejects garbage", () => {
    expect(comparableDay("2026-01-01")! < comparableDay("2026-09-24")!).toBe(true);
    expect(comparableDay("1405-01-01")! < comparableDay("1405-07-02")!).toBe(true);
    expect(comparableDay(null)).toBeNull();
    expect(comparableDay("")).toBeNull();
    expect(comparableDay("آینده")).toBeNull();
    expect(comparableDay("2026-13-99")).toBeNull();
  });
});

const PER = "t-pers";
const EST = "t-est";

describe("tenureIntervals", () => {
  it("legacy holder without movements spans infinity (old behavior preserved)", () => {
    expect(tenureIntervals("c", EST, [], EST)).toEqual([{ from: null, to: null }]);
    expect(tenureIntervals("c", PER, [], EST)).toEqual([]);
  });

  it("single transfer bounds both sides", () => {
    const mv = [{ coachId: "x", fromTeamId: PER, toTeamId: EST, movementDate: "2026-09-24" }];
    const dMove = comparableDay("2026-09-24")!;
    // X now at EST: Persepolis interval closed at move, Esteghlal open since.
    expect(tenureIntervals("x", PER, mv, EST)).toEqual([{ from: null, to: dMove }]);
    expect(tenureIntervals("x", EST, mv, EST)).toEqual([{ from: dMove, to: null }]);
  });

  it("serial stints pair chronologically (X->B, B->C, C->B)", () => {
    const mv = [
      { coachId: "x", fromTeamId: "A", toTeamId: "B", movementDate: "2026-01-01" },
      { coachId: "x", fromTeamId: "B", toTeamId: "C", movementDate: "2026-06-01" },
      { coachId: "x", fromTeamId: "C", toTeamId: "B", movementDate: "2026-09-01" },
    ];
    const ivs = tenureIntervals("x", "B", mv, "B");
    expect(ivs).toHaveLength(2);
    expect(ivs[0]).toEqual({ from: comparableDay("2026-01-01"), to: comparableDay("2026-06-01") });
    expect(ivs[1]).toEqual({ from: comparableDay("2026-09-01"), to: null });
  });

  it("release closes at release date; undated rows are ignored", () => {
    const mv = [
      { coachId: "x", fromTeamId: PER, toTeamId: EST, movementDate: "2026-01-01" },
      { coachId: "x", fromTeamId: EST, toTeamId: null, movementDate: "2026-05-01" },
      { coachId: "x", fromTeamId: null, toTeamId: "C", movementDate: null },
    ];
    expect(tenureIntervals("x", EST, mv, "C")).toEqual([
      { from: comparableDay("2026-01-01"), to: comparableDay("2026-05-01") },
    ]);
  });
});

describe("coachOfTeamAt (Tartar scenario)", () => {
  const coaches = [
    { id: "tartar", teamId: EST },
    { id: "sohrab", teamId: null },
  ];
  const movements = [
    { coachId: "tartar", fromTeamId: PER, toTeamId: EST, movementDate: "2026-09-24" },
    { coachId: "sohrab", fromTeamId: EST, toTeamId: null, movementDate: "2026-09-24" },
  ];

  it("pre-transfer Persepolis matches resolve to Tartar", () => {
    expect(coachOfTeamAt(PER, "2026-09-10", coaches, movements)).toBe("tartar");
    expect(coachOfTeamAt(PER, "1405-06-20", coaches, movements)).toBe("tartar");
  });

  it("post-transfer Esteghlal matches resolve to Tartar, Sohrab keeps his past", () => {
    expect(coachOfTeamAt(EST, "2026-09-25", coaches, movements)).toBe("tartar");
    expect(coachOfTeamAt(EST, "2026-09-10", coaches, movements)).toBe("sohrab");
  });

  it("vacancy returns null instead of misattributing", () => {
    expect(coachOfTeamAt(PER, "2026-09-25", coaches, movements)).toBeNull();
  });

  it("unparseable date returns null (caller falls back to holder)", () => {
    expect(coachOfTeamAt(EST, null, coaches, movements)).toBeNull();
    expect(coachOfTeamAt(EST, "", coaches, movements)).toBeNull();
  });

  it("ledger governs where it speaks; legacy fills only silence", () => {
    // cN holds EST today but has no movements; ledger covers EST fully.
    const cs = [
      { id: "tartar", teamId: EST },
      { id: "sohrab", teamId: null },
      { id: "legacy", teamId: EST },
    ];
    // 2026-09-10 belongs to Sohrab's span -> legacy must NOT steal it.
    expect(coachOfTeamAt(EST, "2026-09-10", cs, movements)).toBe("sohrab");
    // 2026-09-30 belongs to Tartar's open span -> his.
    expect(coachOfTeamAt(EST, "2026-09-30", cs, movements)).toBe("tartar");
  });

  it("same-name coaches resolve independently by id", () => {
    const cs = [
      { id: "n1", teamId: "A" },
      { id: "n2", teamId: "B" },
    ];
    // Names never enter tenure logic; ids decide.
    expect(coachOfTeamAt("A", "2026-03-01", cs, [])).toBe("n1");
    expect(coachOfTeamAt("B", "2026-03-01", cs, [])).toBe("n2");
    expect(coachOfTeamAt("A", "2026-03-01", [{ id: "n2", teamId: "B" }], [])).toBeNull();
  });
});

// Zob Ahan scenario: Vaezi released, Rabei appointed. The post-transfer
// fixture was CREATED before the swap, so it still carries HIS stamp. The
// dated ledger is the human truth for the match date and must outrank the
// stale stamp — the old (stamp-first) attribution credited the fixture to
// the departed coach and dropped it from the incoming one.
describe("coachOfTeamAtDated (Vaezi/Rabei stale-stamp scenario)", () => {
  const coaches = [
    { id: "vaezi", teamId: null },
    { id: "rabei", teamId: "t-zob" },
  ];
  const movements = [
    { coachId: "vaezi", fromTeamId: "t-zob", toTeamId: null, movementDate: "2026-10-14" },
    { coachId: "rabei", fromTeamId: null, toTeamId: "t-zob", movementDate: "2026-10-14" },
  ];
  // Fixture created before the swap: stamp survived from the old mapping.
  const match = { teamHomeId: "t-zob", date: "2026-10-16", coachHomeId: "vaezi" };

  it("a stamp cannot keep a fixture that the dated ledger already owned", () => {
    expect(coachOfTeamAtDated("t-zob", match.date, coaches, movements)).toBe("rabei");
    // Legacy-only edge of the same team-date must also not fall back inside
    // the resolver: coverage is dated, so the answer is final.
    expect(coachOfTeamAtDated("t-zob", match.date, [coaches[1]], movements)).toBe("rabei");
  });

  it("pre-transfer fixtures keep their coach under the same rule", () => {
    expect(coachOfTeamAtDated("t-zob", "2026-10-10", coaches, movements)).toBe("vaezi");
  });

  it("real vacancy between two dated intervals returns null (no stamp rescue)", () => {
    const gapMovements = [
      { coachId: "a1", fromTeamId: "t-g", toTeamId: null, movementDate: "2026-01-01" },
      { coachId: "b1", fromTeamId: null, toTeamId: "t-g", movementDate: "2026-03-01" },
    ];
    expect(coachOfTeamAtDated("t-g", "2026-02-10", [{ id: "a1", teamId: null }, { id: "b1", teamId: "t-g" }], gapMovements)).toBeNull();
  });

  it("a team without any dated coverage is silent: null, caller falls back to stamps", () => {
    expect(coachOfTeamAtDated("t-z", "2026-10-16", [{ id: "rabei", teamId: "t-z" }], [])).toBeNull();
    expect(coachOfTeamAtDated("t-z", "بدون تاریخ", coaches, movements)).toBeNull();
  });
});
