/**
 * Single source of truth for competition labels shown on match tags.
 *
 * Rule: the label comes ONLY from the match's own `league` value.
 * Unknown / missing values fall back to a NEUTRAL label — never to a
 * real competition name (a missing league must not render as "Hazfi Cup").
 */
export const LEAGUE_LABELS: Record<string, string> = {
  "pro-league": "لیگ برتر خلیج فارس",
  "league-1": "لیگ آزادگان",
  "league-2": "لیگ دسته دوم",
  "hazfi-cup": "جام حذفی",
  futsal: "لیگ برتر فوتسال",
};

export const UNKNOWN_COMPETITION_LABEL = "رقابت‌های کشوری";

export function getLeagueLabel(league: unknown): string {
  if (typeof league !== "string") return UNKNOWN_COMPETITION_LABEL;
  const key = league.trim();
  if (!key) return UNKNOWN_COMPETITION_LABEL;
  return LEAGUE_LABELS[key] ?? UNKNOWN_COMPETITION_LABEL;
}
