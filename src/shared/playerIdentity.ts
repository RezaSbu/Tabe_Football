/**
 * Central player-identity helpers.
 *
 * Players are identified by their stable `id` (players_pkey). A normalized
 * NAME is only ever a fallback signal, and for duplicate names it is never
 * enough on its own: the evidence must also sit on the player's own team
 * side (lineup side / event team) within one of the player's team periods.
 *
 * Name-only evidence for a duplicated name is treated as ambiguous and is
 * rejected rather than risking cross-player contamination.
 */

export interface PlayerIdentityRef {
  id?: unknown;
  name?: unknown;
}

export interface PlayerEvidence extends PlayerIdentityRef {
  /** Which side of the match the evidence belongs to (lineup side / ev.team). */
  side?: "home" | "away" | null;
}

export interface PlayerTeamRef {
  teamId?: unknown;
  teamName?: unknown;
}

export interface PlayerIdentityIndex {
  /** Every known player id, as string. */
  ids: Set<string>;
  /** Normalized player name -> how many players share it. */
  nameCounts: Map<string, number>;
}


const ZERO_WIDTH_CHARS = String.fromCharCode(8203, 8204, 8205, 65279, 8206, 8207);
const AR_YEH = String.fromCharCode(1610);
const FA_YEH = String.fromCharCode(1740);
const AR_KAF = String.fromCharCode(1603);
const FA_KAF = String.fromCharCode(1705);
const FA_DIGITS = String.fromCharCode(1776, 1777, 1778, 1779, 1780, 1781, 1782, 1783, 1784, 1785);
const AR_DIGITS = String.fromCharCode(1632, 1633, 1634, 1635, 1636, 1637, 1638, 1639, 1640, 1641);

function stripZeroWidth(value: string): string {
  let out = "";
  for (const ch of value) {
    if (!ZERO_WIDTH_CHARS.includes(ch)) out += ch;
  }
  return out;
}

function latinDigits(value: string): string {
  let out = "";
  for (const ch of value) {
    const fa = FA_DIGITS.indexOf(ch);
    if (fa >= 0) {
      out += String(fa);
      continue;
    }
    const ar = AR_DIGITS.indexOf(ch);
    out += ar >= 0 ? String(ar) : ch;
  }
  return out;
}

export function normalizePlayerName(value: unknown): string {
  if (value === null || value === undefined) return "";
  return latinDigits(stripZeroWidth(String(value)).trim())
    .replace(/[\s\t]+/g, " ")
    .split(AR_YEH).join(FA_YEH)
    .split(AR_KAF).join(FA_KAF)
    .toLowerCase();
}

export function buildPlayerIdentityIndex(players: any[]): PlayerIdentityIndex {
  const ids = new Set<string>();
  const nameCounts = new Map<string, number>();
  (players || []).forEach((p: any) => {
    if (!p) return;
    if (p.id !== undefined && p.id !== null && p.id !== "") ids.add(String(p.id));
    const n = normalizePlayerName(p.name);
    if (n) nameCounts.set(n, (nameCounts.get(n) || 0) + 1);
  });
  return { ids, nameCounts };
}

export function isDuplicatePlayerName(playerName: unknown, index: PlayerIdentityIndex): boolean {
  const n = normalizePlayerName(playerName);
  return !!n && (index.nameCounts.get(n) || 0) > 1;
}

function sameTeamValue(a: unknown, b: unknown): boolean {
  if (a === undefined || a === null || a === "" || b === undefined || b === null || b === "") return false;
  return String(a) === String(b);
}

export function playerTeamMatchesSide(
  playerTeam: PlayerTeamRef,
  match: any,
  side: "home" | "away"
): boolean {
  if (!match || (side !== "home" && side !== "away")) return false;
  const matchTeamId = side === "home" ? match.teamHomeId : match.teamAwayId;
  const matchTeamName = side === "home" ? match.teamHome : match.teamAway;
  if (sameTeamValue(playerTeam.teamId, matchTeamId)) return true;
  if (
    playerTeam.teamName &&
    matchTeamName &&
    normalizePlayerName(playerTeam.teamName) === normalizePlayerName(matchTeamName)
  ) {
    return true;
  }
  return false;
}

/**
 * Every team the player can legitimately represent for a given match:
 * current club plus any team-membership period covering the match
 * season/date (so transfers don't break historical attribution).
 */
