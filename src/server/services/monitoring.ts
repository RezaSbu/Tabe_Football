import os from "os";
import fs from "fs";
import path from "path";
import { dbQuery, getUploadsDir } from "../db";
import { loadDB } from "../state";
import { AUTH_EVENTS } from "../utils/audit";
import { logMessage } from "../utils/logger";

// ============================================
// سامانه نظارت: گردآوری متریک‌های سرور، دیتابیس، رسانه، بازدید و عملکرد
// ============================================

export const SERVER_START_TIME = Date.now();

// ---------- کش همگام‌سازی ----------
let lastSyncAt: string | null = null;
let lastSyncOk = true;
let syncCount = 0;

export function markDataSync(ok: boolean): void {
  lastSyncAt = new Date().toISOString();
  lastSyncOk = ok;
  syncCount++;
}

// ---------- آمار درخواست‌های HTTP ----------
export interface HttpRequestSample {
  at: number;
  method: string;
  path: string;
  status: number;
  ms: number;
}

const httpSamples: HttpRequestSample[] = [];
const MAX_SAMPLES = 2000;
const httpTotals = { requests: 0, errors4xx: 0, errors5xx: 0 };

export function recordHttpRequest(sample: HttpRequestSample): void {
  httpTotals.requests++;
  if (sample.status >= 500) httpTotals.errors5xx++;
  else if (sample.status >= 400) httpTotals.errors4xx++;
  httpSamples.push(sample);
  if (httpSamples.length > MAX_SAMPLES) httpSamples.shift();
}

export function getHttpStats() {
  const now = Date.now();
  const lastHour = httpSamples.filter(s => now - s.at <= 60 * 60 * 1000);
  const lastDay = httpSamples.filter(s => now - s.at <= 24 * 60 * 60 * 1000);

  const status: Record<string, number> = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
  lastDay.forEach(s => {
    const key = s.status >= 500 ? "5xx" : s.status >= 400 ? "4xx" : s.status >= 300 ? "3xx" : "2xx";
    status[key]++;
  });

  const methodCounts: Record<string, number> = {};
  lastDay.forEach(s => {
    methodCounts[s.method] = (methodCounts[s.method] || 0) + 1;
  });

  const epMap = new Map<string, { count: number; totalMs: number; maxMs: number }>();
  lastHour.forEach(s => {
    const key = `${s.method} ${s.path}`;
    const existing = epMap.get(key);
    if (existing) {
      existing.count++;
      existing.totalMs += s.ms;
      if (s.ms > existing.maxMs) existing.maxMs = s.ms;
    } else {
      epMap.set(key, { count: 1, totalMs: s.ms, maxMs: s.ms });
    }
  });
  const endpoints = Array.from(epMap.entries())
    .map(([ep, v]) => ({ endpoint: ep, count: v.count, avgMs: Math.round(v.totalMs / v.count), maxMs: v.maxMs }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const avgMs = lastHour.length ? Math.round(lastHour.reduce((acc, s) => acc + s.ms, 0) / lastHour.length) : 0;

  return {
    totals: httpTotals,
    lastHour: { requests: lastHour.length, avgMs },
    lastDay: { requests: lastDay.length, status, methodCounts },
    endpoints,
    recent: httpSamples.slice(-30)
  };
}

// ---------- متریک‌های سیستم / VPS ----------
export function getSystemMetrics() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  let load: number[] = [0, 0, 0];
  let kernel = os.release();
  let memInfo: any = null;
  let netStats: any = null;
  let inode: any = null;

  try {
    const l = fs.readFileSync("/proc/loadavg", "utf8").trim().split(/\s+/);
    load = [parseFloat(l[0]), parseFloat(l[1]), parseFloat(l[2])];
  } catch {
    // فقط در لینوکس در دسترس است
  }
  try {
    kernel = fs.readFileSync("/proc/version", "utf8").split(" ")[2] || kernel;
  } catch {
    // ignore
  }
  try {
    const mi: Record<string, number> = {};
    for (const line of fs.readFileSync("/proc/meminfo", "utf8").split("\n")) {
      const m = line.match(/^(\w+):\s+(\d+)/);
      if (m) mi[m[1]] = parseInt(m[2], 10) * 1024;
    }
    if (mi.MemTotal) {
      const available = mi.MemAvailable ?? mi.MemFree ?? freeMem;
      memInfo = {
        total: mi.MemTotal,
        available,
        used: mi.MemTotal - available,
        swapTotal: mi.SwapTotal || 0,
        swapFree: mi.SwapFree || 0,
      };
    }
  } catch {
    // ignore
  }
  try {
    const totals = { rxBytes: 0, txBytes: 0 };
    const lines = fs.readFileSync("/proc/net/dev", "utf8").split("\n").slice(2);
    for (const line of lines) {
      const parts = line.trim().split(/[: ]+/);
      if (parts.length >= 10 && parts[0] !== "lo") {
        totals.rxBytes += parseInt(parts[1] || "0", 10) || 0;
        totals.txBytes += parseInt(parts[9] || "0", 10) || 0;
      }
    }
    netStats = totals;
  } catch {
    // ignore
  }
  try {
    const s = fs.statfsSync(getUploadsDir());
    inode = { total: s.files, free: s.ffree, used: s.files - s.ffree };
  } catch {
    // ignore
  }

  const usedMem = memInfo ? memInfo.used : totalMem - freeMem;
  const memPct = Math.round((usedMem / Math.max(1, totalMem)) * 100);
  const swapTotal = memInfo ? memInfo.swapTotal : 0;
  const swapUsed = memInfo ? memInfo.swapTotal - memInfo.swapFree : 0;
  const swapPct = swapTotal ? Math.round((swapUsed / swapTotal) * 100) : 0;
  const loadCoreRatio = load[0] / Math.max(1, cpus.length);

  const warnings: { key: string; label: string; value: string; level: "warn" | "error" }[] = [];
  if (memPct > 85) warnings.push({ key: "ram", label: "مصرف حافظه", value: `${memPct}٪`, level: memPct > 92 ? "error" : "warn" });
  if (loadCoreRatio > 1.5) warnings.push({ key: "cpu", label: "بار پردازنده", value: `${load[0].toFixed(2)} (${Math.round(loadCoreRatio * 100)}٪ هسته‌ها)`, level: loadCoreRatio > 2.5 ? "error" : "warn" });
  if (swapPct > 50) warnings.push({ key: "swap", label: "مصرف سواپ", value: `${swapPct}٪`, level: "warn" });
  if (inode && inode.total && inode.free / inode.total < 0.1) {
    warnings.push({ key: "inode", label: "ایندود دیسک", value: `فقط ${Math.round((inode.free / inode.total) * 100)}٪ آزاد`, level: "warn" });
  }

  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    osType: os.type(),
    kernel,
    release: os.release(),
    cpuModel: cpus.length ? cpus[0].model : "N/A",
    cpuCores: cpus.length,
    hostUptime: os.uptime(),
    processUptime: process.uptime(),
    memory: {
      total: totalMem,
      used: usedMem,
      free: totalMem - usedMem,
      usedPercent: memPct,
      available: freeMem,
      swapTotal,
      swapUsed,
      swapFree: swapTotal - swapUsed,
      swapPercent: swapPct
    },
    load: { "1min": load[0], "5min": load[1], "15min": load[2], coreRatio: loadCoreRatio },
    network: netStats,
    inode,
    warnings
  };
}

