import { buildPlayerIdentityIndex, isSamePlayer } from "./playerIdentity";

/**
 * Autonomous Sync Resolver — shared detect/recompute engine.
 *
 * Single source of truth for "what is inconsistent" AND "what the fix is":
 * the scanner and every heal path (per-record approve, gated global repair)
 * must use these functions, so detection can never disagree with repair.
 *
 * AUTHORITATIVE RULES (mirror the server recalc in stats.ts):
 *  - Only finished, non-auto-finished matches count. Auto-finished rows are
 *    deliberately excluded by the server; counting them is a false positive.
 *  - Player "current" values come from the stored `seasonStats` object
 *    (the field the profile pages display). Legacy top-level `goals` /
 *    `assists` / `matchesPlayed` keys are only a fallback — comparing a
 *    phantom field is what produced the Mohammadi false positive.
 *  - A stored total explained by history (`current === computed + base_*`)
 *    is legitimate imported history, not an error.
 *  - Team names are normalized before joining (trailing spaces / ZWNJ /
 *    ي-ك variants must not become phantom mismatches).
 *  - NaN scores never count (a single scoreless row must not poison a table).
 *  - Season scoping: when finished matches span several seasons, standings
 *    are checked against the current season only, and lumped player totals
 *    are reported as MULTI_SEASON (unverifiable per season) instead of
 *    being silently "repaired" across seasons.
 */

export type ResolverReason =
  | "STALE_TABLE"
  | "REAL_MISMATCH"
  | "NAME_MISMATCH"
  | "MULTI_SEASON";

export type ResolverSeverity = "high" | "medium" | "low";
export type ScopeMode = { mode: "all" } | { mode: "season"; currentSeasonId: string };

/** Single scope resolution shared by detect AND heal. */
export function resolveScope(matches: any[], currentSeasonId?: string | null): { scope: ScopeMode; label: string; multiSeason: boolean } {
  const finishedNonAuto = (matches || []).filter((m) => m.status === "finished" && m.isAutoFinished !== true);
  const seasonKeys = new Set(finishedNonAuto.map(seasonKeyOf));
  const multiSeason = seasonKeys.size > 1;
  if (multiSeason && currentSeasonId) {
    return { scope: { mode: "season", currentSeasonId: String(currentSeasonId) }, label: String(currentSeasonId), multiSeason };
  }
  return {
    scope: { mode: "all" },
    label: seasonKeys.size === 1 ? [...seasonKeys][0] : "all",
    multiSeason,
  };
}
export type ResolverConfidence = "high" | "medium";

export interface ResolverFinding {
  type: "standing" | "player";
  id: string;
  name: string;
  field: string;
  currentValue: any;
  computedValue: any;
  details: string;
  reason: ResolverReason;
  severity: ResolverSeverity;
  confidence: ResolverConfidence;
  scope: string;
}

export interface ResolverSummary {
  total: number;
  eligible: number;
  byReason: Record<string, number>;
  skippedAutoFinished: number;
  baselineExplained: number;
  autoExplained: number;
  scopes: string[];
}

export interface ResolverInput {
  matches: any[];
  players: any[];
  standings: Record<string, any[]>;
  /** Season id the standings tables reflect (e.g. from data.currentSeason). */
  currentSeasonId?: string | null;
}

/**
 * Leagues covered by the resolver.
 *
 * NOTE: futsal is deliberately NOT diagnosed here. Futsal was removed from
 * the frontend and kept as an archive only, so its standings/rows are frozen
 * history — scanning them would only produce unactionable noise (all of the
 * first 12 post-rewrite findings were futsal name-variants). If futsal ever
 * returns to the frontend, add it back to this list.
 */
export const RESOLVER_LEAGUES = ["pro-league", "league-1", "league-2-group-a", "league-2-group-b"];

const LEAGUE_FA: Record<string, string> = {
  "pro-league": "لیگ برتر",
  futsal: "فوتسال",
  "hazfi-cup": "جام حذفی",
  "league-1": "لیگ یک",
  "league-2-group-a": "لیگ دو - الف",
  "league-2-group-b": "لیگ دو - ب",
};

