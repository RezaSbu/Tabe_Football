/**
 * League-2 group (الف/ب) resolution for matches.
 *
 * A match carries an explicit `group` ("a" | "b") only when an admin assigns
 * it. Otherwise the group is DERIVED from both teams' current divisionKey
 * (when they agree on the same league-2 group), else the match is ungrouped
 * (null) and legacy callers keep working exactly as before.
 */
import { resolveTeam } from "./teamMatch";

export type MatchGroup = "a" | "b";

const GROUP_DIVISIONS: Record<string, MatchGroup> = {
  "league-2-group-a": "a",
  "league-2-group-b": "b",
};

export function normalizeMatchGroup(v: unknown): MatchGroup | null {
  return v === "a" || v === "b" ? v : null;
}

export function groupLabel(group: MatchGroup | null | undefined): string {
  if (group === "a") return "گروه الف";
  if (group === "b") return "گروه ب";
  return "";
}

interface TeamLike {
  id?: string | number;
  name?: string;
  divisionKey?: string;
}

interface MatchLike {
  league?: string | null;
  group?: string | null;
  teamHome?: string;
  teamAway?: string;
  teamHomeId?: string | number | null;
  teamAwayId?: string | number | null;
}

/**
 * Resolve the display group of a league-2 match.
 * - Non-league-2 matches never have a group (returns null).
 * - Explicit match.group wins.
 * - Else derive from both teams' divisionKey when they agree.
 * - Else null (ungrouped: caller decides fallback display).
 */
export function resolveMatchGroup(match: MatchLike | null | undefined, teams: TeamLike[] = []): MatchGroup | null {
  if (!match || match.league !== "league-2") return null;
  const explicit = normalizeMatchGroup(match.group);
  if (explicit) return explicit;
  if (!Array.isArray(teams) || teams.length === 0) return null;
  const home = resolveTeam(teams, match.teamHomeId ?? undefined) || resolveTeam(teams, match.teamHome ?? undefined);
  const away = resolveTeam(teams, match.teamAwayId ?? undefined) || resolveTeam(teams, match.teamAway ?? undefined);
  const hg = home?.divisionKey ? GROUP_DIVISIONS[String(home.divisionKey)] : undefined;
  const ag = away?.divisionKey ? GROUP_DIVISIONS[String(away.divisionKey)] : undefined;
  if (hg && hg === ag) return hg;
  return null;
}

/**
 * Which group tabs should list this league-2 match?
 * Grouped matches appear under their group only; ungrouped matches appear
 * under both tabs so nothing silently disappears before an admin assigns it.
 */
export function matchGroupTabs(match: MatchLike | null | undefined, teams: TeamLike[] = []): MatchGroup[] {
  const g = resolveMatchGroup(match, teams);
  return g ? [g] : ["a", "b"];
}
