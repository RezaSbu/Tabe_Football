import { describe, it, expect } from "vitest";
import {
  EMPTY_FILTERS,
  applyMarketFilters,
  buildMarketRows,
  marketRowsToCsv,
  sortMarketRows,
  type MarketRow,
} from "./marketFilter";

function player(id: string, patch: any = {}): any {
  return {
    id,
    name: `بازیکن ${id}`,
    teamId: "t1",
    teamName: "تیم یک",
    position: "هافبک",
    age: 25,
    nationality: "ایرانی",
    foot: "راست",
    image: "",
    seasonStats: { matches: 5, goals: 1, assists: 1, averageRating: 7.0 },
    marketValue: { value: 1500000000, currency: "تومان", changePct: null, history: [] },
    ...patch,
  };
}

const teams = [{ id: "t1", name: "تیم یک" }];

function rowsOf(players: any[]): MarketRow[] {
  return buildMarketRows(players, teams as any);
}

describe("marketFilter", () => {
  it("builds rows with facets and skips futsal ids", () => {
    const rows = rowsOf([player("a"), { ...player("b"), id: "futsal-1" }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(1500000000);
    expect(rows[0].avg).toBe(7.0);
  });

  it("matches names with Persian normalization", () => {
    const rows = rowsOf([player("a", { name: "یاسر آسانی" }), player("b", { name: "دیگری" })]);
    const out = applyMarketFilters(rows, { ...EMPTY_FILTERS, query: "ياسر" });
    expect(out.map((r) => r.player.id)).toEqual(["a"]);
  });

  it("ANDs position, age range and value range", () => {
    const rows = rowsOf([
      player("a", { position: "هافبک", age: 25, marketValue: { value: 2000000000, currency: "ت", changePct: null, history: [] } }),
      player("b", { position: "مدافع", age: 25, marketValue: { value: 2000000000, currency: "ت", changePct: null, history: [] } }),
      player("c", { position: "هافبک", age: 35, marketValue: { value: 2000000000, currency: "ت", changePct: null, history: [] } }),
      player("d", { position: "هافبک", age: 25, marketValue: null }),
    ]);
    const out = applyMarketFilters(rows, {
      ...EMPTY_FILTERS,
      positions: ["هافبک"],
      ageMin: 20,
      ageMax: 30,
      valueMin: 1000000000,
      valueMax: 3000000000,
    });
    expect(out.map((r) => r.player.id)).toEqual(["a"]);
  });

  it("handles the value-missing modes", () => {
    const rows = rowsOf([player("a"), player("d", { marketValue: null })]);
    expect(applyMarketFilters(rows, { ...EMPTY_FILTERS, valueMissing: "only" }).map((r) => r.player.id)).toEqual(["d"]);
    expect(applyMarketFilters(rows, { ...EMPTY_FILTERS, valueMissing: "exclude" }).map((r) => r.player.id)).toEqual(["a"]);
  });

  it("sorts by stored TF rating", () => {
    const mk = (id: string, tf: number | undefined) => {
      const p = player(id);
      p.seasonStats = { ...p.seasonStats, tfRating: tf };
      return p;
    };
    const rows = rowsOf([mk("a", 83), mk("b", 91), mk("c", undefined)]);
    expect(sortMarketRows(rows, "tf", 1).map((r) => r.player.id)).toEqual(["b", "a", "c"]);
  });

  it("exports CSV with header, rows and BOM", () => {
    const rows = rowsOf([player("a", { name: "الف، تست" })]);
    const csv = marketRowsToCsv(rows);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split("\n");
    expect(lines[0].split(",")[0]).toBe("نام");
    expect(lines[1]).toContain('"الف، تست"');
    expect(lines[1].split(",").length).toBe(11);
  });

  it("sorts with nulls sinking", () => {
    const rows = rowsOf([
      player("a", { seasonStats: { matches: 5, goals: 0, assists: 0, averageRating: 6.0 }, marketValue: null }),
      player("b", { seasonStats: { matches: 5, goals: 0, assists: 0, averageRating: 8.0 }, marketValue: { value: 1000000000, currency: "ت", changePct: null, history: [] } }),
    ]);
    expect(sortMarketRows(rows, "rating", 1).map((r) => r.player.id)).toEqual(["b", "a"]);
    expect(sortMarketRows(rows, "value", 1).map((r) => r.player.id)).toEqual(["b", "a"]);
    expect(sortMarketRows(rows, "value", -1).map((r) => r.player.id)).toEqual(["b", "a"]);
  });
});
