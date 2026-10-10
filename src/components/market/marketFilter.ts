import { normalizePersianString } from "../../utils";
import { resolveTeam, resolveTeamLeague } from "../../shared/teamMatch";

export interface MarketFilters {
  query: string;
  positions: string[];
  teamId: string;
  league: string;
  ageMin: number | null;
  ageMax: number | null;
  valueMin: number | null;
  valueMax: number | null;
  valueMissing: "include" | "only" | "exclude";
  freeAgent: boolean;
  nationality: string;
  foot: string;
  minMatches: number | null;
  minRating: number | null;
  minGoals: number | null;
  minAssists: number | null;
}

export const EMPTY_FILTERS: MarketFilters = {
  query: "",
  positions: [],
  teamId: "",
  league: "",
  ageMin: null,
  ageMax: null,
  valueMin: null,
  valueMax: null,
  valueMissing: "include",
  freeAgent: false,
  nationality: "",
  foot: "",
  minMatches: null,
  minRating: null,
  minGoals: null,
  minAssists: null,
};

export interface MarketRow {
  player: any;
  team: any | null;
  leagueKey: string | null;
  age: number | null;
  value: number | null;
  avg: number | null;
  matches: number;
  goals: number;
  assists: number;
}

const isFreeAgent = (p: any): boolean =>
  !p.teamId || ["بازیکن آزاد", "بدون باشگاه", ""].includes(String(p.teamName || "").trim());

/** Builds one flat row per player with every filterable/sortable facet. */
export function buildMarketRows(players: any[], teams: any[]): MarketRow[] {
  return (players || [])
    .filter((p: any) => p && p.id && !String(p.id).startsWith("futsal-"))
    .map((p: any) => {
      const team = resolveTeam(teams, p.teamId || p.teamName);
      const leagueKey = resolveTeamLeague(teams, p.teamId, p.teamName);
      const age = Number(p.age) > 0 ? Number(p.age) : null;
      const value = p.marketValue?.value != null ? Number(p.marketValue.value) : null;
      const avg = Number(p.seasonStats?.averageRating ?? p.averageRating ?? 0) || null;
      return {
        player: p,
        team: team || null,
        leagueKey,
        age,
        value,
        avg,
      matches: Number(p.seasonStats?.matches ?? 0) || 0,
      goals: Number(p.seasonStats?.goals ?? 0) || 0,
      assists: Number(p.seasonStats?.assists ?? 0) || 0,
    };
  });
}

interface Check {
  active: boolean;
  pass: boolean;
}

/** Applies filters (AND semantics): a row must pass every active filter. */
export function applyMarketFilters(rows: MarketRow[], f: MarketFilters): MarketRow[] {
  const q = normalizePersianString(f.query || "");
  const out: MarketRow[] = [];
  for (const row of rows) {
    const p = row.player;
    const checks: Check[] = [];
    if (q) {
      const hay = normalizePersianString(`${p.name || ""} ${p.teamName || ""}`);
      checks.push({ active: true, pass: hay.includes(q) });
    }
    if (f.positions.length > 0) {
      checks.push({ active: true, pass: f.positions.includes(String(p.position || "")) });
    }
    if (f.teamId) {
      checks.push({ active: true, pass: String(p.teamId || "") === String(f.teamId) });
    }
    if (f.league) {
      checks.push({ active: true, pass: String(row.leagueKey || "") === String(f.league) });
    }
    if (f.ageMin != null) checks.push({ active: true, pass: row.age != null && row.age >= f.ageMin });
    if (f.ageMax != null) checks.push({ active: true, pass: row.age != null && row.age <= f.ageMax });
    if (f.valueMin != null || f.valueMax != null) {
      const inRange =
        row.value != null &&
        (f.valueMin == null || row.value >= f.valueMin) &&
        (f.valueMax == null || row.value <= f.valueMax);
      checks.push({ active: true, pass: inRange });
    }
    if (f.valueMissing === "only") checks.push({ active: true, pass: row.value == null });
    if (f.valueMissing === "exclude") checks.push({ active: true, pass: row.value != null });
    if (f.freeAgent) checks.push({ active: true, pass: isFreeAgent(p) });
    if (f.nationality) checks.push({ active: true, pass: String(p.nationality || "") === String(f.nationality) });
    if (f.foot) checks.push({ active: true, pass: String(p.foot || "") === String(f.foot) });
    if (f.minMatches != null) checks.push({ active: true, pass: row.matches >= f.minMatches });
    if (f.minRating != null) checks.push({ active: true, pass: row.avg != null && row.avg >= f.minRating });
    if (f.minGoals != null) checks.push({ active: true, pass: row.goals >= f.minGoals });
    if (f.minAssists != null) checks.push({ active: true, pass: row.assists >= f.minAssists });
    if (checks.length === 0) {
      out.push(row);
      continue;
    }
    if (!checks.every((c) => c.pass)) continue;
    out.push(row);
  }
  return out;
}

