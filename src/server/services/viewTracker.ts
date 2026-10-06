import { saveDB, markTablesDirty, type DirtyTable } from "./database";
import { loadDB } from "../state";
import { logMessage } from "../utils/logger";
import { VIEW_MULTIPLIER } from "../config";

export const VIEW_BOT_RE = /bot|crawl|spider|slurp|curl|wget|python|node|headless|axios|php|java|postman|monitoring/i;

// Display batching: one real visit is recorded instantly into a pending
// bucket, but the public counter only moves every VIEW_BATCH_MS (30 min).
// This keeps per-request work O(1) and avoids a visible +N jump on every
// click. Each recorded visit is worth VIEW_MULTIPLIER when applied.
export const VIEW_BATCH_MS = 30 * 60 * 1000;

const pendingViews = new Map<string, number>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleBatch() {
  if (batchTimer) return;
  batchTimer = setTimeout(() => {
    batchTimer = null;
    void flushViewCountsNow().catch((e: any) =>
      logMessage("error", "database", "خطا در اعمال دسته‌ای بازدیدها", e?.message || e)
    );
  }, VIEW_BATCH_MS);
}

export function recordView(table: DirtyTable, id: string): number {
  const key = `${table}:${String(id)}`;
  const next = (pendingViews.get(key) || 0) + 1;
  pendingViews.set(key, next);
  scheduleBatch();
  return next;
}

export function pendingViewTotal(): number {
  let total = 0;
  for (const n of pendingViews.values()) total += n;
  return total;
}

function findViewItem(db: any, table: string, id: string): any {
  const byId = (list: any[]) => (Array.isArray(list) ? list.find((x: any) => String(x?.id) === String(id)) : null);
  switch (table) {
    case "news": return byId(db.news);
    case "transfers": return byId(db.transfers);
    case "legionnaires": return byId(db.legionnaires);
    case "images": return byId(db.images);
    case "teams": return byId(db.teams);
    case "players": return byId(db.players);
    case "coaches": return byId(db.coaches);
    case "matches": {
      for (const key of Object.keys(db || {})) {
        if (!key.endsWith("_Games") && key !== "matches") continue;
        const hit = byId(db[key]);
        if (hit) return hit;
      }
      return null;
    }
    default: return null;
  }
}

// Applies every pending visit (count x VIEW_MULTIPLIER) and persists the
// counters. Idempotent: an empty bucket is a no-op. Also used by the
// admin flush endpoint and tests.
export async function flushViewCountsNow(): Promise<{ applied: number }> {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  const entries = [...pendingViews.entries()];
  pendingViews.clear();
  if (entries.length === 0) return { applied: 0 };
  const db = loadDB();
  const tables = new Set<DirtyTable>();
  let applied = 0;
  for (const [key, count] of entries) {
    const sep = key.indexOf(":");
    const table = key.slice(0, sep);
    const id = key.slice(sep + 1);
    const item = findViewItem(db, table, id);
    if (item) {
      item.viewCount = (item.viewCount || 0) + count * VIEW_MULTIPLIER;
      applied += count;
      tables.add(table as DirtyTable);
    }
  }
  if (tables.size > 0) markViewDirty(...tables);
  return { applied };
}

const FLUSH_INTERVAL_MS = 60_000;

let viewFlushTimer: ReturnType<typeof setTimeout> | null = null;
let viewFlushDirty = false;
const viewFlushTables = new Set<DirtyTable>();

export function scheduleViewFlush() {
  if (viewFlushTimer) return;
  viewFlushTimer = setTimeout(async () => {
    viewFlushTimer = null;
    if (!viewFlushDirty) return;
    viewFlushDirty = false;
    // View counters never affect stats: persist counters only, skip the
    // full recompute that the old bare saveDB() paid every minute.
    const tables = [...viewFlushTables] as Array<DirtyTable | "all">;
    viewFlushTables.clear();
    try {
      await saveDB({ skipRecalc: true, tables: tables.length > 0 ? tables : undefined });
    } catch (e: any) {
      logMessage("error", "database", "خطا در ذخیره‌سازی شمارنده بازدید", e?.message || e);
    }
  }, FLUSH_INTERVAL_MS);
}

export function markViewDirty(...tables: DirtyTable[]) {
  for (const t of tables) viewFlushTables.add(t);
  viewFlushDirty = true;
  scheduleViewFlush();
}