export function collectPlayerTeamRefs(player: any, memberships: any[], match: any): PlayerTeamRef[] {
  const refs: PlayerTeamRef[] = [];
  if (!player) return refs;
  if (player.teamId || player.teamName) refs.push({ teamId: player.teamId, teamName: player.teamName });
  const season = match && match.season !== undefined && match.season !== null ? String(match.season) : "";
  const date = match && match.date ? String(match.date) : "";
  (memberships || []).forEach((mm: any) => {
    if (!mm || String(mm.playerId) !== String(player.id)) return;
    if (season && mm.season && String(mm.season) !== season) return;
    if (date) {
      if (mm.startDate && date < String(mm.startDate)) return;
      if (mm.endDate && date > String(mm.endDate)) return;
    }
    refs.push({ teamId: mm.teamId, teamName: mm.teamName });
  });
  return refs;
}

export interface MatchLineupPlacement {
  entry: any | null;
  side: "home" | "away" | null;
  role: "starter" | "substitute" | null;
}

/**
 * Locate a player's lineup row across starters and substitutes.
 * Starters win over substitutes when (bad) data contains both.
 * Name-only rows for duplicated names still require team-side proof.
 */
export function findMatchLineupPlacement(
  player: any,
  match: any,
  index: PlayerIdentityIndex,
  memberships?: any[]
): MatchLineupPlacement {
  const empty: MatchLineupPlacement = { entry: null, side: null, role: null };
  if (!player || !match) return empty;
  const lineups = match.lineups || {};
  const same = (ref: PlayerIdentityRef, side: "home" | "away") =>
    isSamePlayer({ ...ref, side }, player, match, index, memberships || []);
  const home = lineups.home || [];
  const away = lineups.away || [];
  const foundHome = home.find((lp: any) => lp && same({ id: lp.id, name: lp.name }, "home"));
  if (foundHome) return { entry: foundHome, side: "home", role: "starter" };
  const foundAway = away.find((lp: any) => lp && same({ id: lp.id, name: lp.name }, "away"));
  if (foundAway) return { entry: foundAway, side: "away", role: "starter" };
  const homeSubs = lineups.homeSubs || [];
  const awaySubs = lineups.awaySubs || [];
  const foundHomeSub = homeSubs.find((lp: any) => lp && same({ id: lp.id, name: lp.name }, "home"));
  if (foundHomeSub) return { entry: foundHomeSub, side: "home", role: "substitute" };
  const foundAwaySub = awaySubs.find((lp: any) => lp && same({ id: lp.id, name: lp.name }, "away"));
  if (foundAwaySub) return { entry: foundAwaySub, side: "away", role: "substitute" };
  return empty;
}
/**
 * Decide whether one piece of match evidence (lineup row / event /
 * scorer / mvp) belongs to the given player.
 *
 * Rules:
 * 1. An `id` equal to the player's id always matches.
 * 2. An `id` that belongs to a DIFFERENT known player never matches,
 *    even if the accompanying name is identical (wrong-id data).
 * 3. A bare name matches only when it is unique across all players.
 * 4. A duplicated bare name matches only with team-side proof: the
 *    evidence side must be one of the player's teams for that match.
 */
export function isSamePlayer(
  evidence: PlayerEvidence,
  player: any,
  match: any,
  index: PlayerIdentityIndex,
  memberships?: any[]
): boolean {
  if (!player || !evidence) return false;
  const targetId = player.id !== undefined && player.id !== null && player.id !== "" ? String(player.id) : "";
  const targetName = normalizePlayerName(player.name);
  const refId = evidence.id !== undefined && evidence.id !== null && evidence.id !== "" ? String(evidence.id) : "";
  const refName = normalizePlayerName(evidence.name);

  if (refId) {
    if (targetId && refId === targetId) return true;
    if (index.ids.has(refId)) return false;
    // Legacy payloads sometimes carry a NAME inside id-ish fields (e.g. mvpId).
    if (!targetName || normalizePlayerName(refId) !== targetName) return false;
  } else if (!targetName || refName !== targetName) {
    return false;
  }

  if ((index.nameCounts.get(targetName) || 0) <= 1) return true;

  const side = evidence.side === "home" || evidence.side === "away" ? evidence.side : null;
  if (!side || !match) return false;
  const refs = collectPlayerTeamRefs(player, memberships || [], match);
  return refs.some((r) => playerTeamMatchesSide(r, match, side));
}