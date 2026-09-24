import { describe, it, expect } from "vitest";
import { normalizeLifecycleDate } from "../../shared/lifecycleDate";
import { jalaliToDayNumber, dayToGregorian, comparableDay } from "../../shared/coachTenure";

describe("normalizeLifecycleDate", () => {
  it("passes Gregorian through", () => {
    expect(normalizeLifecycleDate("2026-09-24")).toEqual({ ok: true, value: "2026-09-24" });
    expect(normalizeLifecycleDate("2026-9-4")).toEqual({ ok: true, value: "2026-09-04" });
  });

  it("converts known Jalali dates to Gregorian", () => {
    // Anchors verified against the existing converter (utils.convertGregorianToShamsiNumeric).
    expect(normalizeLifecycleDate("1405-07-02")).toEqual({ ok: true, value: "2026-09-24" });
    expect(normalizeLifecycleDate("1405/07/01")).toEqual({ ok: true, value: "2026-09-23" });
    expect(normalizeLifecycleDate("1405-01-01")).toEqual({ ok: true, value: "2026-03-21" });
    // Esfand in a Jalali leap year has 30 days (1403 was leap).
    expect(normalizeLifecycleDate("1403-12-30")).toEqual({ ok: true, value: "2025-03-20" });
  });

  it("rejects garbage, impossible and out-of-range dates", () => {
    expect(normalizeLifecycleDate(null).ok).toBe(false);
    expect(normalizeLifecycleDate("").ok).toBe(false);
    expect(normalizeLifecycleDate("آینده").ok).toBe(false);
    expect(normalizeLifecycleDate("2026-13-01").ok).toBe(false);
    expect(normalizeLifecycleDate("2026-02-30").ok).toBe(false);
    expect(normalizeLifecycleDate("1405-13-01").ok).toBe(false);
    expect(normalizeLifecycleDate("1405-07-32").ok).toBe(false);
    // 1404 Esfand has 29 days (non-leap).
    expect(normalizeLifecycleDate("1404-12-30").ok).toBe(false);
    expect(normalizeLifecycleDate("0999-01-01").ok).toBe(false);
  });

  it("round-trips every Jalali day 1390-1410 through day numbers (anchors verified vs ICU)", () => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const monthLen = (y: number, m: number): number => {
      if (m <= 6) return 31;
      if (m <= 11) return 30;
      const r = normalizeLifecycleDate(`${y}-12-29`);
      const r30 = normalizeLifecycleDate(`${y}-12-30`);
      return r30.ok ? 30 : 29;
    };
    let prevDay = -Infinity;
    for (let y = 1390; y <= 1410; y++) {
      for (let m = 1; m <= 12; m++) {
        for (let d = 1; d <= monthLen(y, m); d++) {
          const tag = `${y}-${pad(m)}-${pad(d)}`;
          const day = jalaliToDayNumber(y, m, d);
          expect(day).toBeGreaterThan(prevDay);
          prevDay = day;
          const g = dayToGregorian(day);
          const back = `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`;
          expect(comparableDay(back)).toBe(day);
          expect(normalizeLifecycleDate(tag).ok).toBe(true);
          expect(normalizeLifecycleDate(tag).value).toBe(back);
        }
      }
    }
  });

  it("pins ICU-verified anchors (Nowruz + leap boundaries)", () => {
    expect(normalizeLifecycleDate("1405-01-01").value).toBe("2026-03-21");
    expect(normalizeLifecycleDate("1404-01-01").value).toBe("2025-03-21");
    expect(normalizeLifecycleDate("1403-12-30").value).toBe("2025-03-20");
    expect(normalizeLifecycleDate("1404-12-29").value).toBe("2026-03-20");
  });
});