// ---------- متریک‌های PostgreSQL ----------
export async function getPostgresMetrics() {
  const out: any = { available: true };

  try {
    const conn = await dbQuery("SELECT count(*)::int AS count FROM pg_stat_activity");
    out.activeConnections = conn.rows[0]?.count || 0;
  } catch (e: any) {
    out.available = false;
    out.error = e?.message || String(e);
    return out;
  }

  try {
    const long = await dbQuery(
      `SELECT pid, usename AS username, state, now() - query_start AS duration,
              left(query, 160) AS query
       FROM pg_stat_activity
       WHERE state = 'active' AND query_start < now() - interval '5 seconds' AND pid <> pg_backend_pid()
       ORDER BY query_start ASC LIMIT 20`
    );
    out.longRunning = long.rows.map(r => ({
      pid: r.pid,
      username: r.username,
      state: r.state,
      durationSec: Math.round(parseFloat(r.duration) * 10) / 10,
      query: r.query
    }));
  } catch (e: any) {
    out.longRunningError = e?.message || String(e);
  }

  try {
    const dbRow = await dbQuery(
      `SELECT blks_hit, blks_read, deadlocks, xact_commit, xact_rollback, numbackends, conflicts
       FROM pg_stat_database WHERE datname = current_database()`
    );
    const row = dbRow.rows[0];
    if (row) {
      const totalBlks = (row.blks_hit || 0) + (row.blks_read || 0);
      out.database = {
        cacheHitPercent: totalBlks ? Math.round((row.blks_hit / totalBlks) * 1000) / 10 : 0,
        deadlocks: row.deadlocks || 0,
        transactions: (row.xact_commit || 0) + (row.xact_rollback || 0),
        rollbackPercent: (row.xact_commit || 0) + (row.xact_rollback || 0) ? Math.round((row.xact_rollback / ((row.xact_commit || 0) + (row.xact_rollback || 0))) * 100) : 0,
        conflicts: row.conflicts || 0,
        backends: row.numbackends || 0
      };
    }
  } catch (e: any) {
    out.databaseError = e?.message || String(e);
  }

  try {
    const sizes = await dbQuery(
      `SELECT c.relname AS table_name,
              COALESCE(s.n_live_tup, 0) AS live_rows,
              pg_total_relation_size(c.oid) AS total_bytes,
              pg_relation_size(c.oid) AS data_bytes,
              pg_indexes_size(c.oid) AS index_bytes
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
       WHERE n.nspname = 'public' AND c.relkind = 'r'
       ORDER BY pg_total_relation_size(c.oid) DESC
       LIMIT 30`
    );
    out.tableSizes = sizes.rows.map(r => ({
      table: r.table_name,
      liveRows: r.live_rows,
      totalBytes: Number(r.total_bytes) || 0,
      dataBytes: Number(r.data_bytes) || 0,
      indexBytes: Number(r.index_bytes) || 0
    }));
  } catch (e: any) {
    out.tableSizesError = e?.message || String(e);
  }

  try {
    const vac = await dbQuery(
      `SELECT relname AS table_name, last_vacuum, last_autovacuum, last_analyze, last_autoanalyze,
              n_tup_dead AS dead_rows, n_live_tup AS live_rows
       FROM pg_stat_user_tables
       ORDER BY n_tup_dead DESC LIMIT 15`
    );
    out.vacuum = vac.rows.map(r => ({
      table: r.table_name,
      lastVacuum: r.last_vacuum,
      lastAutovacuum: r.last_autovacuum,
      lastAnalyze: r.last_analyze,
      lastAutoanalyze: r.last_autoanalyze,
      deadRows: r.dead_rows || 0,
      liveRows: r.live_rows || 0
    }));
  } catch (e: any) {
    out.vacuumError = e?.message || String(e);
  }

  try {
    const info = await dbQuery(
      `SELECT version() AS version,
              current_setting('server_version_num') AS version_num,
              current_setting('max_connections') AS max_connections,
              current_setting('autovacuum') AS autovacuum`
    );
    const r = info.rows[0];
    out.serverVersion = r?.version || "";
    out.maxConnections = r?.max_connections || "N/A";
    out.autovacuum = r?.autovacuum || "off";
  } catch (e: any) {
    out.versionError = e?.message || String(e);
  }

  return out;
}

