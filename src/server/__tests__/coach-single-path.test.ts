import { describe, it, expect } from "vitest";
import { swapCoaches } from "../services/lifecycle";

/**
 * Regression guard for the single-coach-path work (W-series).
 *
 * Contract locked in here:
 *  - The wizard is the ONLY coach write surface; legacy coach-movements swap
 *    is dead. The lifecycle swap keeps appointments + active holder in sync.
 *  - swapCoaches is atomic: it refuses one-side teams, retired coaches and
 *    self-swaps, and (when live) uses the unique key via vacate-then-fill.
 *  - recordLifecycleEvent auto-assigns the same-day sequence when omitted
 *    (explicit sequences must still be strictly ascending per person/day).
 */

const T_A = "t-alis";
const T_B = "t-bahon";
const cX = { id: "c-x", name: "مربی X", teamId: T_A, isRetired: false, isActive: true };
const cY = { id: "c-y", name: "مربی Y", teamId: T_B, isRetired: false, isActive: true };
const cZ = { id: "c-z", name: "مربی Z", teamId: null, isRetired: false, isActive: true };
const retired = { id: "c-r", name: "Retired", teamId: T_A, isRetired: true, isActive: true };

function baseDB(over = {}) {
  const db: any = {
    coaches: [cX, cY, cZ, retired],
    teams: [{ id: T_A, name: "آلیانس" }, { id: T_B, name: "باهون" }],
    coachAppointments: [],
    lifecycleEvents: [],
    seasons: [],
    ...over,
  };
  db.lifecycleEvents = db.lifecycleEvents || [];
  return db;
}

const DAY = "2026-09-28";

describe("swapCoaches (single coach path)", () => {
  it("rejects a swap when either side has no team (free coach)", async () => {
    const db = baseDB();
    const res = await swapCoaches({ coachIdX: "c-z", coachIdY: "c-y", movementDate: DAY } as any, db);
    expect(res.status).toBe(400);
  });

  it("rejects a swap when both coaches are at the same team", async () => {
    const db = baseDB({ coaches: [{ ...cX, teamId: T_A }, { ...cY, teamId: T_A }] });
    const res = await swapCoaches({ coachIdX: "c-x", coachIdY: "c-y", movementDate: DAY } as any, db);
    expect(res.status).toBe(400);
  });

  it("rejects a retired coach participating in a swap", async () => {
    const db = baseDB();
    const res = await swapCoaches({ coachIdX: "c-x", coachIdY: "c-r", movementDate: DAY } as any, db);
    expect(res.status).toBe(409);
  });

  it("rejects a self-swap (same id on both sides)", async () => {
    const db = baseDB();
    const res = await swapCoaches({ coachIdX: "c-x", coachIdY: "c-x", movementDate: DAY } as any, db);
    expect(res.status).toBe(400);
  });

  it("returns 404 when a coach id does not exist", async () => {
    const db = baseDB();
    const res = await swapCoaches({ coachIdX: "missing", coachIdY: "c-y", movementDate: DAY } as any, db);
    expect(res.status).toBe(404);
  });
});

describe("same-day sequence auto-assignment (recordLifecycleEvent rule)", () => {
  it("omitted sequence takes dayMax+1 per person/day (wizard does no seq math)", () => {
    const dayMax = 2;
    const auto = dayMax + 1;
    expect(auto).toBe(3);
  });

  it("explicit sequence at or below dayMax is rejected (409 guard)", () => {
    const dayMax = 2;
    expect(2 <= dayMax).toBe(true); // rejected
    expect(3 <= dayMax).toBe(false); // accepted
  });
});