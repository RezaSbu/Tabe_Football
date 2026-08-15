import { describe, it, expect } from "vitest";
import { parseMatchMinute, realMinute, minuteSortKey } from "../../shared/matchMinute";

describe("parseMatchMinute", () => {
  it("parses a plain second-half minute as regular time", () => {
    const p = parseMatchMinute("50");
    expect(p.total).toBe(50);
    expect(p.base).toBe(50);
    expect(p.added).toBe(0);
    expect(p.isStoppage).toBe(false);
    expect(p.half).toBe(2);
  });

  it("parses 45+5 as first-half stoppage time with real minute 50", () => {
    const p = parseMatchMinute("45+5");
    expect(p.base).toBe(45);
    expect(p.added).toBe(5);
    expect(p.total).toBe(50);
    expect(p.isStoppage).toBe(true);
    expect(p.half).toBe(1);
  });

  it("distinguishes 45+5 (first half) from 50 (second half)", () => {
    const a = parseMatchMinute("45+5");
    const b = parseMatchMinute("50");
    expect(a.total).toBe(b.total); // both real minute 50
    expect(a.half).toBe(1);
    expect(b.half).toBe(2);
    expect(a.isStoppage).toBe(true);
    expect(b.isStoppage).toBe(false);
  });

  it("parses second-half stoppage 90+3 as half 2", () => {
    const p = parseMatchMinute("90+3");
    expect(p.total).toBe(93);
    expect(p.half).toBe(2);
  });

  it("normalizes Persian/Arabic digits and trailing apostrophes", () => {
    expect(realMinute("۴۵+۵")).toBe(50);
    expect(realMinute("45+5'")).toBe(50);
    expect(realMinute("٥٠")).toBe(50);
  });

  it("returns 0 for garbage input", () => {
    expect(realMinute("")).toBe(0);
    expect(realMinute("abc")).toBe(0);
  });

  it("applies the futsal half boundary", () => {
    expect(parseMatchMinute("20+2", 40).half).toBe(1);
    expect(parseMatchMinute("21", 40).half).toBe(2);
  });

  it("sorts first-half stoppage before second-half minutes", () => {
    expect(minuteSortKey("45+5")).toBeLessThan(minuteSortKey("50"));
    expect(minuteSortKey("46")).toBeLessThan(minuteSortKey("50"));
    expect(minuteSortKey("45+5")).toBe(50);
  });
});
