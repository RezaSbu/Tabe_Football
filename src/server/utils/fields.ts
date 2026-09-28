/**
 * Mass-assignment guard for entity write routes.
 *
 * Server-managed keys (ids, history baselines, retirement flags, timestamps)
 * must never be set from req.body: baselines are derived from entered totals,
 * retirement flows through the lifecycle domain, and ids are generated or
 * taken from the URL. Everything else passes through untouched so admin
 * forms keep working (denylist, not allowlist, by design).
 */
const SERVER_MANAGED_KEYS = new Set([
  "id",
  "createdAt",
  "isRetired",
  "number",
  "shirt_number",
  // History baselines are always derived (entered - explained), never entered.
  "baseMatches",
  "baseGoals",
  "baseAssists",
  "baseCleanSheets",
  "baseYellowCards",
  "baseRedCards",
  "basePlayed",
  "baseWon",
  "baseDrawn",
  "baseLost",
  "basePoints",
  "baseGoalsFor",
  "baseGoalsAgainst",
  "baseWins",
  "baseDraws",
  "baseLosses",
]);

export function stripServerManaged<T extends Record<string, any>>(body: T | null | undefined, extra: string[] = []): Record<string, any> {
  const out: Record<string, any> = {};
  if (!body || typeof body !== "object") return out;
  for (const [k, v] of Object.entries(body)) {
    if (SERVER_MANAGED_KEYS.has(k)) continue;
    if (extra.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

/** League keys the standings/stats tables may be written under. */
export const KNOWN_LEAGUE_KEYS = new Set([
  "pro-league",
  "league-1",
  "league-2",
  "league-2-group-a",
  "league-2-group-b",
  "hazfi-cup",
  "futsal",
]);

/** Sports with dedicated match collections (prevents orphan keys). */
export const KNOWN_SPORTS = new Set(["football", "futsal"]);