/** Passed from client heal paths so the server can audit who repaired what. */
export interface HealContext {
  reason: string;
  findings: string[];
}

/** Global heal may only execute these: explicit, high-signal, non-destructive. */
export function isHealEligible(f: ResolverFinding): boolean {
  return (f.reason === "STALE_TABLE" || f.reason === "REAL_MISMATCH") && f.severity !== "low";
}

export function reasonFa(reason: ResolverReason): string {
  switch (reason) {
    case "STALE_TABLE": return "جدول از بازی‌ها عقب است";
    case "REAL_MISMATCH": return "ناسازگاری واقعی";
    case "NAME_MISMATCH": return "اختلاف نام (نیازمند اصلاح نام، نه عدد)";
    case "MULTI_SEASON": return "چندفصلی — نیازمند بازبینی دستی";
  }
}

export function severityFa(severity: ResolverSeverity): string {
  switch (severity) {
    case "high": return "مهم";
    case "medium": return "متوسط";
    case "low": return "کم";
  }
}

/** Finite numbers only — a scoreless/NaN row must never poison a table. */
export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Mirror of server normalizePersianString for team-name joins. */
export function normName(v: unknown): string {
  if (v == null) return "";
  return String(v)
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\s\t]+/g, " ")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .toLowerCase();
}

function seasonKeyOf(m: any): string {
  const k = m.seasonId != null && String(m.seasonId) !== "" ? String(m.seasonId) : m.season != null && String(m.season) !== "" ? String(m.season) : "";
  return k !== "" ? k : "unseasoned";
}

function seasonMatchesScope(key: string, currentSeasonId: string | null | undefined): boolean {
  if (currentSeasonId == null || currentSeasonId === "") return true;
  const cur = String(currentSeasonId);
  return key === cur || key === cur.replace(/^season-/, "") || `season-${key}` === cur;
}

interface Tally { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number; }
const zeroTally = (): Tally => ({ played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });

function addMatch(t: Tally, sh: number, sa: number): void {
  t.played += 1;
  t.goalsFor += sh;
  t.goalsAgainst += sa;
  if (sh > sa) { t.won += 1; t.points += 3; }
  else if (sh < sa) { t.lost += 1; }
  else { t.drawn += 1; t.points += 1; }
}

export interface StandingComputation {
  table: Record<string, Tally>;
  seenNames: Set<string>;
  poolSize: number;
  autoSkipped: number;
}

/** Shared standings recompute — used by BOTH detect and heal. */
export function computeStandingTable(leagueKey: string, matches: any[], scope: ScopeMode): StandingComputation {
  const table: Record<string, Tally> = {};
  const seenNames = new Set<string>();
  let poolSize = 0;
  let autoSkipped = 0;
  for (const m of matches || []) {
    if (m.status !== "finished") continue;
    if (m.isAutoFinished === true) { autoSkipped += 1; continue; }
    if (m.league !== leagueKey) continue;
    if (scope.mode === "season" && !seasonMatchesScope(seasonKeyOf(m), scope.currentSeasonId)) continue;
    const hn = normName(m.teamHome);
    const an = normName(m.teamAway);
    if (!hn || !an) continue;
    if (!table[hn]) table[hn] = zeroTally();
    if (!table[an]) table[an] = zeroTally();
    seenNames.add(hn);
    seenNames.add(an);
    poolSize += 1;
    const sh = num(m.scoreHome);
    const sa = num(m.scoreAway);
    addMatch(table[hn], sh, sa);
    addAway(table[an], sh, sa);
  }
  return { table, seenNames, poolSize, autoSkipped };
}

function addAway(t: Tally, sh: number, sa: number): void {
  t.played += 1;
  t.goalsFor += sa;
  t.goalsAgainst += sh;
  if (sa > sh) { t.won += 1; t.points += 3; }
  else if (sa < sh) { t.lost += 1; }
  else { t.drawn += 1; t.points += 1; }
}

export interface PlayerTallies { goals: number; assists: number; matches: number; }

