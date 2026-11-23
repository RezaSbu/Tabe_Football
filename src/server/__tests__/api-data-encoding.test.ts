// End-to-end coverage for the /api/data encoding contract.
//
// The route now gzips once per revision and serves the pre-compressed bytes,
// while the edge caches that variant under its own key. A mistake here is
// invisible in unit tests but breaks every browser, so this test drives the
// real express route over HTTP with a raw socket (Node's http module does not
// transparently decompress, unlike fetch/undici).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { gunzipSync } from "zlib";
import { registerSystemRoutes } from "../routes/system";
import { setDb } from "../state";

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

let server: http.Server | undefined;
let base = "";

function rawGet(path: string, headers: Record<string, string>): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = http.get(`${base}${path}`, { headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () =>
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: Buffer.concat(chunks),
        })
      );
    });
    req.on("error", reject);
  });
}

const sampleNews = (id: string, createdAt: string) => ({
  id,
  title: `خبر ${id}`,
  summary: "",
  content: "متن",
  category: "فوتبال",
  image: "",
  tags: "",
  gallery: "",
  read_more: "",
  viewCount: 0,
  createdAt,
});

beforeAll(async () => {
  setDb({
    news: [
      sampleNews("n2", "2026-11-20T10:00:00.000Z"),
      sampleNews("n1", "2026-11-21T10:00:00.000Z"),
    ],
    matches: [],
    players: [],
    teams: [],
    // Dropped from the bulk payload on purpose; must not leak into the body.
    playerSeasonStats: [{ id: "pss-1" }],
    coachSeasonStats: [{ id: "css-1" }],
    teamSeasonStats: [{ id: "tss-1" }],
  });

  const app = express();
  registerSystemRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server?.address();
      if (address && typeof address === "object") base = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
});

describe("GET /api/data encoding", () => {
  it("serves gzip to clients that accept it and keeps the JSON contract", async () => {
    const res = await rawGet("/api/data", { "accept-encoding": "gzip, deflate, br" });

    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBe("gzip");
    expect(res.headers["content-type"]).toContain("application/json");
    expect(String(res.headers["vary"] || "")).toMatch(/accept-encoding/i);
    expect(Number(res.headers["content-length"])).toBe(res.body.length);

    const payload = JSON.parse(gunzipSync(res.body).toString("utf8"));
    expect(payload.status).toBe("ok");
    // Full payload keeps the stored order; only the lite slice sorts by date.
    expect(payload.news.map((n: any) => n.id).sort()).toEqual(["n1", "n2"]);
    expect(payload.playerSeasonStats).toBeUndefined();
    expect(payload.coachSeasonStats).toBeUndefined();
    expect(payload.teamSeasonStats).toBeUndefined();
  });

  it("serves plain JSON when the client does not accept gzip", async () => {
    const res = await rawGet("/api/data", { "accept-encoding": "identity" });

    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBeUndefined();
    const payload = JSON.parse(res.body.toString("utf8"));
    expect(payload.status).toBe("ok");
    expect(payload.news).toHaveLength(2);
  });

  it("honours gzip;q=0 instead of trusting the substring 'gzip'", async () => {
    const res = await rawGet("/api/data", { "accept-encoding": "gzip;q=0, identity" });

    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBeUndefined();
    expect(JSON.parse(res.body.toString("utf8")).status).toBe("ok");
  });

  it("honours the lite shape over the same route", async () => {
    const res = await rawGet("/api/data?lite=1", { "accept-encoding": "gzip" });

    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBe("gzip");
    const payload = JSON.parse(gunzipSync(res.body).toString("utf8"));
    expect(payload.status).toBe("ok");
    expect(payload.news).toHaveLength(2);
  });

  it("answers 304 with no body and no coding when the revision ETag matches", async () => {
    const first = await rawGet("/api/data", { "accept-encoding": "gzip" });
    const etag = String(first.headers["etag"] || "");
    expect(etag).not.toBe("");

    const res = await rawGet("/api/data", { "accept-encoding": "gzip", "if-none-match": etag });
    expect(res.status).toBe(304);
    expect(res.body.length).toBe(0);
    expect(res.headers["content-encoding"]).toBeUndefined();
  });
});
