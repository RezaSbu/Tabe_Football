import { describe, it, expect } from "vitest";
import {
  getDataRevision,
  bumpDataRevision,
  buildBulkEtag,
  isBulkFresh,
} from "../state";

describe("bulk ETag revision", () => {
  it("is monotonic across bumps", () => {
    const before = getDataRevision();
    const a = bumpDataRevision();
    const b = bumpDataRevision();
    expect(a).toBe(before + 1);
    expect(b).toBe(before + 2);
    expect(getDataRevision()).toBe(before + 2);
  });

  it("builds a weak validator scoped to the revision", () => {
    expect(buildBulkEtag(7)).toBe('W/"rev-7"');
    expect(buildBulkEtag(7)).not.toBe(buildBulkEtag(8));
  });
});

describe("isBulkFresh (If-None-Match decision)", () => {
  const etag = 'W/"rev-42"';

  it("matches the exact etag token", () => {
    expect(isBulkFresh(etag, etag)).toBe(true);
  });

  it("tolerates surrounding whitespace", () => {
    expect(isBulkFresh(`  ${etag} `, etag)).toBe(true);
  });

  it("honors the wildcard", () => {
    expect(isBulkFresh("*", etag)).toBe(true);
  });

  it("rejects stale revisions", () => {
    expect(isBulkFresh('W/"rev-41"', etag)).toBe(false);
  });

  it("rejects missing or non-string headers (must send full body)", () => {
    expect(isBulkFresh(undefined, etag)).toBe(false);
    expect(isBulkFresh(null, etag)).toBe(false);
    expect(isBulkFresh("", etag)).toBe(false);
    expect(isBulkFresh(42 as any, etag)).toBe(false);
  });

  it("never confuses two different revisions", () => {
    expect(isBulkFresh(buildBulkEtag(1), buildBulkEtag(2))).toBe(false);
  });
});
