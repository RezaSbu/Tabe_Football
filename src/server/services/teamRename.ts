import type { DirtyTable } from "./database";

/**
 * Team names are denormalized all over the database (matches, rosters, season
 * archives, standings snapshots, TOTW cards, club transfer lists). Matches for
 * lower leagues even carry no team ids at all — the name IS the join key — so
 * a rename that only touches teams.name silently splits a club in two (empty
 * match list, duplicated table row, players pointing at a ghost team).
 *
 * This helper rewrites every functional copy in memory in one place. The caller
 * marks the returned tables dirty so the change is persisted in the same save.
 * Editorial text (news, transfer-news items) is intentionally left alone: past
 * articles keep the name they were published with.
 */
export interface TeamRenameInput {
  teamId: string;
  previousName: string;
  newName: string;
  previousLogo?: string | null;
  newLogo?: string | null;
}

export interface TeamRenameResult {
  changed: boolean;
  tables: DirtyTable[];
}

const same = (a: any, b: any) => String(a ?? "").trim() === String(b ?? "").trim();

export function propagateTeamRename(db: any, input: TeamRenameInput): TeamRenameResult {
  const { teamId, previousName, newName } = input;
  const nameChanged = !!newName && previousName !== newName;
  const logoChanged = String(input.newLogo || "") !== String(input.previousLogo || "");
  if (!nameChanged && !logoChanged) return { changed: false, tables: [] };

  const tables = new Set<DirtyTable>();
  const belongsToTeam = (row: any) =>
    same(row?.teamId, teamId) || same(row?.teamName, previousName);

  // Matches: snapshots double as the join key for leagues without ids.
  (db.matches || []).forEach((match: any) => {
    const isHome = same(match.teamHomeId, teamId) || same(match.teamHome, previousName);
    const isAway = same(match.teamAwayId, teamId) || same(match.teamAway, previousName);
    if (isHome) {
      if (nameChanged) match.teamHome = newName;
      if (logoChanged) match.teamHomeLogo = input.newLogo || "";
    }
    if (isAway) {
      if (nameChanged) match.teamAway = newName;
      if (logoChanged) match.teamAwayLogo = input.newLogo || "";
    }
    if (isHome || isAway) tables.add("matches");
  });

  if (nameChanged) {
    (db.players || []).forEach((p: any) => {
      if (belongsToTeam(p)) {
        p.teamName = newName;
        tables.add("players");
      }
    });
    (db.coaches || []).forEach((c: any) => {
      if (belongsToTeam(c)) {
        c.teamName = newName;
        tables.add("coaches");
      }
    });
    ([
      ["playerSeasonStats", "playerSeasonStats"],
      ["coachSeasonStats", "coachSeasonStats"],
      ["teamSeasonStats", "teamSeasonStats"],
    ] as const).forEach(([key, table]) => {
      (db[key] || []).forEach((row: any) => {
        if (belongsToTeam(row)) {
          row.teamName = newName;
          tables.add(table);
        }
      });
    });

    // Standings are published snapshots: keep the displayed row in sync.
    Object.values(db.standings || {}).forEach((rows: any) => {
      if (!Array.isArray(rows)) return;
      rows.forEach((row: any) => {
        if (same(row?.id, teamId) || same(row?.team, previousName)) {
          row.team = newName;
          tables.add("standings");
        }
      });
    });

    // Team-of-the-week cards store name + team on every picked player.
    (db.selectedCombinations || []).forEach((sc: any) => {
      const players = sc?.players;
      if (!players || typeof players !== "object") return;
      Object.values(players).forEach((entry: any) => {
        if (entry && same(entry.teamName, previousName)) {
          entry.teamName = newName;
          tables.add("selectedCombinations");
        }
      });
    });

    // Club transfer hub rows are structural (season data), not news.
    (db.teamTransfersList || []).forEach((row: any) => {
      if (same(row?.teamName, previousName)) {
        row.teamName = newName;
        if (logoChanged && "teamLogo" in row) row.teamLogo = input.newLogo || "";
        tables.add("teamTransfersList");
      }
    });
  }

  if (tables.size > 0) tables.add("teams");
  return { changed: tables.size > 0, tables: [...tables] };
}
