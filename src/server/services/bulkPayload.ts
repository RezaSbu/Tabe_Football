// Memoized serialization for the bulk /api/data payload.
//
// Why: /api/data is the single most expensive read on the server — the whole
// in-memory mirror is stringified on every cold request, synchronously, on the
// only Node thread (measured: ~28.7 MB JSON / ~5.2 MB gzipped). The payload is
// derived state: it can only change when the data revision bumps (structural
// writes in services/database) — view/click counters are deliberately kept out
// of the revision, so a short TTL memo cannot hide a structural change.
//
// Both HTTP cache layers stay in charge of freshness:
//   - browser: `Cache-Control: no-cache` + revision ETag (304 path, unchanged)
//   - edge:    nginx `proxy_cache_valid 200 10s`
// This memo only removes redundant serialization work inside that window.
//
// Compression lives here too, on purpose. nginx gzips what it sends, so a cache
// HIT still paid a full gzip pass over 28.7 MB per request (measured 1.13 s on
// an i7-7820HQ, i.e. several seconds on the VPS nginx container capped at
// 0.5 vCPU). Compressing once per revision and caching the compressed bytes
// turns a HIT into a plain file copy. `gzip` runs on libuv's threadpool, so it
// does not block the event loop the way gzipSync would.

import { gzip as gzipCallback } from "zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzipCallback);

export type BulkShape = "full" | "lite";

interface MemoEntry {
  body: string;
  /** In-flight or resolved gzip of `body`; a rejected promise is dropped. */
  gzip?: Promise<Buffer>;
  at: number;
}

// At most one full and one lite body for the current revision are useful; a
// revision bump makes every older entry dead weight. Keeping the cap low also
// bounds memory: a full body is a ~21.5M-character string (UTF-16 in V8), so
// four retained bodies could pin >150 MB of a 512 MB container.
const MAX_ENTRIES = 2;

export class BulkPayloadMemo {
  private entries = new Map<string, MemoEntry>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now
  ) {}

  /** Returns the serialized body, reusing it while revision + shape + TTL hold. */
  get(revision: number, shape: BulkShape, build: () => unknown): string {
    return this.entry(revision, shape, build).body;
  }

  /**
   * Returns the gzip of the body for this revision + shape. The compressed
   * bytes are reused (and can be cached by the edge) until the revision bumps
   * or the TTL expires; concurrent callers share one compression pass.
   */
  async getGzipped(revision: number, shape: BulkShape, build: () => unknown): Promise<Buffer> {
    const entry = this.entry(revision, shape, build);
    if (!entry.gzip) {
      const pending = gzipAsync(entry.body);
      entry.gzip = pending;
      // Do not memoize a failure: the next request should retry instead of
      // failing until the TTL expires.
      pending.catch(() => {
        if (entry.gzip === pending) delete entry.gzip;
      });
    }
    return entry.gzip;
  }

  /** Test/ops hook: forget everything (used after restoreDB style swaps). */
  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  private entry(revision: number, shape: BulkShape, build: () => unknown): MemoEntry {
    const key = `${revision}|${shape}`;
    const at = this.now();
    const hit = this.entries.get(key);
    if (hit && at - hit.at < this.ttlMs) return hit;

    const entry: MemoEntry = { body: JSON.stringify(build()), at };
    // Delete first so re-insertion refreshes the Map's insertion order (FIFO
    // eviction below then drops the least recently built entry).
    this.entries.delete(key);
    while (this.entries.size >= MAX_ENTRIES) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
    this.entries.set(key, entry);
    return entry;
  }
}

/**
 * Parses an Accept-Encoding header well enough to decide whether the
 * pre-compressed body may be sent. An explicit `gzip` (or `x-gzip`) token is
 * authoritative, including `gzip;q=0`; `*` only applies when gzip is not named.
 */
export function acceptsGzip(header: string | string[] | undefined): boolean {
  if (!header) return false;
  const raw = Array.isArray(header) ? header.join(",") : header;
  let wildcard: number | null = null;
  for (const part of raw.split(",")) {
    const [coding, ...params] = part.split(";");
    const name = coding.trim().toLowerCase();
    let q = 1;
    for (const param of params) {
      const [key, value] = param.split("=");
      if (key.trim().toLowerCase() !== "q") continue;
      const parsed = Number((value || "").trim());
      if (Number.isFinite(parsed)) q = parsed;
    }
    if (name === "gzip" || name === "x-gzip") return q > 0;
    if (name === "*") wildcard = q;
  }
  return wildcard !== null && wildcard > 0;
}