/** Shared player recompute — used by BOTH detect and heal. */
export function computePlayerTallies(player: any, matches: any[], identityIndex: any): PlayerTallies {
  let goals = 0;
  let assists = 0;
  let played = 0;
  const selfName = normName(player.teamName);
  for (const m of matches || []) {
    if (m.status !== "finished") continue;
    if (m.isAutoFinished === true) continue;
    const same = (ref: { id?: any; name?: any }, side: "home" | "away" | null) =>
      isSamePlayer({ ...ref, side }, player, m, identityIndex, []);
    if (selfName && (normName(m.teamHome) === selfName || normName(m.teamAway) === selfName)) {
      played += 1;
    }
    if (m.events && m.events.length > 0) {
      for (const ev of m.events) {
        if (!ev) continue;
        if (ev.type === "goal" || ev.type === "penalty") {
          if (same({ id: ev.playerId, name: ev.playerName }, ev.team)) goals += 1;
          if (same({ id: ev.player2Id, name: ev.player2Name }, ev.team)) assists += 1;
        } else if (ev.type === "assist") {
          if (same({ id: ev.playerId, name: ev.playerName }, ev.team) && !ev.player2Name) assists += 1;
          if (same({ id: ev.player2Id, name: ev.player2Name }, ev.team)) assists += 1;
        }
      }
    }
    const scorers = m.scorersList || [];
    for (const sc of scorers) {
      if (!sc) continue;
      if (same({ id: sc.scorerId, name: sc.scorerName || sc.name }, null)) {
        const dup = m.events && m.events.some((ev: any) => ev && (ev.type === "goal" || ev.type === "penalty") && same({ id: ev.playerId, name: ev.playerName }, ev.team));
        if (!dup) goals += 1;
      }
      if (same({ id: sc.assistId, name: sc.assistName || sc.assist }, null)) {
        const dup = m.events && m.events.some((ev: any) => ev && (ev.type === "goal" || ev.type === "assist") && (same({ id: ev.player2Id, name: ev.player2Name }, ev.team) || same({ id: ev.playerId, name: ev.playerName }, ev.team)));
        if (!dup) assists += 1;
      }
    }
  }
  return { goals, assists, matches: played };
}

/** Stored truth for a player: seasonStats first, legacy top-level keys only as fallback. */
export function storedPlayerStats(p: any): { goals: number; assists: number; matches: number } {
  const ss = p.seasonStats || {};
  return {
    goals: num(ss.goals ?? (p as any).goals ?? 0),
    assists: num(ss.assists ?? (p as any).assists ?? 0),
    matches: num(ss.matches ?? (p as any).matchesPlayed ?? 0),
  };
}

function storedBase(p: any): { goals: number; assists: number; matches: number } {
  return { goals: num(p.baseGoals), assists: num(p.baseAssists), matches: num(p.baseMatches) };
}

