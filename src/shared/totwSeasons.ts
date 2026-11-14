import type { SelectedCombination } from "../types";

/**
 * Team-of-the-week season archive.
 *
 * TOTW rows used to carry only a week number, and week numbers restart every
 * season, so a new season would silently overwrite the week the previous
 * season used. Every combination now carries a `seasonId`; the ACTIVE season
 * (and legacy rows without a tag) resolves to the "current" bucket, while any
 * older season becomes browsable archive.
 *
 * These helpers are pure so the full widget, the light widget and the admin
 * list all agree on grouping.
 */
export const CURRENT_SEASON_KEY = "current";

/** Normalizes "1404" / "season-1404" / " season-1404 " to "season-1404". */
export function normalizeSeasonId(value: any): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const withoutPrefix = raw.replace(/^season-/i, "");
  return `season-${withoutPrefix}`;
}

/**
 * Bucket key for one combination. An empty tag or the active season maps to
 * CURRENT_SEASON_KEY so legacy rows and fresh rows stay in the same bucket.
 */
export function seasonKeyOf(
  combination: Partial<SelectedCombination> | any,
  currentSeasonId?: string | null
): string {
  const id = normalizeSeasonId(combination?.seasonId);
  if (!id) return CURRENT_SEASON_KEY;
  const current = normalizeSeasonId(currentSeasonId);
  if (current && id === current) return CURRENT_SEASON_KEY;
  return id;
}

/** Groups combinations by season: current bucket first, older seasons newest-first. */
export function groupBySeason<T extends Partial<SelectedCombination>>(
  combinations: T[],
  currentSeasonId?: string | null
): Array<{ key: string; combinations: T[] }> {
  const buckets = new Map<string, T[]>();
  (combinations || []).forEach((c) => {
    const key = seasonKeyOf(c, currentSeasonId);
    const list = buckets.get(key);
    if (list) list.push(c);
    else buckets.set(key, [c]);
  });
  const keys = [...buckets.keys()].sort((a, b) => {
    if (a === CURRENT_SEASON_KEY) return -1;
    if (b === CURRENT_SEASON_KEY) return 1;
    return b.localeCompare(a);
  });
  return keys.map((key) => ({ key, combinations: buckets.get(key) || [] }));
}

/** Human label for a bucket: live season number, or the archived season number. */
export function seasonLabelOf(key: string, currentSeason?: string | number | null): string {
  if (key === CURRENT_SEASON_KEY) {
    const current = String(currentSeason ?? "").replace(/^season-/, "").trim();
    return current;
  }
  return key.replace(/^season-/, "");
}

export function filterBySeason<T extends Partial<SelectedCombination>>(
  combinations: T[],
  seasonKey: string,
  currentSeasonId?: string | null
): T[] {
  return (combinations || []).filter((c) => seasonKeyOf(c, currentSeasonId) === seasonKey);
}
