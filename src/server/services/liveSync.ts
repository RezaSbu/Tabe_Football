/**
 * liveSync.ts — Polling engine for live match data from Varzesh3.
 *
 * Features:
 *  - Auto mode: starts polling when match time arrives, stops at full-time
 *  - Smart half-time detection: pauses during half-time, resumes after
 *  - Admin override protection: respects admin_overrides fields
 *  - Event diffing: only new events are appended, never overwritten
 *  - 5-minute polling interval by default
 *  - No requests before scheduled match time
 */

import { loadDB } from "../state";
import { logMessage } from "../utils/logger";
import { parseVarzesh3HTML, fetchVarzesh3Page, type ParsedMatchData } from "../utils/matchSourceParser";
import { updateMatchInDb, saveDB } from "./database";

interface LivePollState {
  matchId: string;
  varzesh3Url: string;
  intervalMs: number;
  timer: ReturnType<typeof setInterval> | null;
  startTimer: ReturnType<typeof setTimeout> | null;
  status: "pending" | "active" | "half-time" | "finished" | "stopped" | "error";
  lastPollAt: string | null;
  lastError: string | null;
  pollCount: number;
}

const activePolls = new Map<string, LivePollState>();

const DEFAULT_INTERVAL_SEC = 300;
const HALFTIME_CHECK_INTERVAL_SEC = 60;

function findMatch(matchId: string): any | null {
  const db = loadDB();
  for (const sp of ["football", "futsal"]) {
    for (const st of ["Feature_Games", "Now_Games", "Finished_Games"]) {
      const list = db[`${sp}_${st}`] || [];
      const found = list.find((m: any) => String(m.id) === String(matchId));
      if (found) return found;
    }
  }
  return null;
}

function jalaliToGregorianDate(jalaliDate: string, time: string): Date | null {
  try {
    const clean = jalaliDate.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const [jy, jm, jd] = clean.split("/").map(Number);
    const [hour, minute] = (time || "0:0").split(":").map(Number);
    if (!jy || !jm || !jd) return null;

    const jy_epoch = jy - 979;
    let j_days = 365 * jy_epoch + Math.floor(jy_epoch / 33) * 8 + Math.floor(((jy_epoch % 33) + 3) / 4);
    for (let i = 0; i < jm - 1; ++i) j_days += i < 6 ? 31 : 30;
    j_days += jd - 1;
    const g_days = j_days + 79;

    let gy = 1600 + 400 * Math.floor(g_days / 146097);
    let rem = g_days % 146097;
    let leap = 1;
    if (rem >= 36525) { rem -= 1; gy += 100 * Math.floor(rem / 36524); rem = rem % 36524; if (rem >= 365) rem += 1; else leap = 0; }
    gy += 4 * Math.floor(rem / 1461); rem = rem % 1461;
    if (rem >= 366) { leap = 0; rem -= 1; gy += Math.floor(rem / 365); rem = rem % 365; }
    else leap = 1;

    const g_m_d = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm = 1;
    let gd = rem + 1;
    for (let i = 0; i < 12; ++i) { if (gd <= g_m_d[i]) break; gd -= g_m_d[i]; gm++; }

    return new Date(gy, gm - 1, gd, hour || 0, minute || 0, 0, 0);
  } catch {
    return null;
  }
}

function parseMatchDate(match: any): Date | null {
  if (!match.date) return null;

  const dateStr = match.date;
  const timeStr = (match.time || "").replace(/[۰-۹]/g, (d: string) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [h, m] = (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) ? timeStr.split(":").map(Number) : [18, 0];
    try {
      const d = new Date(dateStr + "T" + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":00.000Z");
      if (!isNaN(d.getTime())) return d;
    } catch {}
  }

  if (dateStr.includes("T")) {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d;
    } catch {}
  }

  return jalaliToGregorianDate(dateStr, match.time || "0:0");
}

function isMatchScheduledFuture(match: any): boolean {
  const matchDate = parseMatchDate(match);
  return matchDate ? matchDate.getTime() > Date.now() : false;
}

