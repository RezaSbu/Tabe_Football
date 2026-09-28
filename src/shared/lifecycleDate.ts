import { jalaliToDayNumber, dayToGregorian, jalaliMonthDays } from "./coachTenure";

// Lifecycle date discipline (P1): storage is Gregorian DATE, display is
// Jalali at the presentation layer. This normalizer is the single gate:
// anything it rejects never reaches the ledger (service validates first,
// migration backfills only normalizable rows, UI sends native date inputs).

export interface NormalizedLifecycleDate {
  ok: boolean;
  /** Canonical YYYY-MM-DD (Gregorian). */
  value: string | null;
  /** Machine-readable reason when rejected (returned to the admin). */
  error?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isLeapGregorian(y: number): boolean {
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
}

function daysInGregorianMonth(y: number, m: number): number {
  const t = [31, isLeapGregorian(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return t[m - 1];
}

function daysInJalaliMonth(y: number, m: number): number {
  return jalaliMonthDays(y, m);
}

function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } | null {
  const day = jalaliToDayNumber(jy, jm, jd);
  if (!Number.isFinite(day)) return null;
  return dayToGregorian(day);
}

/**
 * Accepts Gregorian YYYY-MM-DD or Jalali YYYY-MM-DD/YYYY/MM/DD (years
 * 1300-1599) and returns canonical Gregorian YYYY-MM-DD. Rejects everything
 * else (empty, garbage, impossible month/day, out-of-range years).
 */
export function normalizeLifecycleDate(raw: string | null | undefined): NormalizedLifecycleDate {
  if (raw == null) return { ok: false, value: null, error: "EMPTY_DATE" };
  const s = String(raw).trim().split(/[T ]/)[0];
  const m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/.exec(s);
  if (!m) return { ok: false, value: null, error: "BAD_FORMAT" };
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (y >= 1800 && y <= 2200) {
    if (mo < 1 || mo > 12 || d < 1 || d > daysInGregorianMonth(y, mo)) {
      return { ok: false, value: null, error: "BAD_GREGORIAN_DATE" };
    }
    return { ok: true, value: `${y}-${pad(mo)}-${pad(d)}` };
  }
  if (y >= 1300 && y <= 1599) {
    if (mo < 1 || mo > 12 || d < 1 || d > daysInJalaliMonth(y, mo)) {
      return { ok: false, value: null, error: "BAD_JALALI_DATE" };
    }
    const g = jalaliToGregorian(y, mo, d);
    if (!g) return { ok: false, value: null, error: "BAD_JALALI_DATE" };
    return { ok: true, value: `${g.gy}-${pad(g.gm)}-${pad(g.gd)}` };
  }
  return { ok: false, value: null, error: "YEAR_OUT_OF_RANGE" };
}

export function todayGregorian(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
