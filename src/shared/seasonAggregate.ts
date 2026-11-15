import { PositionCandidate } from "./positionLeaders";
import { normalizeLeagueKey, resolveTeam, resolveTeamLeagueWithFallback } from "./teamMatch";

/**
 * Aggregates raw player-season-stat rows into per-player totals for one scope
 * (a single season, or every season for the career view).
 *
 * The eligibility convention mirrors the server leaderboards: a player belongs
 * to a league through their CURRENT club, while only the numbers are scoped by
 * the rows passed in. That way a mid-season transfer never splits a player into
 * two leaderboard rows.
 *
 * Shared by the stats page and the league tables so the two surfaces can never
 * disagree about who qualifies or which club is displayed.
 */
export interface SeasonAggregateOptions {
  rows: any[];
  players: any[];
  teams: any[];
  /** Which bucket of each row to read ("leagueStats" or "cupStats"). */
  split: "leagueStats" | "cupStats";
  /** Normalized league key, or null for cup scope (no league filter). */
  wantLeague: string | null;
}

export interface AggregatedPlayer {
  id: string;
  name: string;
  team: string;
  position: string;
  goals: number;
  assists: number;
  cleanSheets: number;
  ratingSum: number;
  ratingCount: number;
  matches: number;
}

export function aggregateSeasonRows({
  rows,
  players,
  teams,
  split,
  wantLeague,
}: SeasonAggregateOptions): AggregatedPlayer[] {
  const useCup = wantLeague == null;
  const pById = new Map<string, any>();
  for (const p of players || []) {
    if (p && p.id != null && !pById.has(String(p.id))) pById.set(String(p.id), p);
  }

  const currentClubOf = (pid: string): any | null => {
    const p = pById.get(pid);
    if (!p) return null;
    if (!p.teamId && !p.teamName) return null;
    const name = String(p.teamName || "");
    if (!name || name === "بازیکن آزاد" || name === "بدون باشگاه") return null;
    return resolveTeam(teams, p.teamId || p.teamName) || null;
  };

  const byId = new Map<string, AggregatedPlayer>();
  for (const row of rows || []) {
    if (!row || row.playerId == null) continue;
    const stats = row[split] || {};
    const goals = Number(stats.goals) || 0;
    const assists = Number(stats.assists) || 0;
    const cleanSheets = Number(stats.cleanSheets) || 0;
    const ratingSum = Number(stats.ratingSum) || 0;
    const ratingCount = Number(stats.ratingCount) || 0;
    const matches = Number(stats.matches) || 0;
    if (!useCup && goals === 0 && assists === 0 && cleanSheets === 0 && ratingCount === 0) continue;
    if (useCup && goals === 0 && assists === 0 && cleanSheets === 0) continue;

    const key = String(row.playerId);
    let aggregate = byId.get(key);
    if (!aggregate) {
      const player = pById.get(key);
      aggregate = {
        id: key,
        name: player?.name || "",
        team: "",
        position: player?.position || "",
        goals: 0,
        assists: 0,
        cleanSheets: 0,
        ratingSum: 0,
        ratingCount: 0,
        matches: 0,
      };
      byId.set(key, aggregate);
    }
    aggregate.goals += goals;
    aggregate.assists += assists;
    aggregate.cleanSheets += cleanSheets;
    aggregate.ratingSum += ratingSum;
    aggregate.ratingCount += ratingCount;
    aggregate.matches += matches;
  }

  const output: AggregatedPlayer[] = [];
  for (const aggregate of byId.values()) {
    const club = currentClubOf(aggregate.id);
    if (useCup) {
      if (aggregate.goals === 0 && aggregate.assists === 0 && aggregate.cleanSheets === 0) continue;
    } else {
      // Current club decides the league: players without a club never appear.
      if (!club) continue;
      if (normalizeLeagueKey(resolveTeamLeagueWithFallback(teams, club.id, club.name)) !== wantLeague) continue;
      if (aggregate.goals === 0 && aggregate.assists === 0 && aggregate.cleanSheets === 0 && aggregate.ratingCount === 0) continue;
    }
    const player = pById.get(aggregate.id);
    aggregate.team = club ? club.name : player?.teamName || "";
    output.push(aggregate);
  }
  return output;
}

export function toPositionCandidates(rows: AggregatedPlayer[]): PositionCandidate[] {
  return (rows || []).map((row) => ({
    id: row.id,
    name: row.name,
    team: row.team,
    position: row.position,
    rating: row.ratingCount > 0 ? row.ratingSum / row.ratingCount : 0,
    matches: row.matches,
  }));
}
