/**
 * Per-position leaderboards ("best of each position").
 *
 * A plain average-rating leaderboard is dominated by one hot cameo, and it
 * tells a reader nothing about who is the best goalkeeper / defender /
 * midfielder / forward. These helpers bucket rated players into the eight
 * positions the portal publishes — the four broad lines plus the left/right
 * specialities readers actually search for.
 *
 * Gate: a player needs at least MIN_MATCHES played in the scope (season or
 * career) to be listed — a 9.0 in a single game must never out-rank a starter
 * who has played every week.
 */

export const MIN_MATCHES_FOR_POSITION_LIST = 3;

/** How many rows a board shows before "نمایش همه" expands it. */
export const POSITION_LIST_SIZE = 5;

/** Order matters: it is the exact render order of the eight boards. */
export type PositionGroupKey = "gk" | "cb" | "lb" | "rb" | "cm" | "rm" | "lm" | "fw";

export interface PositionGroup {
  key: PositionGroupKey;
  label: string;
  short: string;
  test: (position: string) => boolean;
}

const isDefender = (value: string) => value.includes("مدافع");
const isMidfielder = (value: string) => value.includes("هافبک");
const isWinger = (value: string) => value.includes("وینگر");
const isLeft = (value: string) => value.includes("چپ");
const isRight = (value: string) => value.includes("راست");

/**
 * The generic centre roles exclude چپ/راست explicitly instead of relying on
 * array order, so a stored "مدافع راست" can never be counted twice or land in
 * the centre bucket by accident.
 */
export const POSITION_GROUPS: PositionGroup[] = [
  { key: "gk", label: "دروازه‌بان", short: "GK", test: (p) => p.includes("دروازه") },
  { key: "cb", label: "مدافع", short: "CB", test: (p) => isDefender(p) && !isLeft(p) && !isRight(p) },
  { key: "lb", label: "مدافع چپ", short: "LB", test: (p) => isDefender(p) && isLeft(p) },
  { key: "rb", label: "مدافع راست", short: "RB", test: (p) => isDefender(p) && isRight(p) },
  { key: "cm", label: "هافبک", short: "CM", test: (p) => isMidfielder(p) && !isLeft(p) && !isRight(p) },
  // Stored wingers are the right/left midfield slot on this portal.
  { key: "rm", label: "هافبک راست", short: "RM", test: (p) => (isMidfielder(p) || isWinger(p)) && isRight(p) },
  { key: "lm", label: "هافبک چپ", short: "LM", test: (p) => (isMidfielder(p) || isWinger(p)) && isLeft(p) },
  // A side-less winger falls back to the attacking line.
  { key: "fw", label: "مهاجم", short: "FW", test: (p) => p.includes("مهاجم") || (isWinger(p) && !isLeft(p) && !isRight(p)) },
];

export function positionGroupOf(position: string | null | undefined): PositionGroupKey | null {
  const value = String(position ?? "").trim();
  if (!value) return null;
  for (const group of POSITION_GROUPS) {
    if (group.test(value)) return group.key;
  }
  return null;
}

export interface PositionCandidate {
  id: string;
  name: string;
  team: string;
  position: string;
  rating: number;
  matches: number;
}

export interface PositionLeaderGroup {
  key: PositionGroupKey;
  label: string;
  short: string;
  players: PositionCandidate[];
}

/**
 * Groups rated players by position and ranks them inside each group.
 *
 * By default every eligible player is returned so the UI can render five rows
 * plus a "show all" expansion; pass `perGroup` when a caller only wants a
 * fixed-size slice. Groups without a single eligible player are omitted (the
 * caller renders only what exists), and the input is never mutated.
 */
export function buildPositionLeaders(
  candidates: PositionCandidate[],
  options: { minMatches?: number; perGroup?: number } = {}
): PositionLeaderGroup[] {
  const minMatches = options.minMatches ?? MIN_MATCHES_FOR_POSITION_LIST;
  const perGroup = options.perGroup;
  const buckets = new Map<PositionGroupKey, PositionCandidate[]>();

  for (const candidate of candidates || []) {
    if (!candidate || candidate.id == null) continue;
    const rating = Number(candidate.rating);
    const matches = Number(candidate.matches);
    if (!Number.isFinite(rating) || rating <= 0) continue;
    if (!Number.isFinite(matches) || matches < minMatches) continue;
    const group = positionGroupOf(candidate.position);
    if (!group) continue;
    const list = buckets.get(group);
    if (list) list.push(candidate);
    else buckets.set(group, [candidate]);
  }

  const groups: PositionLeaderGroup[] = [];
  for (const group of POSITION_GROUPS) {
    const bucket = buckets.get(group.key);
    if (!bucket || bucket.length === 0) continue;
    const ranked = [...bucket].sort(
      (a, b) =>
        Number(b.rating) - Number(a.rating) ||
        Number(b.matches) - Number(a.matches) ||
        String(a.name).localeCompare(String(b.name), "fa")
    );
    const players = Number.isFinite(perGroup) && Number(perGroup) > 0
      ? ranked.slice(0, Math.floor(Number(perGroup)))
      : ranked;
    groups.push({ key: group.key, label: group.label, short: group.short, players });
  }
  return groups;
}
