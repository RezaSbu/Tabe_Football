import { describe, it, expect } from "vitest";
import { matchTouchesFinishedStats } from "../services/database";

// The gate exists to answer one question: can this write change what
// recalculateAndSyncDatabase() reads? Recalc only ever looks at
//     m.status === "finished" && !m.isAutoFinished        (stats.ts:900)
// so the tests below are written as "is this row visible to recalc before or
// after the write?". Anything invisible on both sides must not pay 19.4s of
// blocked event loop (measured on the VPS, 2026-11-25).

const live = (over: Record<string, unknown> = {}) => ({
  id: "match-1",
  status: "live",
  scoreHome: 1,
  scoreAway: 0,
  teamHome: "الف",
  teamAway: "ب",
  date: "2026-11-25",
  ...over,
});

const finished = (over: Record<string, unknown> = {}) => ({
  id: "match-1",
  status: "finished",
  scoreHome: 2,
  scoreAway: 1,
  teamHome: "الف",
  teamAway: "ب",
  date: "2026-11-25",
  ...over,
});

describe("matchTouchesFinishedStats — writes that recalc cannot see", () => {
  it("a live score edit does not recompute", () => {
    expect(matchTouchesFinishedStats(live(), live({ scoreHome: 2 }))).toBe(false);
  });

  it("live scorers / events / lineups edits do not recompute", () => {
    const before = live();
    expect(matchTouchesFinishedStats(before, live({ scorersList: [{ player: "x", minute: 10 }] }))).toBe(false);
    expect(matchTouchesFinishedStats(before, live({ events: [{ type: "goal" }] }))).toBe(false);
    expect(matchTouchesFinishedStats(before, live({ lineups: { home: ["a"] } }))).toBe(false);
  });

  it("live team / league / date / season edits do not recompute", () => {
    const before = live();
    expect(matchTouchesFinishedStats(before, live({ teamHomeId: "t9", teamAwayId: "t8" }))).toBe(false);
    expect(matchTouchesFinishedStats(before, live({ league: "hazfi-cup" }))).toBe(false);
    expect(matchTouchesFinishedStats(before, live({ date: "2026-12-01" }))).toBe(false);
    expect(matchTouchesFinishedStats(before, live({ seasonId: "season-1406" }))).toBe(false);
  });

  it("scheduled -> live does not recompute", () => {
    expect(matchTouchesFinishedStats({ ...live(), status: "not-started" }, live())).toBe(false);
  });

  it("creating a scheduled or live match does not recompute", () => {
    expect(matchTouchesFinishedStats(undefined, live())).toBe(false);
    expect(matchTouchesFinishedStats(null, { ...live(), status: "not-started" })).toBe(false);
  });

  it("deleting a live match does not recompute", () => {
    expect(matchTouchesFinishedStats(live(), undefined)).toBe(false);
    expect(matchTouchesFinishedStats(live(), null)).toBe(false);
  });

  it("nothing to nothing does not recompute", () => {
    expect(matchTouchesFinishedStats(undefined, undefined)).toBe(false);
  });

  it("auto-finished rows are invisible to recalc on both sides", () => {
    const auto = finished({ isAutoFinished: true });
    expect(matchTouchesFinishedStats(auto, { ...auto, scoreHome: 5 })).toBe(false);
  });
});

describe("matchTouchesFinishedStats — writes that recalc must see", () => {
  it("live -> finished recomputes", () => {
    expect(matchTouchesFinishedStats(live(), finished())).toBe(true);
  });

  it("finished -> live recomputes", () => {
    expect(matchTouchesFinishedStats(finished(), live())).toBe(true);
  });

  it("a score correction on a finished match recomputes", () => {
    expect(matchTouchesFinishedStats(finished(), finished({ scoreHome: 3 }))).toBe(true);
  });

  it("any edit to a finished match recomputes, even an unrelated one", () => {
    expect(matchTouchesFinishedStats(finished(), finished({ ticketUrl: "https://x" }))).toBe(true);
  });

  it("creating a match that is already finished recomputes", () => {
    expect(matchTouchesFinishedStats(undefined, finished())).toBe(true);
  });

  it("deleting a finished match recomputes", () => {
    expect(matchTouchesFinishedStats(finished(), undefined)).toBe(true);
  });

  it("auto-finished -> finished recomputes (the row becomes visible)", () => {
    expect(matchTouchesFinishedStats(finished({ isAutoFinished: true }), finished())).toBe(true);
  });

  it("finished -> auto-finished recomputes (the row stops being visible)", () => {
    expect(matchTouchesFinishedStats(finished(), finished({ isAutoFinished: true }))).toBe(true);
  });

  it("auto-finished -> live does not recompute (the row was never visible)", () => {
    expect(matchTouchesFinishedStats(finished({ isAutoFinished: true }), live())).toBe(false);
  });
});

describe("matchTouchesFinishedStats — invariant over random payloads", () => {
  const statuses = ["not-started", "live", "finished", "abandoned", undefined];

  it("always recomputes when either side is counted, never otherwise", () => {
    for (let i = 0; i < 500; i += 1) {
      const mk = () => {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const row: Record<string, unknown> = { id: "m", status };
        if (Math.random() < 0.25) row.isAutoFinished = true;
        if (Math.random() < 0.5) row.scoreHome = Math.floor(Math.random() * 5);
        return row;
      };
      const before = Math.random() < 0.1 ? undefined : mk();
      const after = Math.random() < 0.1 ? undefined : mk();
      const counted = (m: any) => !!m && m.status === "finished" && !m.isAutoFinished;
      expect(matchTouchesFinishedStats(before, after)).toBe(counted(before) || counted(after));
    }
  });
});
