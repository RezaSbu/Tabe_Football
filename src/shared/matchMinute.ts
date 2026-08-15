export interface ParsedMatchMinute {
  raw: string;
  base: number;
  added: number;
  total: number;
  isStoppage: boolean;
  half: 1 | 2;
}

function toLatinDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/**
 * Parses a match minute string like "45+5" (first-half stoppage time, real minute 50)
 * or "50" (plain second-half minute 50) or "90+3'" (trailing apostrophe ignored).
 * The half is derived from the BASE minute, so "45+5" is first-half stoppage while
 * "50" is second-half regular time.
 */
export function parseMatchMinute(raw: unknown, fullDuration = 90): ParsedMatchMinute {
  const rawStr = String(raw ?? "").trim();
  const cleaned = toLatinDigits(rawStr)
    .replace(/[’`′']+$/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

  const halfFromBase = (base: number): 1 | 2 => (base <= fullDuration / 2 ? 1 : 2);

  const stoppageMatch = /^(\d{1,3})\+(\d{1,3})$/.exec(cleaned);
  if (stoppageMatch) {
    const base = parseInt(stoppageMatch[1], 10) || 0;
    const added = parseInt(stoppageMatch[2], 10) || 0;
    const total = base + added;
    return {
      raw: rawStr,
      base,
      added,
      total,
      isStoppage: true,
      half: halfFromBase(base)
    };
  }

  const plain = parseInt(cleaned, 10);
  const total = Number.isFinite(plain) && plain > 0 ? plain : 0;
  return {
    raw: rawStr,
    base: total,
    added: 0,
    total,
    isStoppage: false,
    half: halfFromBase(total)
  };
}

/**
 * Real minute number: "45+5" -> 50, "50" -> 50, "0" -> 0.
 */
export function realMinute(raw: unknown, fullDuration = 90): number {
  return parseMatchMinute(raw, fullDuration).total;
}

/**
 * Half-aware sort key so first-half stoppage ("45+5" => 50) sorts before
 * any second-half minute ("50" => 150).
 */
export function minuteSortKey(raw: unknown, fullDuration = 90): number {
  const p = parseMatchMinute(raw, fullDuration);
  return (p.half === 1 ? 0 : 100) + p.total;
}
