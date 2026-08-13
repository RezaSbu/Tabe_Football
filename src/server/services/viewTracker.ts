import { saveDB } from "./database";
import { logMessage } from "../utils/logger";

export const VIEW_BOT_RE = /bot|crawl|spider|slurp|curl|wget|python|node|headless|axios|php|java|postman|monitoring/i;

const FLUSH_INTERVAL_MS = 60_000;

let viewFlushTimer: ReturnType<typeof setTimeout> | null = null;
let viewFlushDirty = false;

export function scheduleViewFlush() {
  if (viewFlushTimer) return;
  viewFlushTimer = setTimeout(async () => {
    viewFlushTimer = null;
    if (!viewFlushDirty) return;
    viewFlushDirty = false;
    try {
      await saveDB();
    } catch (e: any) {
      logMessage("error", "database", "خطا در ذخیره‌سازی شمارنده بازدید", e?.message || e);
    }
  }, FLUSH_INTERVAL_MS);
}

export function markViewDirty() {
  viewFlushDirty = true;
  scheduleViewFlush();
}
