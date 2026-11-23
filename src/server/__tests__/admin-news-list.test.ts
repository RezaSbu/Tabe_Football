import { describe, it, expect } from "vitest";
import { searchAdminNews, collectNewsTags } from "../routes/adminLists";

const mk = (id: string, createdAt: string, extra: Record<string, any> = {}) => ({
  id,
  title: `خبر ${id}`,
  summary: "خلاصه",
  createdAt,
  category: "pro-league",
  tags: [],
  ...extra,
});

// Newest first, 60 rows so pagination boundaries are meaningful.
const dataset = Array.from({ length: 60 }, (_, i) =>
  mk(
    `n${i}`,
    `2026-01-${String((i % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
    {
      category: i % 2 === 0 ? "pro-league" : "futsal",
      tags: i % 3 === 0 ? ["پرسپولیس"] : [],
    }
  )
);

describe("searchAdminNews", () => {
  it("returns only one page of rows with the newest first", () => {
    const page1 = searchAdminNews(dataset, { page: 1, limit: 20 });
    const page2 = searchAdminNews(dataset, { page: 2, limit: 20 });

    expect(page1.items).toHaveLength(20);
    expect(page1.total).toBe(60);
    expect(page1.totalPages).toBe(3);
    expect(page1.page).toBe(1);
    expect(page2.page).toBe(2);
    // No overlap between consecutive pages.
    const ids = new Set(page1.items.map((n: any) => n.id));
    expect(page2.items.every((n: any) => !ids.has(n.id))).toBe(true);
  });

  it("clamps the page into range instead of returning nothing", () => {
    const result = searchAdminNews(dataset, { page: 999, limit: 20 });
    expect(result.page).toBe(3);
    expect(result.items).toHaveLength(20);
  });

  it("filters by category", () => {
    const result = searchAdminNews(dataset, { category: "futsal", limit: 50 });
    expect(result.total).toBe(30);
    expect(result.items.every((n: any) => n.category === "futsal")).toBe(true);
  });

  it("searches title/summary/tags including Persian normalization", () => {
    expect(searchAdminNews(dataset, { q: "n7" }).total).toBe(1);
    expect(searchAdminNews(dataset, { q: "پرسپولیس" }).total).toBe(20);
    // Arabic/Persian yeh variants must match the stored Persian text.
    expect(searchAdminNews(dataset, { q: "پرسپوليس" }).total).toBe(20);
  });

  it("caps the page size so a caller cannot request everything", () => {
    expect(searchAdminNews(dataset, { limit: 10_000 }).limit).toBe(50);
    expect(searchAdminNews(dataset, { limit: 0 }).limit).toBe(20);
  });

  it("handles an empty corpus", () => {
    const result = searchAdminNews([], {});
    expect(result).toMatchObject({ items: [], total: 0, totalPages: 1, page: 1 });
  });
});

describe("collectNewsTags", () => {
  it("returns deduplicated sorted tags across every row", () => {
    const tags = collectNewsTags([
      { tags: ["لیگ برتر", "استقلال"] },
      { tags: ["استقلال", " "] },
      { tags: "not-an-array" },
      {},
      null,
    ]);
    expect(tags).toEqual(["استقلال", "لیگ برتر"]);
  });
});