function getMsUntilMatchStart(match: any): number {
  const matchDate = parseMatchDate(match);
  return matchDate ? Math.max(0, matchDate.getTime() - Date.now()) : 0;
}

function detectHalfTime(match: any, parsedData: ParsedMatchData): boolean {
  if (match.status !== "live") return false;
  const v3 = (parsedData as any);
  if (v3.v3Status === 1) return true;
  const minute = parsedData.currentMinute || match.minutes || "";
  if (typeof minute === "string") {
    if (minute.includes("+")) return false;
    const num = parseInt(minute, 10);
    if (num >= 45 && num <= 47) return true;
  }
  return false;
}

function detectFullTime(match: any, parsedData: ParsedMatchData): boolean {
  const v3 = (parsedData as any);
  if (v3.v3Status === 3) return true;
  if (parsedData.stats && typeof parsedData.stats === "object" && Object.keys(parsedData.stats).length > 0) return true;
  const minute = parsedData.currentMinute || match.minutes || "";
  if (typeof minute === "string") {
    const num = parseInt(minute, 10);
    if (num >= 90) return true;
  }
  return false;
}

function mergeNewEvents(currentEvents: any[], newEvents: any[]): any[] {
  if (!currentEvents || currentEvents.length === 0) return newEvents || [];
  if (!newEvents || newEvents.length === 0) return currentEvents;

  const existingIds = new Set(
    currentEvents.filter((e: any) => e.id).map((e: any) => String(e.id))
  );

  const fresh = newEvents.filter((e: any) => {
    if (e.id && existingIds.has(String(e.id))) return false;
    return true;
  });

  if (fresh.length > 0) {
    logMessage("info", "sync", `Event diff: ${fresh.length} new events found`);
  }

  return [...currentEvents, ...fresh];
}

async function pollOnce(state: LivePollState): Promise<void> {
  const match = findMatch(state.matchId);
  if (!match) {
    logMessage("warn", "sync", `Match ${state.matchId} not found, stopping poll`);
    stopPoll(state.matchId);
    return;
  }

  if (match.status === "finished" || match.syncMode === "off") {
    logMessage("info", "sync", `Match ${state.matchId} finished/off, stopping poll`);
    stopPoll(state.matchId);
    return;
  }

  state.status = "active";
  state.pollCount++;

  try {
    const html = await fetchVarzesh3Page(state.varzesh3Url);
    const parseResult = parseVarzesh3HTML(html);

    if (!parseResult.success || !parseResult.data) {
      state.lastError = parseResult.error || "Parse failed";
      logMessage("warn", "sync", `Poll #${state.pollCount} for match ${state.matchId}: ${state.lastError}`);
      updateMatchInDb(state.matchId, {
        syncStatus: "error",
        lastSyncAt: new Date().toISOString(),
      });
      return;
    }

    const data = parseResult.data;

    if (detectHalfTime(match, data)) {
      state.status = "half-time";
      logMessage("info", "sync", `Match ${state.matchId}: HALF-TIME detected, pausing poll`);
      updateMatchInDb(state.matchId, {
        syncStatus: "half-time",
        lastSyncAt: new Date().toISOString(),
      });
      await saveDB();
      return;
    }

    if ((state.status as string) === "half-time") {
      const currentMinute = parseInt(match.minutes || "0", 10);
      if (currentMinute > 45) {
        state.status = "active";
        logMessage("info", "sync", `Match ${state.matchId}: Second half started, resuming poll`);
      }
    }

    const currentEvents = match.events || [];
    const mergedEvents = mergeNewEvents(currentEvents, data.events || []);

    const mergedScorers = (() => {
      const current = match.scorersList || [];
      const incoming = data.scorersList || [];
      if (current.length >= incoming.length) return current;
      return incoming;
    })();

    const updates: any = {
      _syncSource: "varzesh3",
      scoreHome: data.scoreHome,
      scoreAway: data.scoreAway,
      events: mergedEvents,
      scorersList: mergedScorers,
      minutes: data.currentMinute || match.minutes || "",
      status: "live",
      lastSyncAt: new Date().toISOString(),
      lastDataFetchAt: new Date().toISOString(),
      syncStatus: (state.status as string) === "half-time" ? "half-time" : "active",
      dataSource: "varzesh3",
    };

    if (data.lineups) updates.lineups = data.lineups;
    if (data.stats) updates.teamStats = data.stats;
    if (data.referee) updates.referee = data.referee;
    if (data.venue) updates.venue = data.venue;

    updateMatchInDb(state.matchId, updates);
    state.lastPollAt = new Date().toISOString();
    state.lastError = null;

    logMessage("info", "sync", `Poll #${state.pollCount} for match ${state.matchId}: ${data.scoreHome}-${data.scoreAway}, ${mergedEvents.length} events`);

    if (detectFullTime(match, data)) {
      logMessage("info", "sync", `Match ${state.matchId}: FULL-TIME detected, final sync & stop`);
      updateMatchInDb(state.matchId, {
        status: "finished",
        syncStatus: "finished",
        syncMode: "off",
      });
      await saveDB();
      stopPoll(state.matchId);
      return;
    }

    await saveDB();
  } catch (err: any) {
    state.lastError = err.message;
    state.status = "error";
    logMessage("error", "sync", `Poll #${state.pollCount} for match ${state.matchId} error: ${err.message}`);
    updateMatchInDb(state.matchId, {
      syncStatus: "error",
      lastSyncAt: new Date().toISOString(),
    });
  }
}

