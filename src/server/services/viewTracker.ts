import { saveDB, type DirtyTable } from "./database";
import { dbQuery } from "../db";
import { dbLock } from "../utils/concurrency";
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

// Only these tables actually have a persisted view_count column (verified
// against information_schema, 2026-11-27). Teams/players/coaches/matches do
// not: a view there used to mark the whole table dirty, which rewrote every
// row of a 1,620-row table on the next flush and still lost the counter at
// restart. They stay in memory only and are no longer written.
export const VIEW_COUNT_TABLES: readonly DirtyTable[] = ["news", "transfers", "legionnaires", "images"];

export interface CounterRow {
  table: DirtyTable;
  id: string;
  count: number;
}

// One UPDATE per table instead of a full upsert + DELETE NOT IN. Two article
// views used to restate all 5,105 news rows (measured: n_tup_upd +5,105);
// this touches exactly the rows that changed.
export function buildViewCounterUpdates(rows: CounterRow[]): Array<{ table: DirtyTable; sql: string; params: any[] }> {
  const allowed = new Set(VIEW_COUNT_TABLES);
  const byTable = new Map<DirtyTable, CounterRow[]>();
  for (const row of rows) {
    if (!allowed.has(row.table)) continue;
    const list = byTable.get(row.table);
    if (list) list.push(row);
    else byTable.set(row.table, [row]);
  }
  const out: Array<{ table: DirtyTable; sql: string; params: any[] }> = [];
  for (const [table, list] of byTable) {
    out.push({
      table,
      // Table name comes from the whitelist above, never from a request.
      sql: `UPDATE ${table} AS t SET view_count = v.cnt
              FROM (SELECT unnest($1::text[]) AS id, unnest($2::int[]) AS cnt) AS v
             WHERE t.id = v.id`,
      params: [list.map((r) => String(r.id)), list.map((r) => r.count)],
    });
  }
  return out;
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
  const counters: CounterRow[] = [];
  const memoryOnly = new Set<DirtyTable>();
  let applied = 0;
  for (const [key, count] of entries) {
    const sep = key.indexOf(":");
    const table = key.slice(0, sep);
    const id = key.slice(sep + 1);
    const item = findViewItem(db, table, id);
    if (!item) continue;
    item.viewCount = (item.viewCount || 0) + count * VIEW_MULTIPLIER;
    applied += count;
    const known = table as DirtyTable;
    if (VIEW_COUNT_TABLES.includes(known)) counters.push({ table: known, id, count: item.viewCount });
    else memoryOnly.add(known);
  }
  if (counters.length > 0) {
    const statements = buildViewCounterUpdates(counters);
    try {
      // Serialised with saveDB: a full-table upsert taken from an older
      // in-memory snapshot must not overwrite a newer counter.
      await dbLock.acquire(async () => {
        for (const s of statements) await dbQuery(s.sql, s.params);
      });
    } catch (e: any) {
      // Durability fallback: let the periodic save restate the whole table.
      const tables = [...new Set(counters.map((c) => c.table))];
      logMessage("error", "database", "خطا در ذخیره شمارنده بازدید؛ بازگشت به ذخیره کامل", e?.message || e);
      markViewDirty(...tables);
    }
  }
  if (memoryOnly.size > 0) {
    logMessage("info", "database", `بازدید ${[...memoryOnly].join("، ")} ستون ذخیره‌سازی ندارد؛ فقط در حافظه ثبت شد.`);
  }
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
