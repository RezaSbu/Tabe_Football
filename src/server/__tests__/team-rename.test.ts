import { describe, it, expect } from "vitest";
import { propagateTeamRename } from "../services/teamRename";

// Renaming a club must rewrite every functional copy in one pass: matches for
// the lower leagues have no team ids (the name is the join key), so a partial
// rename splits the club in two. Editorially published text stays untouched.

const baseDb = () => ({
  teams: [{ id: "t-1", name: "شهرداری بندرعباس", logo: "old.png" }],
  matches: [
    { id: "m1", teamHome: "شهرداری بندرعباس", teamAway: "حریف", teamHomeId: null, teamAwayId: null, teamHomeLogo: "old.png", teamAwayLogo: "x.png" },
    { id: "m2", teamHome: "حریف", teamAway: "شهرداری بندرعباس", teamHomeId: null, teamAwayId: "t-1", teamHomeLogo: "y.png", teamAwayLogo: "old.png" },
    { id: "m3", teamHome: "تیم دیگر", teamAway: "حریف" },
  ],
  players: [
    { id: "p1", teamId: "t-1", teamName: "شهرداری بندرعباس" },
    { id: "p2", teamId: "t-2", teamName: "شهرداری بندرعباس" },
    { id: "p3", teamId: "t-2", teamName: "تیم دیگر" },
  ],
  coaches: [{ id: "c1", teamId: "t-1", teamName: "شهرداری بندرعباس" }],
  playerSeasonStats: [{ id: "ps1", playerId: "p1", teamId: "t-1", teamName: "شهرداری بندرعباس" }],
  coachSeasonStats: [{ id: "cs1", coachId: "c1", teamId: "t-1", teamName: "شهرداری بندرعباس" }],
  teamSeasonStats: [{ id: "ts1", teamId: "t-1", teamName: "شهرداری بندرعباس" }],
  standings: {
    "league-2-group-a": [
      { id: "t-1", team: "شهرداری بندرعباس", rank: 3 },
      { id: "t-9", team: "تیم دیگر", rank: 4 },
    ],
  },
  selectedCombinations: [
    { id: "sc-1", players: { GK: { name: "p1", teamName: "شهرداری بندرعباس" } } },
  ],
  teamTransfersList: [{ id: "tt1", teamName: "شهرداری بندرعباس", teamLogo: "old.png", incomings: [] }],
  news: [{ id: "n1", title: "شهرداری بندرعباس قهرمان شد", content: "شهرداری بندرعباس" }],
  transfers: [{ id: "tr1", fromTeam: "شهرداری بندرعباس", toTeam: "تیم دیگر" }],
});

describe("propagateTeamRename", () => {
  it("renames every functional copy of the club", () => {
    const db: any = baseDb();
    const result = propagateTeamRename(db, {
      teamId: "t-1",
      previousName: "شهرداری بندرعباس",
      newName: "شهروند بندرعباس",
      previousLogo: "old.png",
      newLogo: "new.png",
    });

    expect(result.changed).toBe(true);
    expect(db.matches[0]).toMatchObject({ teamHome: "شهروند بندرعباس", teamHomeLogo: "new.png" });
    expect(db.matches[1]).toMatchObject({ teamAway: "شهروند بندرعباس", teamAwayLogo: "new.png" });
    expect(db.matches[2].teamHome).toBe("تیم دیگر");

    expect(db.players[0].teamName).toBe("شهروند بندرعباس");
    expect(db.players[1].teamName).toBe("شهروند بندرعباس"); // matched by old name
    expect(db.players[2].teamName).toBe("تیم دیگر");

    expect(db.coaches[0].teamName).toBe("شهروند بندرعباس");
    expect(db.playerSeasonStats[0].teamName).toBe("شهروند بندرعباس");
    expect(db.coachSeasonStats[0].teamName).toBe("شهروند بندرعباس");
    expect(db.teamSeasonStats[0].teamName).toBe("شهروند بندرعباس");

    expect(db.standings["league-2-group-a"][0].team).toBe("شهروند بندرعباس");
    expect(db.standings["league-2-group-a"][1].team).toBe("تیم دیگر");

    expect(db.selectedCombinations[0].players.GK.teamName).toBe("شهروند بندرعباس");
    expect(db.teamTransfersList[0]).toMatchObject({ teamName: "شهروند بندرعباس", teamLogo: "new.png" });
  });

  it("never rewrites published editorial text", () => {
    const db: any = baseDb();
    propagateTeamRename(db, {
      teamId: "t-1",
      previousName: "شهرداری بندرعباس",
      newName: "شهروند بندرعباس",
    });
    expect(db.news[0].title).toContain("شهرداری بندرعباس");
    expect(db.news[0].content).toContain("شهرداری بندرعباس");
    expect(db.transfers[0].fromTeam).toBe("شهرداری بندرعباس");
  });

  it("reports which tables to persist", () => {
    const db: any = baseDb();
    const { tables } = propagateTeamRename(db, {
      teamId: "t-1",
      previousName: "شهرداری بندرعباس",
      newName: "شهروند بندرعباس",
    });
    expect(new Set(tables)).toEqual(new Set([
      "teams", "matches", "players", "coaches", "playerSeasonStats",
      "coachSeasonStats", "teamSeasonStats", "standings",
      "selectedCombinations", "teamTransfersList",
    ]));
  });

  it("is a no-op when nothing changed", () => {
    const db: any = baseDb();
    const result = propagateTeamRename(db, {
      teamId: "t-1",
      previousName: "شهرداری بندرعباس",
      newName: "شهرداری بندرعباس",
      previousLogo: "old.png",
      newLogo: "old.png",
    });
    expect(result).toEqual({ changed: false, tables: [] });
    expect(db.matches[0].teamHome).toBe("شهرداری بندرعباس");
  });

  it("propagates a logo-only change without touching names", () => {
    const db: any = baseDb();
    propagateTeamRename(db, {
      teamId: "t-1",
      previousName: "شهرداری بندرعباس",
      newName: "شهرداری بندرعباس",
      previousLogo: "old.png",
      newLogo: "new.png",
    });
    expect(db.matches[0].teamHomeLogo).toBe("new.png");
    expect(db.matches[0].teamHome).toBe("شهرداری بندرعباس");
    expect(db.players[0].teamName).toBe("شهرداری بندرعباس");
  });
});
