import { Express, Request, Response } from "express";
import { loadDB, getDataRevision } from "../state";
import { compareNewsNewestFirst } from "../../shared/newsSort";
import { logMessage } from "../utils/logger";

const SITE_ORIGIN = "https://tabefotbal.ir";
const CACHE_TTL_MS = 60 * 60 * 1000;
// Sitemaps.org hard limit is 50k URLs / 50MB; stay safely below it.
const MAX_URLS = 45000;

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      let url = `  <url>\n    <loc>${escapeXml(e.loc)}</loc>\n`;
      if (e.lastmod) url += `    <lastmod>${escapeXml(e.lastmod)}</lastmod>\n`;
      if (e.changefreq) url += `    <changefreq>${escapeXml(e.changefreq)}</changefreq>\n`;
      if (e.priority !== undefined) url += `    <priority>${e.priority.toFixed(1)}</priority>\n`;
      return `${url}  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

// Live tab surfaces. Mirrors the retired static public/sitemap.xml, minus the
// three dead URLs (/futsal, /legionnaires, /predictions) plus /market, which
// is a live tab the static file never listed.
const TAB_ENTRIES: SitemapEntry[] = [
  { loc: `${SITE_ORIGIN}/`, changefreq: "daily", priority: 1.0 },
  { loc: `${SITE_ORIGIN}/news`, changefreq: "daily", priority: 0.9 },
  { loc: `${SITE_ORIGIN}/live-scores`, changefreq: "always", priority: 0.9 },
  { loc: `${SITE_ORIGIN}/pro-league`, changefreq: "weekly", priority: 0.8 },
  { loc: `${SITE_ORIGIN}/league-1`, changefreq: "weekly", priority: 0.7 },
  { loc: `${SITE_ORIGIN}/league-2`, changefreq: "weekly", priority: 0.6 },
  { loc: `${SITE_ORIGIN}/hazfi-cup`, changefreq: "weekly", priority: 0.7 },
  { loc: `${SITE_ORIGIN}/stats`, changefreq: "weekly", priority: 0.7 },
  { loc: `${SITE_ORIGIN}/transfers`, changefreq: "daily", priority: 0.8 },
  { loc: `${SITE_ORIGIN}/gallery`, changefreq: "weekly", priority: 0.5 },
  { loc: `${SITE_ORIGIN}/market`, changefreq: "weekly", priority: 0.6 },
];

// First ISO-like date wins; sitemap lastmod only needs the YYYY-MM-DD part.
function lastmodOf(item: any, fields: string[]): string {
  for (const field of fields) {
    const value = String(item?.[field] || "");
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  }
  return "";
}

// Pure given db (unit-tested). Newest content first so crawlers meet fresh
// URLs early even on a truncated fetch.
export function collectDetailEntries(db: any): SitemapEntry[] {
  const src = db || {};
  const entries: SitemapEntry[] = [];
  const news = [...((src.news || []) as any[])].sort(compareNewsNewestFirst);
  for (const item of news) {
    if (!item?.id) continue;
    entries.push({
      loc: `${SITE_ORIGIN}/news/${item.id}`,
      lastmod: lastmodOf(item, ["updatedAt", "createdAt"]) || undefined,
      changefreq: "weekly",
      priority: 0.6,
    });
  }
  const groups: { table: string; kind: string; dateFields: string[]; priority: number }[] = [
    { table: "teams", kind: "team", dateFields: [], priority: 0.6 },
    { table: "players", kind: "player", dateFields: [], priority: 0.6 },
    { table: "coaches", kind: "coach", dateFields: [], priority: 0.5 },
    { table: "matches", kind: "match", dateFields: ["date"], priority: 0.5 },
    { table: "images", kind: "gallery", dateFields: ["updatedAt", "createdAt"], priority: 0.5 },
  ];
  for (const group of groups) {
    const rows = ((src[group.table] || []) as any[]).filter((row) => row?.id);
    rows.sort((a, b) => lastmodOf(b, group.dateFields).localeCompare(lastmodOf(a, group.dateFields)));
    for (const row of rows) {
      entries.push({
        loc: `${SITE_ORIGIN}/${group.kind}/${row.id}`,
        lastmod: lastmodOf(row, group.dateFields) || undefined,
        changefreq: "weekly",
        priority: group.priority,
      });
    }
  }
  return entries;
}

export function registerSitemapRoutes(app: Express) {
  let cache: { revision: number; expires: number; xml: string } | null = null;
  app.get("/sitemap.xml", (_req: Request, res: Response) => {
    try {
      // dataRevision bumps on every structural mutation batch, so admin
      // edits (new/updated news) are visible in the sitemap immediately
      // instead of waiting out the TTL.
      const revision = getDataRevision();
      const now = Date.now();
      if (!cache || cache.revision !== revision || cache.expires <= now) {
        const entries = [...TAB_ENTRIES, ...collectDetailEntries(loadDB())].slice(0, MAX_URLS);
        cache = { revision, expires: now + CACHE_TTL_MS, xml: buildSitemapXml(entries) };
      }
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      return res.send(cache.xml);
    } catch (err) {
      logMessage("error", "general", "Sitemap build failed:", (err as Error).message || err);
      return res.status(500).type("txt").send("sitemap unavailable");
    }
  });
}
