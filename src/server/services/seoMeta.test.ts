import { describe, expect, it } from "vitest";

import { escapeHtml, injectSeoMeta, resolveDetailMeta, resolveSeoMeta, resolveTabMeta, toAbsoluteUrl } from "./seoMeta";

const SHELL = [
  "<!doctype html>",
  '<html lang="fa" dir="rtl">',
  "<head>",
  "<title>تب فوتبال | پورتال جامع فوتبال ایران</title>",
  '<meta name="description" content="generic" />',
  '<meta name="robots" content="index, follow" />',
  '<meta property="og:type" content="website" />',
  '<meta property="og:title" content="generic" />',
  '<meta property="og:description" content="generic" />',
  '<meta property="og:image" content="https://tabefotbal.ir/og-default.png" />',
  '<meta property="og:url" content="https://tabefotbal.ir" />',
  '<meta name="twitter:title" content="generic" />',
  '<meta name="twitter:description" content="generic" />',
  '<meta name="twitter:image" content="https://tabefotbal.ir/og-default.png" />',
  '<link rel="canonical" href="https://tabefotbal.ir" />',
  "</head>",
  "<body></body>",
  "</html>",
].join("\n");

const DB = {
  news: [
    { id: "news-1", title: "خبر $ مهم", summary: "خلاصه", image: "/uploads/a.jpg", createdAt: "2026-10-01T00:00:00Z" },
  ],
  teams: [{ id: "t1", name: "پرسپولیس", logo: "/uploads/logo.png" }],
  players: [{ id: "p1", name: "بازیکن", teamName: "پرسپولیس", image: "https://cdn.example.com/p.jpg" }],
  matches: [{ id: "m1", teamHome: "الف", teamAway: "ب", scoreHome: 2, scoreAway: 1, date: "2026-10-01", status: "ft" }],
  coaches: [{ id: "c1", name: "مربی" }],
  images: [{ id: "g1", title: "آلبوم", photos: [{ url: "/uploads/g.jpg" }] }],
};

describe("escapeHtml", () => {
  it("escapes tag-significant characters", () => {
    expect(escapeHtml('<a href="x">&')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;");
  });
});

describe("toAbsoluteUrl", () => {
  it("resolves relative paths against the site origin", () => {
    expect(toAbsoluteUrl("/uploads/a.jpg")).toBe("https://tabefotbal.ir/uploads/a.jpg");
  });

  it("keeps absolute urls and proxies varzesh3 relatively then absolutizes", () => {
    expect(toAbsoluteUrl("https://cdn.example.com/p.jpg")).toBe("https://cdn.example.com/p.jpg");
    expect(toAbsoluteUrl("https://www.varzesh3.com/x.jpg")).toBe(
      "https://tabefotbal.ir/api/image-proxy?url=https%3A%2F%2Fwww.varzesh3.com%2Fx.jpg"
    );
  });

  it("falls back for empty input", () => {
    expect(toAbsoluteUrl("")).toMatch(/^https:\/\//);
  });
});

describe("resolveTabMeta", () => {
  it("self-canonicalizes league tabs with unique titles", () => {
    const meta = resolveTabMeta("/pro-league");
    expect(meta?.canonical).toBe("https://tabefotbal.ir/pro-league");
    expect(meta?.title).toContain("لیگ برتر خلیج فارس");
    expect(resolveTabMeta("/league-2")?.title).not.toBe(meta?.title);
  });

  it("marks admin noindex", () => {
    expect(resolveTabMeta("/admin")?.robots).toBe("noindex, nofollow");
  });

  it("returns null for unknown paths", () => {
    expect(resolveTabMeta("/nope")).toBeNull();
  });
});

describe("resolveDetailMeta", () => {
  it("builds NewsArticle meta for news", () => {
    const meta = resolveDetailMeta("news", "news-1", DB);
    expect(meta?.canonical).toBe("https://tabefotbal.ir/news/news-1");
    expect(meta?.ogType).toBe("article");
    expect(meta?.ogImage).toBe("https://tabefotbal.ir/uploads/a.jpg");
    expect((meta?.jsonLd as any)?.["@type"]).toBe("NewsArticle");
  });

  it("builds match title from both sides and scores", () => {
    const meta = resolveDetailMeta("match", "m1", DB);
    expect(meta?.title).toContain("الف 2 - 1 ب");
    expect((meta?.jsonLd as any)?.["@type"]).toBe("SportsEvent");
  });

  it("resolves gallery cover from photos", () => {
    expect(resolveDetailMeta("gallery", "g1", DB)?.ogImage).toBe("https://tabefotbal.ir/uploads/g.jpg");
  });

  it("returns null for missing entities", () => {
    expect(resolveDetailMeta("news", "missing", DB)).toBeNull();
    expect(resolveDetailMeta("team", "missing", {})).toBeNull();
  });
});

describe("resolveSeoMeta", () => {
  it("strips trailing slashes and falls back to home for unknown paths", () => {
    expect(resolveSeoMeta("/news/", DB).canonical).toBe("https://tabefotbal.ir/news");
    expect(resolveSeoMeta("/unknown-path", DB).canonical).toBe("https://tabefotbal.ir/");
    expect(resolveSeoMeta("/news/missing", DB).canonical).toBe("https://tabefotbal.ir/");
  });
});

describe("injectSeoMeta", () => {
  it("injects unique head tags and keeps $ sequences literal", () => {
    const meta = resolveDetailMeta("news", "news-1", DB);
    const html = injectSeoMeta(SHELL, meta!);
    expect(html).toContain("<title>خبر $ مهم | تب فوتبال</title>");
    expect(html).toContain('<link rel="canonical" href="https://tabefotbal.ir/news/news-1" />');
    expect(html).toContain('"@type":"NewsArticle"');
    expect(html).not.toContain("<title>تب فوتبال | پورتال جامع فوتبال ایران</title>");
  });

  it("inserts missing tags instead of dropping them", () => {
    const bare = "<html><head></head><body></body></html>";
    const html = injectSeoMeta(bare, resolveTabMeta("/news")!);
    expect(html).toContain("<title>آخرین اخبار فوتبال ایران | تب فوتبال</title>");
    expect(html).toContain('rel="canonical"');
    expect(html).toContain("og:title");
  });
});
