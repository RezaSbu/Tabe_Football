import { describe, it, expect, vi } from "vitest";
import { BulkPayloadMemo } from "../services/bulkPayload";

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
});