// ---------- آمار رسانه‌ها ----------
export function getMediaStats() {
  const db = loadDB();
  const files = Array.isArray(db.media_files) ? db.media_files : [];

  const byCategory: Record<string, number> = {};
  const byMime: Record<string, { count: number; bytes: number }> = {};
  let totalSize = 0;

  files.forEach((f: any) => {
    const cat = f.category || "uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    const mime = String(f.mime_type || "").toLowerCase() || "unknown";
    const entry = byMime[mime] || { count: 0, bytes: 0 };
    entry.count++;
    const sz = Number(f.file_size) || 0;
    entry.bytes += sz;
    totalSize += sz;
    byMime[mime] = entry;
  });

  const webp = byMime["image/webp"] || { count: 0, bytes: 0 };
  const webpCount = webp.count;

  return {
    totalFiles: files.length,
    totalSize,
    byCategory,
    byMime,
    webpCount,
    webpBytes: webp.bytes,
    otherCount: files.length - webpCount,
    otherBytes: totalSize - webp.bytes,
    webpPercent: files.length ? Math.round((webpCount / files.length) * 100) : 0,
    galleryImages: Array.isArray(db.images) ? db.images.length : 0,
    recent: files.slice(0, 6).map((f: any) => ({
      id: f.id,
      title: f.title || f.file_name || "",
      category: f.category || "",
      mimeType: f.mime_type || "",
      fileSize: Number(f.file_size) || 0,
      imageUrl: f.image_url || "",
      createdAt: f.created_at
    }))
  };
}

