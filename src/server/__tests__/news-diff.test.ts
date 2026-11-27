import { describe, it, expect } from "vitest";
import { diffNewsRows } from "../services/database";

// Guards the incremental news persistence: a save must write only the rows
// whose serialized form changed, and delete only the ids that disappeared.
// Before this, every save restated all 5,105 rows (measured: 15,316 row
// updates for one create + edit + delete).

const row = (id: string, title: string, viewCount = 0) => ({
  id,
  title,
  summary: "s",
  content: "c",
  image: "i",
  gallery: [],
  read_more: null,
  category: "pro-league",
  tags: [],
  view_count: viewCount,
  created_at: "2026-01-01T00:00:00.000Z",
});

describe("diffNewsRows", () => {
  it("writes everything when nothing is known yet (fresh process)", () => {
    const rows = [row("a", "A"), row("b", "B")];
    const diff = diffNewsRows(rows, new Map());
    expect(diff.changed).toHaveLength(2);
    expect(diff.removed).toEqual([]);
    expect(diff.next.size).toBe(2);
  });

  it("writes nothing when the serialized rows are identical", () => {
    const rows = [row("a", "A"), row("b", "B")];
    const first = diffNewsRows(rows, new Map());
    const second = diffNewsRows(rows, first.next);
    expect(second.changed).toEqual([]);
    expect(second.removed).toEqual([]);
  });

  it("writes only the edited row", () => {
    const rows = [row("a", "A"), row("b", "B"), row("c", "C")];
    const first = diffNewsRows(rows, new Map());
    const edited = [row("a", "A"), row("b", "B-EDITED"), row("c", "C")];
    const second = diffNewsRows(edited, first.next);
    expect(second.changed.map((r) => r.id)).toEqual(["b"]);
  });

  it("detects a counter change without any other edit", () => {
    const rows = [row("a", "A", 5)];
    const first = diffNewsRows(rows, new Map());
    const second = diffNewsRows([row("a", "A", 6)], first.next);
    expect(second.changed.map((r) => r.id)).toEqual(["a"]);
  });

  it("deletes only ids that vanished", () => {
    const first = diffNewsRows([row("a", "A"), row("b", "B")], new Map());
    const second = diffNewsRows([row("a", "A")], first.next);
    expect(second.changed).toEqual([]);
    expect(second.removed).toEqual(["b"]);
    expect(second.next.has("b")).toBe(false);
  });

  it("is order-independent (array order is not a content change)", () => {
    const first = diffNewsRows([row("a", "A"), row("b", "B")], new Map());
    const reordered = diffNewsRows([row("b", "B"), row("a", "A")], first.next);
    expect(reordered.changed).toEqual([]);
    expect(reordered.removed).toEqual([]);
  });

  it("normalises numeric ids to strings", () => {
    const first = diffNewsRows([{ ...row("1", "A"), id: 1 }], new Map());
    const second = diffNewsRows([row("1", "A")], first.next);
    expect(second.changed).toEqual([]);
  });

  it("treats an emptied table as 'delete everything known'", () => {
    const first = diffNewsRows([row("a", "A"), row("b", "B")], new Map());
    const empty = diffNewsRows([], first.next);
    expect(empty.changed).toEqual([]);
    expect(empty.removed.sort()).toEqual(["a", "b"]);
    expect(empty.next.size).toBe(0);
  });
});
