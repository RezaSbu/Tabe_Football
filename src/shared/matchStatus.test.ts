import { describe, it, expect } from "vitest";
import { getEffectiveStatus } from "./matchStatus";

// Mirrors the expectations of src/utils.ts computeDynamicAppletStats:
// finished is sticky, otherwise the wall clock decides with a 110-min live window.
//
// All timestamps here are ABSOLUTE instants (Date.UTC), so these tests pass
// in any runner timezone. Match date/time strings are Asia/Tehran wall time:
// Tehran wall "2026-09-22 18:00" == Date.UTC(2026, 8, 22, 14, 30).
describe("getEffectiveStatus", () => {
  const KICKOFF_UTC_MS = Date.UTC(2026, 8, 22, 14, 30, 0, 0); // Tehran 18:00
  const M = { status: "not-started", date: "2026-09-22", time: "18:00" };

  it("keeps stored finished sticky regardless of clock", () => {
    expect(getEffectiveStatus({ status: "finished", date: "2020-01-01", time: "10:00" }, KICKOFF_UTC_MS)).toBe("finished");
    expect(getEffectiveStatus({ status: "finished" }, KICKOFF_UTC_MS)).toBe("finished");
  });

  it("returns not-started before kickoff", () => {
    expect(getEffectiveStatus(M, KICKOFF_UTC_MS - 60 * 1000)).toBe("not-started");
  });

  it("returns live at kickoff and inside the 110-minute window", () => {
    expect(getEffectiveStatus(M, KICKOFF_UTC_MS)).toBe("live");
    expect(getEffectiveStatus(M, KICKOFF_UTC_MS + 5 * 60 * 1000)).toBe("live");
    expect(getEffectiveStatus(M, KICKOFF_UTC_MS + 109 * 60 * 1000)).toBe("live");
  });

  it("returns finished past the 110-minute window (derived, not persisted)", () => {
    expect(getEffectiveStatus(M, KICKOFF_UTC_MS + 111 * 60 * 1000)).toBe("finished");
    expect(getEffectiveStatus({ status: "live", date: "2020-01-01", time: "10:00" }, KICKOFF_UTC_MS)).toBe("finished");
  });

  it("interprets times as Tehran wall time, not server-local", () => {
    // 18:00 Tehran == 14:30 UTC. A UTC-based reading would be 3.5h off.
    expect(getEffectiveStatus(M, Date.UTC(2026, 8, 22, 14, 29, 0, 0))).toBe("not-started");
    expect(getEffectiveStatus(M, Date.UTC(2026, 8, 22, 14, 30, 0, 0))).toBe("live");
  });

  it("falls back to stored status without parseable date/time (like the client)", () => {
    expect(getEffectiveStatus({ status: "not-started" }, KICKOFF_UTC_MS)).toBe("not-started");
    expect(getEffectiveStatus({ status: "live", date: "bad-date", time: "xx" }, KICKOFF_UTC_MS)).toBe("live");
    expect(getEffectiveStatus({ status: "not-started", date: "2026-09-22", time: "" }, KICKOFF_UTC_MS)).toBe("not-started");
    expect(getEffectiveStatus(null, KICKOFF_UTC_MS)).toBe("not-started");
  });

  it("handles Persian-digit times like the client", () => {
    const m = { status: "not-started", date: "2026-09-22", time: "۱۷:۵۵" }; // Tehran 17:55 == 14:25 UTC
    expect(getEffectiveStatus(m, Date.UTC(2026, 8, 22, 14, 24, 0, 0))).toBe("not-started");
    expect(getEffectiveStatus(m, Date.UTC(2026, 8, 22, 14, 26, 0, 0))).toBe("live");
  });
});