export type MarketSort = "rating" | "tf" | "value" | "age" | "goals" | "matches";

/** Sorts rows; nulls always sink regardless of direction. */
export function sortMarketRows(rows: MarketRow[], sort: MarketSort, dir: 1 | -1): MarketRow[] {
  const val = (r: MarketRow): number | null => {
    switch (sort) {
      case "rating": return r.avg;
      case "tf": {
        const t = Number(r.player.seasonStats?.tfRating);
        return Number.isFinite(t) ? t : null;
      }
      case "value": return r.value;
      case "age": return r.age;
      case "goals": return r.goals;
      default: return r.matches;
    }
  };
  return [...rows].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return (vb - va) * dir;
  });
}

/** CSV export of filtered rows (UTF-8 BOM for Excel). Pure and unit-tested. */
export function marketRowsToCsv(rows: MarketRow[]): string {
  const cell = (v: any): string => {
    const s = v == null ? "" : String(v);
    // Quote on ASCII comma/quote/newline AND Persian comma/semicolon so
    // Excel locales never split a name field.
    return /[",\n،؛]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    ["نام", "پست", "سن", "باشگاه", "بازی", "گل", "پاس گل", "نمره", "TF", "ارزش", "واحد"].join(","),
  ];
  for (const r of rows) {
    const p = r.player;
    lines.push(
      [
        cell(p.name),
        cell(p.position),
        cell(r.age),
        cell(p.teamName),
        cell(r.matches),
        cell(r.goals),
        cell(r.assists),
        cell(r.avg),
        cell(p.seasonStats?.tfRating),
        cell(r.value),
        cell(p.marketValue?.currency),
      ].join(",")
    );
  }
  return "\ufeff" + lines.join("\n");
}

/** Shortlist persistence (device-local, no backend). */
const SHORTLIST_KEY = "tabe-market-shortlist";
export function loadShortlist(): string[] {
  try {
    const raw = localStorage.getItem(SHORTLIST_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}
export function saveShortlist(ids: string[]): void {
  try {
    localStorage.setItem(SHORTLIST_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable: shortlist stays in-memory */
  }
}

/** Distinct option lists derived from real data (positions/teams/nationalities). */
export function marketOptions(rows: MarketRow[], teams: any[]) {
  const positions = [...new Set(rows.map((r) => String(r.player.position || "")).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fa")
  );
  const nationalities = [...new Set(rows.map((r) => String(r.player.nationality || "")).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fa")
  );
  const clubs = [...teams]
    .filter((t: any) => t && !String(t.id || "").startsWith("futsal-"))
    .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || ""), "fa"));
  const values = rows.map((r) => r.value).filter((v): v is number => v != null);
  const ages = rows.map((r) => r.age).filter((a): a is number => a != null);
  return {
    positions,
    nationalities,
    clubs,
    valueMax: values.length > 0 ? Math.max(...values) : 1000000000,
    ageMin: ages.length > 0 ? Math.min(...ages) : 16,
    ageMax: ages.length > 0 ? Math.max(...ages) : 40,
  };
}