export function computeResolverFindings(input: ResolverInput): { findings: ResolverFinding[]; summary: ResolverSummary } {
  const matches = input.matches || [];
  const players = input.players || [];
  const standings = input.standings || {};
  const findings: ResolverFinding[] = [];
  const byReason: Record<string, number> = {};
  let baselineExplained = 0;
  const bump = (r: string) => { byReason[r] = (byReason[r] || 0) + 1; };

  // Season scope shared with heal paths (single resolution, no divergence).
  const { scope, label: scopeLabel, multiSeason } = resolveScope(matches, input.currentSeasonId);
  const skippedAutoFinished = matches.filter((m) => m.status === "finished" && m.isAutoFinished === true).length;
  let autoExplained = 0;

  // ---- 1. standings ----
  for (const leagueKey of RESOLVER_LEAGUES) {
    const rows: any[] = standings[leagueKey] || [];
    if (rows.length === 0) continue;
    const { table } = computeStandingTable(leagueKey, matches, scope);
    const lName = LEAGUE_FA[leagueKey] || leagueKey;
    for (const row of rows) {
      const n = normName(row.team);
      const comp = table[n];
      if (!comp) {
        const tableNonZero = num(row.played) > 0 || num(row.points) > 0 || num(row.goalsFor) > 0;
        if (tableNonZero) {
          findings.push({
            type: "standing", id: leagueKey, name: `${lName} — ${row.team}`, field: "نام تیم",
            currentValue: row.team, computedValue: "در بازی‌ها یافت نشد",
            details: `ردیف جدول عدد دارد ولی نام نرمال‌شده آن در هیچ بازی تمام‌شده این لیگ نیست؛ احتمال اختلاف نگارشی نام است — عدد را صفر نکنید، نام را اصلاح کنید.`,
            reason: "NAME_MISMATCH", severity: "low", confidence: "medium", scope: scopeLabel,
          });
          bump("NAME_MISMATCH");
        }
        continue;
      }
      const push = (field: string, cur: any, val: any, det: string, sev: ResolverSeverity) =>
        findings.push({
          type: "standing", id: leagueKey, name: `${lName} — ${row.team}`, field,
          currentValue: cur, computedValue: val, details: det,
          reason: multiSeason && scope.mode === "all" ? "MULTI_SEASON" : "STALE_TABLE",
          severity: multiSeason && scope.mode === "all" ? "low" : sev,
          confidence: "high", scope: scopeLabel,
        });
      if (num(row.points) !== comp.points) {
        push("امتیاز", num(row.points), comp.points, `جدول: ${num(row.points)} | محاسبه از بازی‌ها: ${comp.points}`, "high");
        bump(multiSeason && scope.mode === "all" ? "MULTI_SEASON" : "STALE_TABLE");
      }
      if (num(row.played) !== comp.played) {
        push("بازی‌ها", num(row.played), comp.played, `جدول: ${num(row.played)} | بازی‌های واقعی: ${comp.played}`, "high");
        bump(multiSeason && scope.mode === "all" ? "MULTI_SEASON" : "STALE_TABLE");
      }
      if (num(row.goalsFor) !== comp.goalsFor || num(row.goalsAgainst) !== comp.goalsAgainst) {
        push("گل‌های زده/خورده", `${num(row.goalsFor)}-${num(row.goalsAgainst)}`, `${comp.goalsFor}-${comp.goalsAgainst}`, `جدول: ${num(row.goalsFor)}-${num(row.goalsAgainst)} | محاسبه: ${comp.goalsFor}-${comp.goalsAgainst}`, "medium");
        bump(multiSeason && scope.mode === "all" ? "MULTI_SEASON" : "STALE_TABLE");
      }
    }
  }

  // ---- 2. players ----
  const identityIndex = buildPlayerIdentityIndex(players);
  const autoByTeam = new Map<string, number>();
  for (const m of matches) {
    if (m.status !== "finished" || m.isAutoFinished !== true) continue;
    for (const side of [normName(m.teamHome), normName(m.teamAway)]) {
      if (side) autoByTeam.set(side, (autoByTeam.get(side) || 0) + 1);
    }
  }
  for (const p of players) {
    const cur = storedPlayerStats(p);
    const base = storedBase(p);
    const t = computePlayerTallies(p, matches, identityIndex);
    const check = (field: string, labelFa: string, c: number, v: number, b: number, sev: ResolverSeverity) => {
      if (c === v) return;
      if (b > 0 && c === v + b) { baselineExplained += 1; return; } // legitimate history
      if (multiSeason) {
        findings.push({
          type: "player", id: p.id, name: `${p.name} (${p.teamName})`, field: labelFa,
          currentValue: c, computedValue: v,
          details: `مجموع ذخیره‌شده چندفصل را پوشش می‌دهد و به‌تفکیک فصل قابل راستی‌آزمایی نیست؛ فقط بازبینی دستی.`,
          reason: "MULTI_SEASON", severity: "low", confidence: "medium", scope: "all",
        });
        bump("MULTI_SEASON");
        return;
      }
      findings.push({
        type: "player", id: p.id, name: `${p.name} (${p.teamName})`, field: labelFa,
        currentValue: c, computedValue: v,
        details: b > 0
          ? `اختلاف با وجود baseline غیرصفر (${b})؛ نه با بازی‌ها و نه با تاریخچه جور نیست — بازبینی دستی لازم است.`
          : `مقدار ذخیره‌شده (${c}) با بازشماری ایونت‌ها (${v}) نمی‌خواند.`,
        reason: "REAL_MISMATCH", severity: b > 0 ? "medium" : sev, confidence: "medium", scope: scopeLabel,
      });
      bump("REAL_MISMATCH");
    };
    check("goals", "گل‌های زده", cur.goals, t.goals, base.goals, "high");
    check("assists", "پاس گل", cur.assists, t.assists, base.assists, "high");
    // Appearances: team-equality participation OVERCOUNTS by design (bench /
    // transfers / new signings never played every team game). Only an
    // OVER-claim (stored more than the team itself played) is a real signal,
    // and even then review-only: the true count is unknown, never auto-heal.
    if (cur.matches > t.matches && !(base.matches > 0 && cur.matches === t.matches + base.matches)) {
      // Stored total includes the team's auto-finished games (an older path
      // counted them; the server deliberately excludes them) — explained.
      const autoN = autoByTeam.get(normName(p.teamName)) || 0;
      if (autoN > 0 && cur.matches === t.matches + autoN) {
        autoExplained += 1;
        continue;
      }
      if (multiSeason) {
        findings.push({
          type: "player", id: p.id, name: `${p.name} (${p.teamName})`, field: "بازی‌ها",
          currentValue: cur.matches, computedValue: t.matches,
          details: `مجموع چندفصلی؛ فقط بازبینی دستی.`,
          reason: "MULTI_SEASON", severity: "low", confidence: "medium", scope: "all",
        });
        bump("MULTI_SEASON");
      } else {
        findings.push({
          type: "player", id: p.id, name: `${p.name} (${p.teamName})`, field: "بازی‌ها",
          currentValue: cur.matches, computedValue: t.matches,
          details: `بازیکن بیشتر از تعداد بازی‌های تیمش بازی ثبت کرده است؛ مقدار واقعی نامشخص است — فقط بازبینی دستی، هرگز ترمیم خودکار.`,
          reason: "REAL_MISMATCH", severity: "low", confidence: "medium", scope: scopeLabel,
        });
        bump("REAL_MISMATCH");
      }
    } else if (base.matches > 0 && cur.matches === t.matches + base.matches) {
      baselineExplained += 1;
    }
  }

  // Cross-contamination guard: if a league has name-variant rows, its numeric
  // STALE_TABLE findings may be partial counts (same team under two spellings).
  // Downgrade them to review-only — a global heal would destroy the variant's share.
  const taintedLeagues = new Set(
    findings.filter((f) => f.reason === "NAME_MISMATCH").map((f) => f.id)
  );
  for (const f of findings) {
    if (f.reason === "STALE_TABLE" && taintedLeagues.has(f.id)) {
      f.severity = "low";
      f.details += " (در این لیگ اختلاف نام هم دیده شده؛ ممکن است شمارش ناقص باشد.)";
    }
  }

  const eligible = findings.filter(isHealEligible).length;
  return {
    findings,
    summary: {
      total: findings.length,
      eligible,
      byReason,
      skippedAutoFinished,
      baselineExplained,
      autoExplained,
      scopes: [...new Set(findings.map((f) => f.scope))],
    },
  };
}

/** Full corrected + ranked rows for one league — the ONLY standings repair path. */
export function buildCorrectedStandingRows(leagueKey: string, rows: any[], matches: any[], scope: ScopeMode): any[] {
  const { table } = computeStandingTable(leagueKey, matches, scope);
  const corrected = (rows || []).map((row: any) => {
    const comp = table[normName(row.team)];
    // NAME_MISMATCH rows are never zeroed: keep them untouched for manual rename.
    if (!comp) return row;
    return {
      ...row,
      played: comp.played, won: comp.won, drawn: comp.drawn, lost: comp.lost,
      goalsFor: comp.goalsFor, goalsAgainst: comp.goalsAgainst,
      goalDifference: comp.goalsFor - comp.goalsAgainst, points: comp.points,
    };
  });
  corrected.sort((a: any, b: any) => {
    if (num(b.points) !== num(a.points)) return num(b.points) - num(a.points);
    const gd = num(b.goalsFor) - num(b.goalsAgainst) - (num(a.goalsFor) - num(a.goalsAgainst));
    if (gd !== 0) return gd;
    return num(b.goalsFor) - num(a.goalsFor);
  });
  return corrected.map((r: any, i: number) => ({ ...r, rank: i + 1 }));
}
