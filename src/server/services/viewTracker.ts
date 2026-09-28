import { saveDB, markTablesDirty, type DirtyTable } from "./database";
import { logMessage } from "../utils/logger";

export const VIEW_BOT_RE = /bot|crawl|spider|slurp|curl|wget|python|node|headless|axios|php|java|postman|monitoring/i;

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
