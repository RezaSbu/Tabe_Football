import { describe, it, expect } from "vitest";
import {
  MIN_MATCHES_FOR_POSITION_LIST,
  POSITION_GROUPS,
  POSITION_LIST_SIZE,
  buildPositionLeaders,
  positionGroupOf,
} from "../positionLeaders";

// Position lists must never crown a player on one good cameo: the min-3
// matches gate and the role bucketing are the whole point of this module.

const player = (over: Partial<any>) => ({
  id: "p",
  name: "بازیکن",
  team: "تیم",
  position: "هافبک",
  rating: 7,
  matches: 10,
  ...over,
});

describe("positionGroupOf", () => {
  it("publishes exactly the eight requested boards in the requested order", () => {
    expect(POSITION_GROUPS.map((g) => g.label)).toEqual([
      "دروازه‌بان",
      "مدافع",
      "مدافع چپ",
      "مدافع راست",
      "هافبک",
      "هافبک راست",
      "هافبک چپ",
      "مهاجم",
    ]);
    expect(POSITION_LIST_SIZE).toBe(5);
  });

  it("buckets every stored position label into a role", () => {
    expect(positionGroupOf("دروازه‌بان")).toBe("gk");
    expect(positionGroupOf("مدافع")).toBe("cb");
    expect(positionGroupOf("مدافع مرکزی")).toBe("cb");
    expect(positionGroupOf("مدافع چپ")).toBe("lb");
    expect(positionGroupOf("مدافع راست")).toBe("rb");
    expect(positionGroupOf("هافبک")).toBe("cm");
    expect(positionGroupOf("هافبک دفاعی")).toBe("cm");
    expect(positionGroupOf("هافبک هجومی")).toBe("cm");
    expect(positionGroupOf("هافبک چپ")).toBe("lm");
    expect(positionGroupOf("هافبک راست")).toBe("rm");
    expect(positionGroupOf("مهاجم")).toBe("fw");
    expect(positionGroupOf("مهاجم نوک")).toBe("fw");
  });

  it("maps stored wingers to their side, and side-less wingers to attack", () => {
    expect(positionGroupOf("وینگر چپ")).toBe("lm");
    expect(positionGroupOf("وینگر راست")).toBe("rm");
    expect(positionGroupOf("وینگر")).toBe("fw");
  });

  it("ignores unknown/empty positions", () => {
    expect(positionGroupOf("")).toBeNull();
    expect(positionGroupOf(null)).toBeNull();
    expect(positionGroupOf("سایر")).toBeNull();
  });
});

describe("buildPositionLeaders", () => {
  it("drops players below the minimum matches gate", () => {
    const groups = buildPositionLeaders([
      player({ id: "a", name: "ذخیره", position: "مهاجم", rating: 9.5, matches: MIN_MATCHES_FOR_POSITION_LIST - 1 }),
      player({ id: "b", name: "ثابت", position: "مهاجم", rating: 7.2, matches: MIN_MATCHES_FOR_POSITION_LIST }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].players.map((p) => p.id)).toEqual(["b"]);
  });

  it("includes players exactly at the gate", () => {
    const groups = buildPositionLeaders([player({ id: "edge", position: "دروازه‌بان", matches: 3 })]);
    expect(groups[0].players[0].id).toBe("edge");
  });

  it("ranks inside each role and keeps the groups separate", () => {
    const groups = buildPositionLeaders([
      player({ id: "gk1", position: "دروازه‌بان", rating: 7.9 }),
      player({ id: "cb1", position: "مدافع", rating: 7.4 }),
      player({ id: "fw1", position: "مهاجم", rating: 8.2 }),
      player({ id: "lm1", position: "وینگر چپ", rating: 7.1 }),
      player({ id: "rm1", position: "هافبک راست", rating: 7.6 }),
      player({ id: "cm1", position: "هافبک", rating: 8.6 }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["gk", "cb", "cm", "rm", "lm", "fw"]);
    expect(groups.find((g) => g.key === "cm")!.players[0].id).toBe("cm1");
    expect(groups.find((g) => g.key === "rm")!.players.map((p) => p.id)).toEqual(["rm1"]);
    expect(groups.find((g) => g.key === "lm")!.players.map((p) => p.id)).toEqual(["lm1"]);
    expect(groups.find((g) => g.key === "fw")!.players.map((p) => p.id)).toEqual(["fw1"]);
  });

  it("breaks rating ties by games played, then name", () => {
    const groups = buildPositionLeaders([
      player({ id: "few", name: "الف", position: "هافبک", rating: 8, matches: 4 }),
      player({ id: "many", name: "ب", position: "هافبک", rating: 8, matches: 12 }),
    ]);
    expect(groups[0].players.map((p) => p.id)).toEqual(["many", "few"]);
  });

  it("returns every eligible player by default so the UI can show all", () => {
    const rows = Array.from({ length: POSITION_LIST_SIZE + 3 }, (_, index) =>
      player({ id: `df${index}`, position: "مدافع", rating: 9 - index * 0.1 })
    );
    const groups = buildPositionLeaders(rows);
    expect(groups[0].players).toHaveLength(POSITION_LIST_SIZE + 3);
    expect(groups[0].players[0].id).toBe("df0");
  });

  it("honours an explicit per-role slice", () => {
    const groups = buildPositionLeaders(
      [
        player({ id: "1", position: "مدافع", rating: 8.5 }),
        player({ id: "2", position: "مدافع", rating: 8.1 }),
        player({ id: "3", position: "مدافع", rating: 7.8 }),
        player({ id: "4", position: "مدافع", rating: 7.2 }),
      ],
      { perGroup: 3 }
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].players.map((p) => p.id)).toEqual(["1", "2", "3"]);
  });

  it("skips players without a usable rating and does not mutate input", () => {
    const input = [
      player({ id: "zero", rating: 0 }),
      player({ id: "bad", rating: Number.NaN }),
      player({ id: "ok", rating: 7.5 }),
    ];
    const snapshot = JSON.stringify(input);
    const groups = buildPositionLeaders(input);
    expect(groups[0].players.map((p) => p.id)).toEqual(["ok"]);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("returns nothing when no candidate qualifies", () => {
    expect(buildPositionLeaders([])).toEqual([]);
    expect(buildPositionLeaders([player({ matches: 1 })])).toEqual([]);
  });
});
