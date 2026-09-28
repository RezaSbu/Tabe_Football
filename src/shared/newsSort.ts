// Single newest-first rule for every "latest news" surface (spec: the first
// thing the user sees must be the most recently posted news).
// Order: createdAt descending, id descending as deterministic tiebreak.
// String comparison keeps ISO timestamps (with any precision) ordered;
// missing/invalid dates sink to the end instead of scattering.
export interface SortableNews {
  createdAt?: any;
  id?: any;
}

export function compareNewsNewestFirst(a: SortableNews, b: SortableNews): number {
  // Only ISO-like timestamps participate; anything else sinks to the end
  // (locale collation would otherwise rank garbage like "not-a-date"
  // above real dates).
  const key = (v: any): string => {
    const s = String(v || "");
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s : "";
  };
  const t = key(b.createdAt).localeCompare(key(a.createdAt));
  if (t !== 0) return t;
  return String(b.id || "").localeCompare(String(a.id || ""));
}

export function sortNewsNewestFirst<T extends SortableNews>(rows: T[]): T[] {
  return [...rows].sort(compareNewsNewestFirst);
}
