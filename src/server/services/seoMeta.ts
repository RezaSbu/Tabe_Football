// SEO faza2: server-side per-URL <head> meta for crawlers.
//
// The app is a pure CSR SPA: Express serves the same static index.html shell
// for every path, and the real title/canonical/og/JSON-LD only appears after
// JS + /api/detail fetches run in the browser. No-JS crawlers therefore see
// one duplicate page (canonical https://tabefotbal.ir) for the whole site —
// the root cause of the GSC "Duplicate / Alternate / Crawled-not-indexed"
// reports.
//
// This module injects the SAME meta the client Helmet blocks would render
// (SEO.tsx for tab surfaces, *DetailPage.tsx for detail surfaces) into the
// shell on the server, so each URL is self-canonical with a unique
// title/description. What users see never changes: React hydrates over it.
import fs from "fs";
import path from "path";

export const SITE_ORIGIN = "https://tabefotbal.ir";
export const SITE_NAME = "تب فوتبال";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-default.png`;
const IMAGE_FALLBACK = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800";

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  ogType: string;
  ogImage?: string;
  robots?: string;
  jsonLd?: unknown;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Client counterpart: getSafeImageUrl (src/utils.ts) applies the same
// proxy/relative rules, but crawlers need absolute URLs, so relative paths
// are resolved against SITE_ORIGIN here instead of staying relative.
export function toAbsoluteUrl(url: unknown): string {
  const raw = String(url ?? "").trim();
  if (!raw) return IMAGE_FALLBACK;
  let out = raw;
  if (raw.includes("varzesh3.com") || raw.includes("varzesh") || raw.includes("livescore")) {
    out = `/api/image-proxy?url=${encodeURIComponent(raw)}`;
  }
  if (/^https?:\/\//i.test(out)) return out;
  if (out.startsWith("/")) return `${SITE_ORIGIN}${out}`;
  return out;
}

interface TabDef {
  title: string;
  description: string;
  url: string;
  robots?: string;
  jsonLd?: unknown;
}

// Single source of truth mirrors App.tsx <SEO .../> props exactly.
const TAB_DEFS: Record<string, TabDef> = {
  "/": {
    title: "پورتال جامع فوتبال ایران",
    description:
      "پورتال جامع فوتبال ایران - اخبار لحظه‌ای، نتایج زنده، جدول رده‌بندی لیگ برتر، آمار بازیکنان، نقل و انتقالات",
    url: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "تب فوتبال",
      url: "https://tabefotbal.ir",
      description: "پورتال جامع فوتبال ایران",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://tabefotbal.ir/news?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  },
  "/live-scores": {
    title: "نتایج زنده فوتبال",
    description: "پیگیری نتایج زنده مسابقات فوتبال ایران و لیگ‌های مختلف به صورت لحظه‌ای",
    url: "/live-scores",
  },
  "/pro-league": {
    title: "لیگ برتر خلیج فارس",
    description: "جدول رده‌بندی، نتایج و آمار لیگ برتر خلیج فارس فوتبال ایران",
    url: "/pro-league",
  },
  "/league-1": {
    title: "لیگ دسته اول آزادگان",
    description: "جدول رده‌بندی و نتایج لیگ دسته اول فوتبال ایران (آزادگان)",
    url: "/league-1",
  },
  "/league-2": {
    title: "لیگ دسته دوم کشوری",
    description: "جدول رده‌بندی و نتایج لیگ دسته دوم فوتبال ایران",
    url: "/league-2",
  },
  "/hazfi-cup": {
    title: "جام حذفی فوتبال ایران",
    description: "نتایج و جدول مسابقات جام حذفی فوتبال ایران",
    url: "/hazfi-cup",
  },
  "/news": {
    title: "آخرین اخبار فوتبال ایران",
    description: "آخرین اخبار فوتبال ایران، لیگ برتر، نقل و انتقالات و اخبار ورزشی",
    url: "/news",
  },
  "/transfers": {
    title: "نقل و انتقالات فوتبال ایران",
    description: "آخرین اخبار نقل و انتقالات فوتبال ایران، لیگ برتر و لیگ یک",
    url: "/transfers",
  },
  "/gallery": {
    title: "گالری تصاویر فوتبال",
    description: "گالری تصاویر بازیکنان، مسابقات و رویدادهای فوتبال ایران",
    url: "/gallery",
  },
  "/stats": {
    title: "آمار بازیکنان فوتبال ایران",
    description: "آمار پیشرفته بازیکنان فوتبال ایران، گلزنان، پاسورها و بهترین بازیکنان فصل",
    url: "/stats",
  },
  "/market": {
    title: "ترنسفر مارکت فوتبال ایران",
    description: "جستجوی پیشرفته بازیکنان فوتبال ایران با فیلتر پست، باشگاه، لیگ، سن و ارزش بازار",
    url: "/market",
  },
  "/admin": {
    title: "پنل مدیریت",
    description: "پنل مدیریت پورتال تب فوتبال",
    url: "/admin",
    robots: "noindex, nofollow",
  },
};

export function resolveTabMeta(pathname: string): SeoMeta | null {
  const def = TAB_DEFS[pathname];
  if (!def) return null;
  return {
    title: `${def.title} | ${SITE_NAME}`,
    description: def.description,
    canonical: `${SITE_ORIGIN}${def.url}`,
    ogType: "website",
    ogImage: DEFAULT_IMAGE,
    robots: def.robots || "index, follow",
    jsonLd: def.jsonLd,
  };
}

export type DetailKind = "news" | "team" | "player" | "match" | "coach" | "gallery";

const DETAIL_TABLES: Record<DetailKind, string> = {
  news: "news",
  team: "teams",
  player: "players",
  match: "matches",
  coach: "coaches",
  gallery: "images",
};

function coverOf(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  const obj = value as { url?: unknown };
  return typeof obj.url === "string" ? obj.url : "";
}

// Mirrors the *DetailPage.tsx Helmet blocks. Pure given db (unit-tested);
// returns null when the entity is missing so callers fall back to the shell.
export function resolveDetailMeta(kind: DetailKind, id: string, db: any): SeoMeta | null {
  const table = (db || {})[DETAIL_TABLES[kind]] || [];
  const item = table.find((row: any) => String(row?.id) === String(id));
  if (!item) return null;
  const canonical = `${SITE_ORIGIN}/${kind}/${id}`;
  switch (kind) {
    case "news": {
      const description = item.summary || item.title || "";
      return {
        title: `${item.title || "خبر"} | ${SITE_NAME}`,
        description,
        canonical,
        ogType: "article",
        ogImage: toAbsoluteUrl(item.image),
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: item.title,
          description: item.summary,
          image: toAbsoluteUrl(item.image),
          datePublished: item.createdAt,
          publisher: { "@type": "Organization", name: SITE_NAME },
        },
      };
    }
    case "team":
      return {
        title: `${item.name} | ${SITE_NAME}`,
        description: `اطلاعات تیم ${item.name} - بازیکنان، نتایج و جدول رده‌بندی`,
        canonical,
        ogType: "sports_team",
        ogImage: toAbsoluteUrl(item.logo),
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "SportsTeam",
          name: item.name,
          sport: "Soccer",
          logo: toAbsoluteUrl(item.logo),
        },
      };
    case "player":
      return {
        title: `${item.name} | ${SITE_NAME}`,
        description: `پروفایل ${item.name} - بازیکن ${item.teamName || ""} - آمار و عملکرد`,
        canonical,
        ogType: "profile",
        ogImage: toAbsoluteUrl(item.image),
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Person",
          name: item.name,
          jobTitle: "فوتبالیست",
          image: toAbsoluteUrl(item.image),
        },
      };
    case "match": {
      const title = `${item.teamHome || "—"} ${item.scoreHome ?? ""} - ${item.scoreAway ?? ""} ${item.teamAway || "—"}`;
      return {
        title: `${title} | ${SITE_NAME}`,
        description: `نتیجه مسابقه ${item.teamHome} مقابل ${item.teamAway} - ${item.date || ""}`,
        canonical,
        ogType: "sports_event",
        ogImage: DEFAULT_IMAGE,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: `${item.teamHome} vs ${item.teamAway}`,
          startDate: item.date || undefined,
          eventStatus: item.status === "live" ? "https://schema.org/EventScheduled" : "https://schema.org/EventEnded",
        },
      };
    }
    case "coach":
      return {
        title: `${item.name} | ${SITE_NAME}`,
        description: `پروفایل مربی ${item.name}`,
        canonical,
        ogType: "profile",
        ogImage: toAbsoluteUrl(item.image),
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Person",
          name: item.name,
          jobTitle: "مربی فوتبال",
        },
      };
    case "gallery": {
      const photos = Array.isArray(item.photos) && item.photos.length > 0 ? item.photos : [];
      const cover = coverOf(photos[0]) || item.url || "";
      const title = item.title || item.caption || "گالری مصور فوتبال";
      const description = item.description || item.altText || title;
      return {
        title: `${title} | ${SITE_NAME}`,
        description,
        canonical,
        ogType: "article",
        ogImage: toAbsoluteUrl(cover),
        robots: "index, follow",
      };
    }
  }
}

export function resolveSeoMeta(pathname: string, db: any): SeoMeta {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const tab = resolveTabMeta(clean);
  if (tab) return tab;
  const match = clean.match(/^\/(news|team|player|match|coach|gallery)\/([^/]+)$/);
  if (match) {
    const detail = resolveDetailMeta(match[1] as DetailKind, decodeURIComponent(match[2]), db);
    if (detail) return detail;
  }
  // Unknown path or deleted entity: serve the generic shell (same as the
  // client, which renders its own loading/error state without Helmet).
  return resolveTabMeta("/") as SeoMeta;
}

function setMetaTag(shell: string, attr: "name" | "property", key: string, content: string): string {
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(`<meta ${attr}="${key}" content="[^"]*" \\/>`);
  if (pattern.test(shell)) return shell.replace(pattern, () => tag);
  return shell.replace("</head>", () => `${tag}\n</head>`);
}