export function startAutoSync(matchId: string, varzesh3Url: string, intervalSec?: number): { scheduled: boolean; message: string } {
  const match = findMatch(matchId);
  if (!match) return { scheduled: false, message: "مسابقه یافت نشد." };

  if (activePolls.has(matchId)) {
    return { scheduled: false, message: "سینک خودکار فعال است." };
  }

  const interval = (intervalSec || DEFAULT_INTERVAL_SEC) * 1000;

  logMessage("info", "sync", `startAutoSync match ${matchId}: date="${match.date}" time="${match.time}" status="${match.status}"`);

  updateMatchInDb(matchId, {
    syncMode: "auto",
    dataUrl: varzesh3Url,
    syncIntervalSec: intervalSec || DEFAULT_INTERVAL_SEC,
    syncStatus: "pending",
  });
  saveDB();

  if (match.status === "live") {
    const state: LivePollState = {
      matchId,
      varzesh3Url,
      intervalMs: interval,
      timer: null,
      startTimer: null,
      status: "active",
      lastPollAt: null,
      lastError: null,
      pollCount: 0,
    };
    state.timer = setInterval(() => pollOnce(state), interval);
    activePolls.set(matchId, state);
    logMessage("info", "sync", `Auto-sync started immediately for match ${matchId} (live)`);
    return { scheduled: true, message: `سینک خودکار شروع شد (هر ${intervalSec || DEFAULT_INTERVAL_SEC} ثانیه).` };
  }

  const parsedDate = parseMatchDate(match);
  logMessage("info", "sync", `startAutoSync match ${matchId}: parsedDate=${parsedDate?.toISOString() || "null"}, isFuture=${parsedDate ? parsedDate.getTime() > Date.now() : false}`);

  if (isMatchScheduledFuture(match)) {
    const msUntil = getMsUntilMatchStart(match);
    const state: LivePollState = {
      matchId,
      varzesh3Url,
      intervalMs: interval,
      timer: null,
      startTimer: null,
      status: "pending",
      lastPollAt: null,
      lastError: null,
      pollCount: 0,
    };
    state.startTimer = setTimeout(async () => {
      logMessage("info", "sync", `Match ${matchId} time reached, starting poll`);
      state.startTimer = null;
      state.status = "active";
      state.timer = setInterval(() => pollOnce(state), interval);
      await pollOnce(state);
    }, msUntil);
    activePolls.set(matchId, state);
    const mins = Math.round(msUntil / 60000);
    logMessage("info", "sync", `Auto-sync scheduled for match ${matchId} in ${mins} minutes`);
    return { scheduled: true, message: `سینک خودکار تنظیم شد — ${mins} دقیقه دیگر شروع می‌شود.` };
  }

  updateMatchInDb(matchId, { syncMode: "off", syncStatus: "idle" });
  saveDB();
  return { scheduled: false, message: "زمان بازی گذشته یا تنظیم نشده." };
}

