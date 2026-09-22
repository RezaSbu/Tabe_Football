/**
 * Single source of truth for the wall-clock match-status rule.
 *
 * Mirrors the status derivation in src/utils.ts `computeDynamicAppletStats`
 * (used by the public site), so the admin list shows exactly what the site
 * shows. Rule:
 *   - stored "finished" is sticky (manual admin finishes are never reverted)
 *   - without a parseable date+time, fall back to the stored status
 *   - elapsed < 0                  -> "not-started"
 *   - 0 <= elapsed < 110 minutes   -> "live"
 *   - elapsed >= 110 minutes       -> "finished" (derived only; persisting
 *     finished matches is the job of the server migration on saveDB/boot)
 *
 * TIMEZONE: match date/time strings are Asia/Tehran wall time (the admin
 * enters them in Iran time and Iranian viewers read them as such). They are
 * converted to an absolute instant with a fixed +3:30 offset — NEVER with
 * the server's local timezone (containers run on UTC, which would shift
 * every match by 3.5 hours).
 */

export type EffectiveMatchStatus = "not-started" | "live" | "finished";

const LIVE_WINDOW_MS = 110 * 60 * 1000;
// Asia/Tehran is UTC+3:30 year-round (Iran abolished DST in 2022).
const TEHRAN_OFFSET_MS = (3 * 60 + 30) * 60 * 1000;

function toLatinDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function parseKickoffMs(date: unknown, time: unknown): number | null {
  try {
    if (!date || !time) return null;
    const parts = String(date).split("-");
    if (parts.length !== 3) return null;
    const yr = parseInt(parts[0], 10);
    const mo = parseInt(parts[1], 10) - 1;
    const dy = parseInt(parts[2], 10);
    if (!Number.isFinite(yr) || !Number.isFinite(mo) || !Number.isFinite(dy)) return null;

    const timeClean = toLatinDigits(String(time));
    const tParts = timeClean.split(":");
    // Same quirk as the client: unparsable hour falls back to 18.
    const hr = parseInt(tParts[0], 10) || 18;
    const mn = parseInt(tParts[1], 10) || 0;

    // Interpret as Tehran wall time -> absolute instant. Date.UTC
    // normalizes any overflow from the offset subtraction.
    const ms = Date.UTC(yr, mo, dy, hr, mn, 0, 0) - TEHRAN_OFFSET_MS;
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

export function getEffectiveStatus(match: any, nowMs: number = Date.now()): EffectiveMatchStatus {
  if (!match) return "not-started";
  if (match.status === "finished") return "finished";
  const kickoff = parseKickoffMs(match.date, match.time);
  if (kickoff === null) {
    const stored = String(match.status || "not-started");
    if (stored === "live" || stored === "finished") return stored;
    return "not-started";
  }
  const elapsed = nowMs - kickoff;
  if (elapsed < 0) return "not-started";
  if (elapsed < LIVE_WINDOW_MS) return "live";
  return "finished";
}