// Pure string surgery on the index.html shell. Every replacement uses a
// replacer function so `$` sequences in Persian titles can never leak into
// RegExp replacement patterns.
export function injectSeoMeta(shell: string, meta: SeoMeta): string {
  let html = shell;
  if (/<title>[\s\S]*?<\/title>/.test(html)) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(meta.title)}</title>`);
  } else {
    html = html.replace("</head>", () => `<title>${escapeHtml(meta.title)}</title>\n</head>`);
  }
  html = setMetaTag(html, "name", "description", meta.description);
  html = setMetaTag(html, "name", "robots", meta.robots || "index, follow");
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`;
  if (/<link rel="canonical" href="[^"]*" \/>/.test(html)) {
    html = html.replace(/<link rel="canonical" href="[^"]*" \/>/, () => canonicalTag);
  } else {
    html = html.replace("</head>", () => `${canonicalTag}\n</head>`);
  }
  html = setMetaTag(html, "property", "og:type", meta.ogType);
  html = setMetaTag(html, "property", "og:title", meta.title);
  html = setMetaTag(html, "property", "og:description", meta.description);
  html = setMetaTag(html, "property", "og:image", meta.ogImage || DEFAULT_IMAGE);
  html = setMetaTag(html, "property", "og:url", meta.canonical);
  html = setMetaTag(html, "name", "twitter:title", meta.title);
  html = setMetaTag(html, "name", "twitter:description", meta.description);
  html = setMetaTag(html, "name", "twitter:image", meta.ogImage || DEFAULT_IMAGE);
  if (meta.jsonLd !== undefined) {
    const script = `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/<\//g, "<\\/")}</script>`;
    html = html.replace("</head>", () => `${script}\n</head>`);
  }
  return html;
}

// ---- tiny runtime (impure part kept minimal; everything above is pure) ----

let shellCache: string | null = null;

export function getSeoShell(distPath: string): string {
  if (shellCache !== null) return shellCache;
  shellCache = fs.readFileSync(path.join(distPath, "index.html"), "utf8");
  return shellCache;
}

const pageCache = new Map<string, { html: string; expires: number }>();
const PAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const PAGE_CACHE_MAX = 1000;

export function renderSeoPage(pathname: string, distPath: string, db: any): string {
  const meta = resolveSeoMeta(pathname, db);
  const now = Date.now();
  const hit = pageCache.get(meta.canonical);
  if (hit && hit.expires > now) return hit.html;
  const html = injectSeoMeta(getSeoShell(distPath), meta);
  if (pageCache.size >= PAGE_CACHE_MAX) pageCache.clear();
  pageCache.set(meta.canonical, { html, expires: now + PAGE_CACHE_TTL_MS });
  return html;
}

export function clearSeoCache(): void {
  shellCache = null;
  pageCache.clear();
}