export function startManualSync(matchId: string, varzesh3Url: string, intervalSec?: number): { success: boolean; message: string } {
  const match = findMatch(matchId);
  if (!match) return { success: false, message: "مسابقه یافت نشد." };

  if (activePolls.has(matchId)) {
    stopPoll(matchId);
  }

  const interval = (intervalSec || DEFAULT_INTERVAL_SEC) * 1000;

  updateMatchInDb(matchId, {
    syncMode: "manual",
    dataUrl: varzesh3Url,
    syncIntervalSec: intervalSec || DEFAULT_INTERVAL_SEC,
    syncStatus: "active",
  });
  saveDB();

  const state: LivePollState = {
    matchId,
    varzesh3Url,
    intervalMs: interval,
    timer: null,
    startTimer: null,
    status: "active",
    lastPollAt: null,
    lastError: null,
    pollCount: 0,
  };
  state.timer = setInterval(() => pollOnce(state), interval);
  activePolls.set(matchId, state);

  pollOnce(state);

  logMessage("info", "sync", `Manual sync started for match ${matchId}`);
  return { success: true, message: `سینک دستی شروع شد (هر ${intervalSec || DEFAULT_INTERVAL_SEC} ثانیه).` };
}

export function stopPoll(matchId: string): void {
  const state = activePolls.get(matchId);
  if (state) {
    if (state.timer) clearInterval(state.timer);
    if (state.startTimer) clearTimeout(state.startTimer);
    activePolls.delete(matchId);
  }
  updateMatchInDb(matchId, { syncStatus: "idle", syncMode: "off" });
  logMessage("info", "sync", `Sync stopped for match ${matchId}`);
}

export function getSyncStatus(matchId: string) {
  const state = activePolls.get(matchId);
  const match = findMatch(matchId);
  return {
    matchId,
    syncMode: match?.syncMode || "off",
    syncStatus: match?.syncStatus || "idle",
    active: !!state,
    status: state?.status || "idle",
    lastPollAt: state?.lastPollAt || match?.lastSyncAt || null,
    lastError: state?.lastError || null,
    pollCount: state?.pollCount || 0,
    intervalSec: match?.syncIntervalSec || DEFAULT_INTERVAL_SEC,
    dataUrl: match?.dataUrl || null,
  };
}

export function setAdminOverride(matchId: string, field: string, value: any): boolean {
  const match = findMatch(matchId);
  if (!match) return false;

  const overrides = { ...(match.adminOverrides || {}), [field]: value };
  updateMatchInDb(matchId, {
    adminOverrides: overrides,
    adminOverridesEnabled: true,
    lastAdminEditAt: new Date().toISOString(),
    dataSource: "admin",
  });
  saveDB();
  logMessage("info", "sync", `Admin override set: match ${matchId}, field="${field}"`);
  return true;
}

export function removeAdminOverride(matchId: string, field: string): boolean {
  const match = findMatch(matchId);
  if (!match) return false;

  const overrides = { ...(match.adminOverrides || {}) };
  delete overrides[field];

  const hasRemaining = Object.keys(overrides).length > 0;
  updateMatchInDb(matchId, {
    adminOverrides: overrides,
    adminOverridesEnabled: hasRemaining,
    lastAdminEditAt: new Date().toISOString(),
  });
  saveDB();
  logMessage("info", "sync", `Admin override removed: match ${matchId}, field="${field}"`);
  return true;
}

export function restoreAllAutoSyncs(): void {
  const db = loadDB();
  for (const sp of ["football", "futsal"]) {
    for (const st of ["Feature_Games", "Now_Games"]) {
      const list = db[`${sp}_${st}`] || [];
      for (const match of list) {
        if (match.syncMode === "auto" && match.dataUrl) {
          logMessage("info", "sync", `Restoring auto-sync for match ${match.id}`);
          startAutoSync(match.id, match.dataUrl, match.syncIntervalSec);
        }
      }
    }
  }
}
