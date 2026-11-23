import { describe, it, expect, vi } from "vitest";
import { gunzipSync } from "zlib";
import { BulkPayloadMemo, acceptsGzip } from "../services/bulkPayload";

const buildCounter = (payload: unknown) => {
  const fn = vi.fn(() => payload);
  return { fn, payload };
};

describe("BulkPayloadMemo", () => {
  it("serializes once per revision and shape", () => {
    let clock = 1_000;
    const memo = new BulkPayloadMemo(10_000, () => clock);
    const { fn } = buildCounter({ status: "ok", news: [{ id: "n1" }] });

    const first = memo.get(74, "full", fn);
    clock += 500;
    const second = memo.get(74, "full", fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(JSON.parse(first)).toEqual({ status: "ok", news: [{ id: "n1" }] });
  });

  it("keeps the lite and full shapes apart", () => {
    const memo = new BulkPayloadMemo(10_000, () => 1_000);
    const full = memo.get(1, "full", () => ({ items: 5105 }));
    const lite = memo.get(1, "lite", () => ({ items: 60 }));

    expect(full).not.toBe(lite);
    expect(JSON.parse(full).items).toBe(5105);
    expect(JSON.parse(lite).items).toBe(60);
  });

  it("re-serializes when the revision bumps", () => {
    const memo = new BulkPayloadMemo(10_000, () => 1_000);
    const before = memo.get(1, "full", () => ({ news: ["a"] }));
    const after = memo.get(2, "full", () => ({ news: ["b"] }));

    expect(JSON.parse(before).news).toEqual(["a"]);
    expect(JSON.parse(after).news).toEqual(["b"]);
  });

  it("expires after the TTL even with an unchanged revision", () => {
    let clock = 1_000;
    const memo = new BulkPayloadMemo(10_000, () => clock);
    const { fn } = buildCounter({ views: 1 });

    memo.get(1, "full", fn);
    clock += 9_999;
    memo.get(1, "full", fn);
    expect(fn).toHaveBeenCalledTimes(1);

    clock += 2;
    memo.get(1, "full", fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not let stale revisions pin memory", () => {
    const memo = new BulkPayloadMemo(60_000, () => 1_000);
    for (let rev = 1; rev <= 6; rev++) memo.get(rev, "full", () => ({ rev }));

    expect(memo.size).toBeLessThanOrEqual(4);
  });

  it("clear() forgets cached bodies", () => {
    const memo = new BulkPayloadMemo(60_000, () => 1_000);
    memo.get(1, "full", () => ({ ok: true }));
    expect(memo.size).toBe(1);
    memo.clear();
    expect(memo.size).toBe(0);
  });

  it("keeps at most one full and one lite body in memory", () => {
    const memo = new BulkPayloadMemo(60_000, () => 1_000);
    memo.get(1, "full", () => ({ shape: "full" }));
    memo.get(1, "lite", () => ({ shape: "lite" }));
    // Same revision, but two shapes is the whole working set.
    expect(memo.size).toBe(2);

    memo.get(2, "full", () => ({ rev: 2 }));
    expect(memo.size).toBe(2);
    // FIFO: the oldest entry (full rev 1) was evicted instead of pinning memory.
    const rebuilt = memo.get(1, "full", () => ({ shape: "full", rebuilt: true }));
    expect(JSON.parse(rebuilt).rebuilt).toBe(true);
  });

  it("gzips each revision + shape once and reuses the compressed bytes", async () => {
    const memo = new BulkPayloadMemo(10_000, () => 1_000);
    const payload = { status: "ok", news: [{ id: "n1" }] };
    const build = () => payload;

    const [a, b] = await Promise.all([
      memo.getGzipped(7, "full", build),
      memo.getGzipped(7, "full", build),
    ]);
    // Both callers shared a single compression pass (same Buffer instance).
    expect(a).toBe(b);
    expect(JSON.parse(gunzipSync(a).toString("utf8"))).toEqual({
      status: "ok",
      news: [{ id: "n1" }],
    });

    const again = await memo.getGzipped(7, "full", build);
    expect(again).toBe(a);
    const lite = await memo.getGzipped(7, "lite", () => ({ lite: true }));
    expect(lite).not.toBe(a);
    expect(JSON.parse(gunzipSync(lite).toString("utf8"))).toEqual({ lite: true });
  });

  it("re-compresses after the revision bump", async () => {
    const memo = new BulkPayloadMemo(10_000, () => 1_000);
    const first = await memo.getGzipped(1, "full", () => ({ news: ["a"] }));
    const second = await memo.getGzipped(2, "full", () => ({ news: ["b"] }));

    expect(gunzipSync(first).toString("utf8")).toContain('"a"');
    expect(gunzipSync(second).toString("utf8")).toContain('"b"');
  });
});

describe("acceptsGzip", () => {
  it("treats a missing header as identity", () => {
    expect(acceptsGzip(undefined)).toBe(false);
    expect(acceptsGzip("")).toBe(false);
    expect(acceptsGzip("identity")).toBe(false);
    expect(acceptsGzip("br, deflate")).toBe(false);
  });

  it("accepts plain and q-weighted gzip", () => {
    expect(acceptsGzip("gzip")).toBe(true);
    expect(acceptsGzip("gzip, deflate, br")).toBe(true);
    expect(acceptsGzip("deflate, gzip;q=0.5")).toBe(true);
    expect(acceptsGzip("x-gzip")).toBe(true);
    expect(acceptsGzip(["br", "gzip"])).toBe(true);
  });

  it("honours an explicit refusal even when a wildcard allows it", () => {
    expect(acceptsGzip("gzip;q=0")).toBe(false);
    expect(acceptsGzip("gzip; q=0.0, *;q=1")).toBe(false);
    expect(acceptsGzip("*")).toBe(true);
    expect(acceptsGzip("*;q=0")).toBe(false);
  });
});
