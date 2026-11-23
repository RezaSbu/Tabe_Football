import { describe, it, expect } from "vitest";
import { upsertRowsPerChunk, MAX_UPSERT_PARAMS } from "../db";

describe("upsertRowsPerChunk", () => {
  it("keeps a full news-table upsert under PostgreSQL's 65535 parameter cap", () => {
    // Production shape at audit time: 5442 news rows x 11 columns = 59,862
    // params in one statement, ~5,600 params below the hard limit.
    const rowsPerChunk = upsertRowsPerChunk(11);
    expect(rowsPerChunk * 11).toBeLessThanOrEqual(MAX_UPSERT_PARAMS);
    expect(rowsPerChunk).toBeGreaterThan(0);

    const rows = 5442;
    const chunks = Math.ceil(rows / rowsPerChunk);
    expect(chunks).toBeGreaterThan(1);
    // Every chunk stays under the cap, including the last partial one.
    for (let i = 0; i < chunks; i++) {
      const size = Math.min(rowsPerChunk, rows - i * rowsPerChunk);
      expect(size * 11).toBeLessThanOrEqual(MAX_UPSERT_PARAMS);
      expect(size * 11).toBeLessThan(65535);
    }
  });

  it("never returns zero rows for very wide tables", () => {
    expect(upsertRowsPerChunk(64_000)).toBe(1);
    expect(upsertRowsPerChunk(0)).toBe(30_000);
  });
});
