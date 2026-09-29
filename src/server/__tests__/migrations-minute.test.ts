import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runDatabaseMigrationsAndTransitions } from "../services/migrations";

// Helper: build a full parseable object with a date far in the past so elapsed
// time >= 0 and the migration's auto-live/auto-minute logic would normally run.
function buildParsed(minutes?: string | null, status = "not-started") {
  const past = new Date(Date.now() - 20 * 60 * 1000); // 20 min ago
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`;
  const time = `${pad(past.getHours())}:${pad(past.getMinutes())}:00`;

  return {
    football_Feature_Games: [
      {
        id: "m1",
        teamHome: "تیم الف",
        teamAway: "تیم ب",
        status,
        date,
        time,
        minutes: minutes ?? null,
        sport: "football"
      }
    ],
    football_Now_Games: [],
    football_Finished_Games: [],
    futsal_Feature_Games: [],
    futsal_Now_Games: [],
    futsal_Finished_Games: []
  };
}

describe("runDatabaseMigrationsAndTransitions — minute preservation", () => {
  // Wall-clock hermetic: the transition logic compares kickoff against
  // "now", so a stepping/skewed CI clock could flip outcomes between the
  // fixture build and the migration run. Freeze time for the whole block.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it("keeps a manually stored minute for a live match (does not overwrite from elapsed)", () => {
    const parsed = buildParsed("30", "live");
    const { parsed: out } = runDatabaseMigrationsAndTransitions(parsed);

    const feature = out.football_Feature_Games?.find((m: any) => m.id === "m1");
    expect(feature.minutes).toBe("30");
  });

  it("computes a minute from elapsed only when no minute exists yet", () => {
    const parsed = buildParsed(null, "not-started");
    const { parsed: out, changed } = runDatabaseMigrationsAndTransitions(parsed);

    const feature = out.football_Feature_Games?.find((m: any) => m.id === "m1");
    expect(feature.status).toBe("live");
    expect(parseInt(feature.minutes, 10)).toBeGreaterThanOrEqual(1);
    const nowMoved = (out.football_Now_Games || []).some((m: any) => m.id === "m1");
    expect(nowMoved).toBe(true);
    expect(changed).toBe(true);
  });

  it("keeps minute 0 as 0 (does not recompute when admin stored 0)", () => {
    const parsed = buildParsed("0", "live");
    const { parsed: out } = runDatabaseMigrationsAndTransitions(parsed);
    const feature = out.football_Feature_Games?.find((m: any) => m.id === "m1");
    expect(feature.minutes).toBe("0");
  });
});
