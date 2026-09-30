import { normalizePersianString } from "../server/utils/persian";

/** Normalize a tag the same way the related-news route does. */
export function normTag(t: string): string {
  return normalizePersianString(t || "")
    .replace(/^#/, "")
    .replace(/_/g, " ")
    .trim();
}

/**
 * Team news rule (tag-only): the tag must BE the team name.
 * No keyword/text matching — "استقلال" as a tag means the team استقلال.
 */
export function tagEqualsTeamName(tag: string, teamName: string): boolean {
  const t = normTag(tag);
  const n = normalizePersianString(teamName || "").trim();
  return !!t && !!n && t === n;
}

/**
 * Player news rule (tag-only, fuzzy): every word of the tag must appear
 * in the profile name. Tags are stored plain ("علی علیپور", never
 * "علی_علیپور"), and short tags are near-matches:
 * profile "سید حسین حسینی" matches tag "حسین حسینی".
 */
export function tagWordsInPlayerName(tag: string, playerName: string): boolean {
  const tagWords = normTag(tag).split(/\s+/).filter(Boolean);
  if (tagWords.length === 0) return false;
  const nameWords = normalizePersianString(playerName || "")
    .split(/\s+/)
    .filter(Boolean);
  if (nameWords.length === 0) return false;
  return tagWords.every((w) => nameWords.includes(w));
}

/**
 * Match news rule (tag-only): the news must carry the tag of BOTH teams
 * at once. "پرسپولیس vs تراکتور" only matches news whose tags contain
 * both "پرسپولیس" AND "تراکتور" (exact team-name tags).
 */
export function tagMentionsBothTeams(
  news: { tags?: string[] },
  homeName: string,
  awayName: string
): boolean {
  if (!Array.isArray(news?.tags)) return false;
  const home = normalizePersianString(homeName || "").trim();
  const away = normalizePersianString(awayName || "").trim();
  if (!home || !away) return false;
  const tags = news.tags.map((t: string) => normTag(t)).filter(Boolean);
  return tags.some((t: string) => tagEqualsTeamName(t, home)) &&
    tags.some((t: string) => tagEqualsTeamName(t, away));
}

/**
 * Match news rule (text keywords OR tags): the news must reference BOTH
 * teams at once — either via exact team-name tags, or via keyword hits in
 * title/summary/content.
 */
export function matchBelongsTo(
  news: { title?: string; summary?: string; content?: string; tags?: string[] },
  homeName: string,
  awayName: string
): boolean {
  return tagMentionsBothTeams(news, homeName, awayName) ||
    textMentionsBothTeams(news, homeName, awayName);
}

/**
 * Match news rule (text keywords): the news body must mention BOTH teams
 * at once. "استقلال vs سپاهان" only matches news containing "استقلال"
 * AND "سپاهان" somewhere in title/summary/content.
 */
export function textMentionsBothTeams(
  news: { title?: string; summary?: string; content?: string },
  homeName: string,
  awayName: string
): boolean {
  const haystack = normalizePersianString(
    `${news?.title || ""} ${news?.summary || ""} ${news?.content || ""}`
  );
  const home = normalizePersianString(homeName || "").trim();
  const away = normalizePersianString(awayName || "").trim();
  if (!home || !away) return false;
  return haystack.includes(home) && haystack.includes(away);
}
