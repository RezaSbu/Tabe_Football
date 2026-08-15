import { normalizePersianString } from "../server/utils/persian";

export interface TeamLike {
  id?: string | number;
  name?: string;
  [key: string]: any;
}

/**
 * Resolves a team by id, then exact normalized name, then the most specific
 * substring match. This prevents collisions between overlapping names such as
 * "استقلال" and "استقلال خوزستان" where a naive `.includes()` first match
 * would pick the wrong team based on array order.
 */
export function resolveTeam<T extends TeamLike>(teams: T[], identifier?: string | number | null): T | null {
  if (!identifier || !Array.isArray(teams) || teams.length === 0) return null;
  const raw = String(identifier).trim();
  if (!raw) return null;

  const byId = teams.find((t) => t && String(t.id) === raw);
  if (byId) return byId;

  const normInput = normalizePersianString(raw);
  if (!normInput) return null;

  const byExactName = teams.filter((t) => normalizePersianString(t?.name || "") === normInput);
  if (byExactName.length === 1) return byExactName[0];

  const containsInput = teams
    .filter((t) => {
      const n = normalizePersianString(t?.name || "");
      return !!n && n.includes(normInput);
    })
    .sort((a, b) => normalizePersianString(a.name || "").length - normalizePersianString(b.name || "").length);
  if (containsInput.length) return containsInput[0];

  const containedInInput = teams
    .filter((t) => {
      const n = normalizePersianString(t?.name || "");
      return !!n && normInput.includes(n);
    })
    .sort((a, b) => normalizePersianString(b.name || "").length - normalizePersianString(a.name || "").length);
  if (containedInInput.length) return containedInInput[0];

  return null;
}

/**
 * Exact (normalized) name comparison helper for matching teams by name
 * without substring false positives.
 */
export const isExactTeamName = (a?: string, b?: string): boolean =>
  !!a && !!b && normalizePersianString(a) === normalizePersianString(b);
