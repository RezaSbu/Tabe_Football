/**
 * Team-of-the-Week auto ratings: resolve each selected player's rating from
 * the actual matches of that league+week instead of trusting the stored
 * (often placeholder) combo rating. Shared by both TOTW widgets so the side
 * list and the pitch can never disagree.
 */

export function weekNumberOf(week: unknown): number {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const latin = String(week ?? "").replace(/[۰-۹]/g, ch => String(fa.indexOf(ch)));
  const n = parseInt(latin.replace(/[^\d]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function numericRating(v: unknown): number | null {
  const r = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return v != null && !isNaN(r) ? r : null;
}

/**
 * Best (max) lineup rating per player id across all matches of the given
 * league tab + week. Starters and substitutes both count; a player who
 * appeared twice in one week keeps his best game.
 */
export function buildWeekRatings(
  matches: any[],
  leagueKey: string,
  group: string,
  week: number
): Map<string, number> {
  const map = new Map<string, number>();
  if (!week || week <= 0) return map;
  for (const m of matches || []) {
    if (!m || m.league !== leagueKey) continue;
    if (leagueKey === "league-2" && String((m as any).group || "a") !== (group || "a")) continue;
    if (weekNumberOf((m as any).week) !== week) continue;
    const lists = [m?.lineups?.home, m?.lineups?.away, m?.lineups?.homeSubs, m?.lineups?.awaySubs];
    for (const list of lists) {
      for (const p of list || []) {
        if (p?.id == null) continue;
        const r = numericRating(p?.rating);
        if (r == null) continue;
        const k = String(p.id);
        const prev = map.get(k);
        if (prev == null || r > prev) map.set(k, r);
      }
    }
  }
  return map;
}

/**
 * Resolution order: real week-match rating -> live player rating ->
 * stored combo rating -> null. Never invents a number.
 */
export function resolveTotwRating(
  weekRatings: Map<string, number>,
  playerId: unknown,
  liveRating: unknown,
  storedRating: unknown
): number | null {
  const id = String(playerId ?? "");
  if (id && weekRatings.has(id)) return weekRatings.get(id) as number;
  const live = numericRating(liveRating);
  if (live != null) return live;
  return numericRating(storedRating);
}
