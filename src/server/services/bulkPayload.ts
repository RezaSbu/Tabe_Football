// Memoized serialization for the bulk /api/data payload.
//
// Why: /api/data is the single most expensive read on the server — the whole
// in-memory mirror is stringified on every cold request, synchronously, on the
// only Node thread (measured: ~6.8 MB JSON / ~5.2 MB gzipped). The payload is
// derived state: it can only change when the data revision bumps (structural
// writes in services/database) — view/click counters are deliberately kept out
// of the revision, so a short TTL memo cannot hide a structural change.
//
// Both HTTP cache layers stay in charge of freshness:
//   - browser: `Cache-Control: no-cache` + revision ETag (304 path, unchanged)
//   - edge:    nginx `proxy_cache_valid 200 10s`
// This memo only removes redundant serialization work inside that window.

export type BulkShape = "full" | "lite";

interface MemoEntry {
  body: string;
  at: number;
}

export class BulkPayloadMemo {
  private entries = new Map<string, MemoEntry>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now
  ) {}

  /** Returns the serialized body, reusing it while revision + shape + TTL hold. */
  get(revision: number, shape: BulkShape, build: () => unknown): string {
    const key = `${revision}|${shape}`;
    const at = this.now();
    const hit = this.entries.get(key);
    if (hit && at - hit.at < this.ttlMs) return hit.body;

    const body = JSON.stringify(build());
    // Revision and shape are both part of the key, so old revisions can never
    // be served; drop them instead of letting them pin memory.
    if (this.entries.size >= 4) this.entries.clear();
    this.entries.set(key, { body, at });
    return body;
  }

  /** Test/ops hook: forget everything (used after restoreDB style swaps). */
  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
