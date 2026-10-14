import { describe, expect, it } from "vitest";

import { buildSitemapXml, collectDetailEntries, escapeXml } from "./sitemap";

const DB = {
  news: [
    { id: "news-old", title: "قدیمی", createdAt: "2026-09-01T00:00:00Z" },
    { id: "news-new", title: "جدید & داغ", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z" },
    { id: "", title: "بدون شناسه" },
  ],
  teams: [{ id: "t1", name: "تیم" }],
  players: [],
  coaches: [{ id: "c1", name: "مربی" }],
  matches: [{ id: "m1", teamHome: "الف", teamAway: "ب", date: "2026-09-22" }],
  images: [{ id: "g1", createdAt: "2026-08-12T09:19:16.231Z" }],
};

describe("escapeXml", () => {
  it("escapes markup-significant characters", () => {
    expect(escapeXml('<a href="x">&\'')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&apos;");
  });
});

describe("collectDetailEntries", () => {
  it("lists every entity table with kind-prefixed locs", () => {
    const locs = collectDetailEntries(DB).map((e) => e.loc);
    expect(locs).toContain("https://tabefotbal.ir/news/news-new");
    expect(locs).toContain("https://tabefotbal.ir/team/t1");
    expect(locs).toContain("https://tabefotbal.ir/coach/c1");
    expect(locs).toContain("https://tabefotbal.ir/match/m1");
    expect(locs).toContain("https://tabefotbal.ir/gallery/g1");
  });

  it("orders news newest-first and prefers updatedAt for lastmod", () => {
    const entries = collectDetailEntries(DB);
    expect(entries[0].loc).toBe("https://tabefotbal.ir/news/news-new");
    expect(entries[0].lastmod).toBe("2026-10-02");
    expect(entries[1].lastmod).toBe("2026-09-01");
  });

  it("skips rows without ids and omits lastmod when dateless", () => {
    const entries = collectDetailEntries(DB);
    expect(entries.some((e) => e.loc.endsWith("/"))).toBe(false);
    expect(entries.find((e) => e.loc.endsWith("/team/t1"))?.lastmod).toBeUndefined();
    expect(entries.find((e) => e.loc.endsWith("/match/m1"))?.lastmod).toBe("2026-09-22");
  });
});

describe("buildSitemapXml", () => {
  it("emits a valid urlset with escaped locs", () => {
    const xml = buildSitemapXml([
      { loc: "https://tabefotbal.ir/", changefreq: "daily", priority: 1.0 },
      { loc: "https://tabefotbal.ir/news/a&b", lastmod: "2026-10-01" },
    ]);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://tabefotbal.ir/news/a&amp;b</loc>");
    expect(xml).toContain("<lastmod>2026-10-01</lastmod>");
    expect(xml).toContain("<priority>1.0</priority>");
  });
});