// ---------- آمار بازدید کاربران ----------
export async function getVisitorStats() {
  const out: any = { available: true };

  try {
    const totals = await dbQuery(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE is_bot)::int AS bots,
              max(created_at) AS last_visit
       FROM public.visits`
    );
    const t = totals.rows[0] || { total: 0, bots: 0, last_visit: null };
    out.total = Number(t.total) || 0;
    out.botsBlocked = Number(t.bots) || 0;
    out.lastVisit = t.last_visit || null;
  } catch (e: any) {
    out.available = false;
    out.error = e?.message || String(e);
    return out;
  }

  try {
    const today = await dbQuery(
      `SELECT count(*)::int AS count
       FROM public.visits WHERE created_at >= date_trunc('day', now())`
    );
    out.today = today.rows[0]?.count || 0;
  } catch {
    out.today = 0;
  }

  try {
    const daily = await dbQuery(
      `SELECT to_char(created_at, 'YYYY-MM-DD') AS date, count(*)::int AS count
       FROM public.visits
       WHERE created_at >= now() - interval '30 days'
       GROUP BY date ORDER BY date ASC`
    );
    out.daily = daily.rows || [];
    const counts = out.daily.map((r: any) => Number(r.count) || 0);
    out.avgDaily = counts.length
      ? Math.round((counts.reduce((a: number, b: number) => a + b, 0) / counts.length) * 10) / 10
      : 0;
    out.maxDaily = counts.length ? Math.max(...counts) : 0;
  } catch {
    out.daily = [];
    out.avgDaily = 0;
    out.maxDaily = 0;
  }

  try {
    const recent = await dbQuery(
      `SELECT count(DISTINCT visitor_id)::int AS visitors,
              count(DISTINCT visitor_id) FILTER (
                WHERE visitor_id IN (
                  SELECT visitor_id FROM public.visits
                  WHERE created_at >= now() - interval '7 days' AND visitor_id IS NOT NULL
                  GROUP BY visitor_id HAVING count(*) >= 2
                )
              )::int AS returning
       FROM public.visits
       WHERE created_at >= now() - interval '7 days' AND visitor_id IS NOT NULL`
    );
    const r = recent.rows[0] || { visitors: 0, returning: 0 };
    out.recent7d = Number(r.visitors) || 0;
    out.returnRate7d = Number(r.visitors) > 0 ? Math.round(((Number(r.returning) || 0) / Number(r.visitors)) * 100) : 0;
  } catch {
    out.recent7d = 0;
    out.returnRate7d = 0;
  }

  try {
    const hours = await dbQuery(
      `SELECT EXTRACT(HOUR FROM created_at)::int AS hour, count(*)::int AS count
       FROM public.visits
       WHERE created_at >= now() - interval '7 days'
       GROUP BY hour ORDER BY hour ASC`
    );
    out.peakHours = hours.rows || [];
  } catch {
    out.peakHours = [];
  }

  try {
    const weekdays = await dbQuery(
      `SELECT EXTRACT(DOW FROM created_at)::int AS dow, count(*)::int AS count
       FROM public.visits
       WHERE created_at >= now() - interval '30 days'
       GROUP BY dow ORDER BY dow ASC`
    );
    const buckets: { count: number }[] = [];
    for (let i = 0; i < 7; i++) buckets.push({ count: 0 });
    for (const row of weekdays.rows || []) {
      const dow = Number(row.dow);
      if (dow >= 0 && dow <= 6) buckets[dow] = { count: Number(row.count) || 0 };
    }
    out.byWeekday = buckets;
    out.maxWeekday = Math.max(1, ...buckets.map((b: any) => b.count));
  } catch {
    out.byWeekday = null;
    out.maxWeekday = 0;
  }

  try {
    const pages = await dbQuery(
      `SELECT page AS path, count(*)::int AS count
       FROM public.visits
       WHERE created_at >= now() - interval '30 days' AND page IS NOT NULL AND page <> ''
       GROUP BY path ORDER BY count DESC LIMIT 12`
    );
    out.topPages = pages.rows || [];
  } catch {
    out.topPages = [];
  }

  return out;
}

// ---------- پاکسازی خودکار بازدیدهای قدیمی ----------
export async function cleanupOldVisits(retentionDays = 30): Promise<number> {
  try {
    const res = await dbQuery(
      `DELETE FROM public.visits WHERE created_at < now() - ($1::int * interval '1 day')`,
      [retentionDays]
    );
    if ((res.rowCount || 0) > 0) {
      logMessage("info", "database", `پاکسازی خودکار بازدیدها: ${res.rowCount} ردیف قدیمی‌تر از ${retentionDays} روز حذف شد.`);
    }
    return res.rowCount || 0;
  } catch (e: any) {
    logMessage("warn", "database", "خطا در پاکسازی خودکار بازدیدهای قدیمی:", e?.message || e);
    return 0;
  }
}

// ---------- پاکسازی خودکار لاگ ادمین‌ها ----------
export async function cleanupOldAuditLogs(retentionDays = 30): Promise<number> {
  try {
    const res = await dbQuery(
      `DELETE FROM public.audit_logs WHERE created_at < now() - ($1::int * interval '1 day')`,
      [retentionDays]
    );
    if ((res.rowCount || 0) > 0) {
      logMessage("info", "database", `پاکسازی خودکار لاگ ادمین‌ها: ${res.rowCount} ردیف قدیمی‌تر از ${retentionDays} روز حذف شد.`);
    }
    return res.rowCount || 0;
  } catch (e: any) {
    logMessage("warn", "database", "خطا در پاکسازی خودکار لاگ ادمین‌ها:", e?.message || e);
    return 0;
  }
}

// ---------- گزارش فعالیت ادمین‌ها ----------
export async function getAuditStats() {
  const out: any = { available: true };

  try {
    const [totalRes, perAdminRes, byActionRes, recentRes] = await Promise.all([
      dbQuery(`SELECT count(*)::int AS total FROM public.audit_logs`),
      dbQuery(
        `SELECT username, count(*)::int AS count,
                count(*) FILTER (WHERE action = 'login')::int AS logins,
                count(*) FILTER (WHERE action = 'failed_login')::int AS failed_logins
         FROM public.audit_logs GROUP BY username ORDER BY count DESC`
      ),
      dbQuery(`SELECT action, count(*)::int AS count FROM public.audit_logs GROUP BY action ORDER BY count DESC`),
      dbQuery(
        `SELECT id, username, role, action, method, path, ip, created_at
         FROM public.audit_logs ORDER BY created_at DESC LIMIT 150`
      )
    ]);

    out.total = totalRes.rows[0]?.total || 0;

    const byUser: Record<string, number> = {};
    for (const r of perAdminRes.rows || []) byUser[r.username] = Number(r.count) || 0;
    out.byUser = byUser;

    const byAction: Record<string, number> = {};
    for (const r of byActionRes.rows || []) byAction[r.action] = Number(r.count) || 0;
    out.byAction = byAction;

    out.recent = (recentRes.rows || []).map((r: any) => ({
      username: r.username,
      role: r.role,
      action: r.action,
      route: r.path,
      ip: r.ip,
      createdAt: r.created_at
    }));
  } catch (e: any) {
    out.available = false;
    out.error = e?.message || String(e);
    return out;
  }

  let authEventCount = 0;
  let failedCount = 0;
  const failedByIp: Record<string, number> = {};
  for (const ev of AUTH_EVENTS) {
    authEventCount++;
    if (!ev.success) {
      failedCount++;
      if (ev.ip) failedByIp[ev.ip] = (failedByIp[ev.ip] || 0) + 1;
    }
  }
  out.authEventCount = authEventCount;
  out.failedCount = failedCount;
  out.authEvents = AUTH_EVENTS.slice(0, 100).map(ev => ({
    username: ev.username,
    success: ev.success,
    ip: ev.ip,
    time: ev.at
  }));
  out.failedIps = Object.fromEntries(
    Object.entries(failedByIp).sort((a, b) => b[1] - a[1]).slice(0, 10)
  );

  return out;
}

// ---------- نسخه در حال اجرا ----------
export function getRunningVersion() {
  let pkgVersion = "";
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    pkgVersion = pkg.version || "";
  } catch {
    // ignore
  }
  return {
    packageVersion: pkgVersion,
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    startedAt: new Date(SERVER_START_TIME).toISOString(),
    nodeEnv: process.env.NODE_ENV || "development"
  };
}

// ---------- سلامت کش ----------
export function getCacheHealth() {
  const db = loadDB();
  return {
    lastSyncAt,
    lastSyncOk,
    syncCount,
    memoryCounts: {
      news: (db.news || []).length,
      teams: (db.teams || []).length,
      players: (db.players || []).length,
      coaches: (db.coaches || []).length,
      matches: (db.matches || []).length,
      transfers: (db.transfers || []).length,
      legionnaires: (db.legionnaires || []).length,
      media: (db.images || []).length,
      media_files: (db.media_files || []).length,
      hero_slides: (db.heroSlides || []).length,
      contact_messages: (db.submissions || []).length,
      standings: Object.keys(db.standings || {}).length,
      stats: Object.keys(db.stats || {}).length
    }
  };
}
