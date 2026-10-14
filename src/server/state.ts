import path from "path";
import { INITIAL_DATABASE } from "./config";
import { sortNewsNewestFirst } from "../shared/newsSort";
import { logMessage } from "./utils/logger";

export let db: any = getInitialDatabase();

export function getInitialDatabase() {
  return JSON.parse(JSON.stringify(INITIAL_DATABASE));
}

export function loadDB() {
  return db;
}

export function setDb(newDb: any) {
  db = newDb;
  bumpDataRevision();
}

// Monotonic content revision for HTTP caching (ETag on /api/data).
// Bumped whenever served bytes may have changed: full object replacement
// (setDb), rollback (restoreDB), and every structural mutation batch
// (markTablesDirty in services/database). Deliberately NOT bumped by
// view/click counter flushes: counters are high-frequency and low-stakes,
// and bulk consumers already tolerate minutes-old data via their own TTL.
// A bump means "bytes may differ" (superset-safe); it never means "identical".
let dataRevision = 0;

export function getDataRevision(): number {
  return dataRevision;
}

export function bumpDataRevision(): number {
  dataRevision += 1;
  return dataRevision;
}

export function buildBulkEtag(revision: number): string {
  return `W/"rev-${revision}"`;
}

// Pure If-None-Match decision for the /api/data 304 path (unit-tested).
export function isBulkFresh(ifNoneMatch: unknown, etag: string): boolean {
  if (typeof ifNoneMatch !== "string") return false;
  const token = ifNoneMatch.trim();
  return token === etag || token === "*";
}

// First-paint slice for GET /api/data?lite=1. Pure function (unit-tested).
// Keeps every table the home first paint reads; drops the heavy
// admin/archive tables (media library, finished-game archives, feature-game
// drafts, admin inbox, movement history, lifecycle diagnostics); trims news
// to the newest LITE_NEWS_LIMIT FULL items — bodies intact so news detail
// pages keep working for anything reachable from the first paint.
export const LITE_NEWS_LIMIT = 60;

const LITE_DROPPED_TABLES = new Set([
  "media_files",
  "football_Finished_Games",
  "futsal_Finished_Games",
  "football_Now_Games",
  "futsal_Now_Games",
  "Feature_Games",
  "football_Feature_Games",
  "futsal_Feature_Games",
  "submissions",
  "playerMovements",
  "lifecycleEvents",
  "lifecycleReasons",
]);

export function buildLitePayload(db: any): any {
  const src = db || {};
  const lite: any = {};
  for (const key of Object.keys(src)) {
    if (!LITE_DROPPED_TABLES.has(key)) lite[key] = src[key];
  }
  const news = Array.isArray(src.news) ? src.news : [];
  lite.news = sortNewsNewestFirst(news).slice(0, LITE_NEWS_LIMIT);
  return lite;
}

export function snapshotDB(): any {
  return JSON.parse(JSON.stringify(db));
}

export function restoreDB(snapshot: any) {
  db = snapshot;
  bumpDataRevision();
  logMessage("warn", "general", "وضعیت دیتابیس به حالت قبل بازگردانده شد.");
}
