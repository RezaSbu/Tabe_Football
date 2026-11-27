import { describe, it, expect, vi } from "vitest";
import { createSaveQueue } from "../services/database";
import type { SaveOptions } from "../services/database";

// The save queue exists so a long save cannot turn N waiting requests into N
// sequential saves. These tests pin the contract: one running save, exactly one
// shared follow-up, every caller resolves only after a save that saw its marks.

function deferred() {
  let resolve!: () => void;
  let reject!: (err: any) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("save queue", () => {
  it("runs a save immediately when nothing is running", async () => {
    const run = vi.fn(async () => {});
    const queue = createSaveQueue(run);
    await queue.save({ tables: ["news"] });
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith({ tables: ["news"] });
  });

  it("collapses concurrent callers into one trailing save", async () => {
    const first = deferred();
    const calls: Array<SaveOptions | undefined> = [];
    const run = vi.fn((options?: SaveOptions) => {
      calls.push(options);
      return calls.length === 1 ? first.promise : Promise.resolve();
    });
    const queue = createSaveQueue(run);

    const a = queue.save();
    const b = queue.save();
    const c = queue.save();
    const d = queue.save();
    expect(run).toHaveBeenCalledTimes(1);
    expect(queue.pendingWaiters()).toBe(3);

    first.resolve();
    await Promise.all([a, b, c, d]);

    expect(run).toHaveBeenCalledTimes(2);
    expect(queue.pendingWaiters()).toBe(0);
  });

  it("merges the tables and never skips recalc for a merged save", async () => {
    const first = deferred();
    const calls: Array<SaveOptions | undefined> = [];
    const run = vi.fn((options?: SaveOptions) => {
      calls.push(options);
      return calls.length === 1 ? first.promise : Promise.resolve();
    });
    const queue = createSaveQueue(run);

    const running = queue.save({ skipRecalc: true, tables: ["ads"] });
    const one = queue.save({ skipRecalc: true, tables: ["news"] });
    const two = queue.save({ tables: ["matches"] });
    first.resolve();
    await Promise.all([running, one, two]);

    expect(calls[1]).toEqual({
      skipRecalc: undefined,
      tables: expect.arrayContaining(["news", "matches"]),
    });
  });

  it("keeps skipRecalc only when every waiter asked for it", async () => {
    const first = deferred();
    const calls: Array<SaveOptions | undefined> = [];
    const run = vi.fn((options?: SaveOptions) => {
      calls.push(options);
      return calls.length === 1 ? first.promise : Promise.resolve();
    });
    const queue = createSaveQueue(run);

    const running = queue.save();
    const a = queue.save({ skipRecalc: true });
    const b = queue.save({ skipRecalc: true });
    first.resolve();
    await Promise.all([running, a, b]);

    expect(calls[1]?.skipRecalc).toBe(true);
  });

  it("still runs the trailing save when the running one fails", async () => {
    const first = deferred();
    const run = vi.fn(() => (run.mock.calls.length === 1 ? first.promise : Promise.resolve()));
    const queue = createSaveQueue(run);

    const failed = queue.save();
    const waiting = queue.save();
    first.reject(new Error("boom"));

    await expect(failed).rejects.toThrow("boom");
    await expect(waiting).resolves.toBeUndefined();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("rejects everyone in a batch if that shared save fails", async () => {
    const first = deferred();
    let releaseSecond!: () => void;
    const second = new Promise<void>((res) => {
      releaseSecond = res;
    });
    let call = 0;
    const run = vi.fn(async () => {
      call += 1;
      if (call === 1) return first.promise;
      await second;
      throw new Error("write failed");
    });
    const queue = createSaveQueue(run);

    const running = queue.save();
    const a = queue.save();
    const b = queue.save();
    first.resolve();
    releaseSecond();

    await running;
    await expect(a).rejects.toThrow("write failed");
    await expect(b).rejects.toThrow("write failed");
  });

  it("gives a caller that arrives during the trailing save its own save", async () => {
    const first = deferred();
    const second = deferred();
    let calls = 0;
    let noteTrailingStarted!: () => void;
    const trailingStarted = new Promise<void>((res) => {
      noteTrailingStarted = res;
    });
    const run = vi.fn(() => {
      calls += 1;
      if (calls === 1) return first.promise;
      if (calls === 2) {
        noteTrailingStarted();
        return second.promise;
      }
      return Promise.resolve();
    });
    const queue = createSaveQueue(run);

    const running = queue.save();
    const trailing = queue.save();
    first.resolve();
    await trailingStarted; // the second save is running now and not finished
    const late = queue.save();
    expect(queue.pendingWaiters()).toBe(1);

    second.resolve();
    await Promise.all([running, trailing, late]);
    expect(run).toHaveBeenCalledTimes(3);
  });
});
