import { describe, it, expect } from "vitest";
import { sortNewsNewestFirst } from "../../shared/newsSort";

describe("sortNewsNewestFirst", () => {
  it("orders ISO timestamps newest-first regardless of precision", () => {
    const rows = [
      { id: "a", createdAt: "2026-09-16" },
      { id: "b", createdAt: "2026-09-16T20:38:08.187Z" },
      { id: "c", createdAt: "2026-09-15T23:59:59.999Z" },
    ];
    expect(sortNewsNewestFirst(rows).map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("breaks exact ties by id descending (deterministic)", () => {
    const rows = [
      { id: "news-1", createdAt: "2026-09-16T10:00:00.000Z" },
      { id: "news-2", createdAt: "2026-09-16T10:00:00.000Z" },
    ];
    expect(sortNewsNewestFirst(rows).map((r) => r.id)).toEqual(["news-2", "news-1"]);
    // Stable across repeated runs regardless of input order.
    expect(sortNewsNewestFirst([...rows].reverse()).map((r) => r.id)).toEqual(["news-2", "news-1"]);
  });

  it("sinks missing or invalid dates instead of scattering", () => {
    const rows = [
      { id: "x", createdAt: "" },
      { id: "y", createdAt: "2026-09-16T10:00:00.000Z" },
      { id: "z" },
      { id: "w", createdAt: "not-a-date" },
    ];
    const out = sortNewsNewestFirst(rows).map((r) => r.id);
    expect(out[0]).toBe("y");
    expect(out.slice(1).sort()).toEqual(["w", "x", "z"]);
  });

  it("does not mutate the input array", () => {
    const rows = [{ id: "a", createdAt: "2026-09-14" }, { id: "b", createdAt: "2026-09-16" }];
    sortNewsNewestFirst(rows);
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
