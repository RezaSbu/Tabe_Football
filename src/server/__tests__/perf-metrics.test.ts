import { describe, it, expect } from "vitest";
import { recordRoutePerf, getRoutePerf, getPerfMetrics, startPerfSampling } from "../services/monitoring";

// These numbers are what the diagnostics panel shows and what the roadmap's
// acceptance criteria are written against, so the estimator itself is tested:
// nearest-rank percentiles over a fixed 512-request window.
function fill(route: string, values: number[], status = 200) {
  for (const ms of values) recordRoutePerf("GET", route, status, ms);
}

describe("per-route latency percentiles", () => {
  it("reports observed values, nearest-rank", () => {
    const route = "/api/test/seq";
    fill(route, Array.from({ length: 100 }, (_, i) => i + 1));
    const row = getRoutePerf().routes.find((r) => r.route === `GET ${route}`)!;
    expect(row.requests).toBe(100);
    expect(row.window).toBe(100);
    expect(row.p50).toBe(50);
    expect(row.p95).toBe(95);
    expect(row.p99).toBe(99);
    expect(row.maxMs).toBe(100);
  });

  it("keeps only the last 512 requests", () => {
    const route = "/api/test/window";
    fill(route, Array.from({ length: 600 }, (_, i) => i + 1));
    const row = getRoutePerf().routes.find((r) => r.route === `GET ${route}`)!;
    // Last 512 of 1..600 => 89..600
    expect(row.window).toBe(512);
    expect(row.requests).toBe(600);
    expect(row.maxMs).toBe(600);
    expect(row.p50).toBe(344);
    expect(row.p99).toBe(595);
  });

  it("counts 4xx and 5xx as errors", () => {
    recordRoutePerf("PUT", "/api/test/err", 500, 12);
    recordRoutePerf("PUT", "/api/test/err", 404, 3);
    recordRoutePerf("PUT", "/api/test/err", 200, 5);
    const row = getRoutePerf().routes.find((r) => r.route === "PUT /api/test/err")!;
    expect(row.requests).toBe(3);
    expect(row.errors).toBe(2);
  });

  it("separates the same path by method", () => {
    recordRoutePerf("GET", "/api/test/method", 200, 1);
    recordRoutePerf("POST", "/api/test/method", 200, 2000);
    const routes = getRoutePerf().routes.filter((r) => r.route.endsWith("/api/test/method"));
    expect(routes.map((r) => r.route).sort()).toEqual(["GET /api/test/method", "POST /api/test/method"]);
    expect(routes.find((r) => r.route.startsWith("POST"))!.p99).toBe(2000);
  });

  it("bounds memory: no new route is tracked past the cap", () => {
    const before = getRoutePerf().routes.length;
    for (let i = 0; i < 400; i += 1) recordRoutePerf("GET", `/api/cap/${i}`, 200, 1);
    const after = getRoutePerf().routes.length;
    expect(after).toBeLessThanOrEqual(250);
    expect(after - before).toBeLessThanOrEqual(250);
  });

  it("exposes a global p99 across all routes", () => {
    const { overall } = getRoutePerf();
    expect(overall.requests).toBeGreaterThan(0);
    expect(overall.p99).toBeGreaterThanOrEqual(overall.p50);
    expect(overall.maxMs).toBeGreaterThanOrEqual(overall.p99);
  });
});

describe("heap and event-loop sampling", () => {
  it("starts one series and reports the V8 heap ceiling", () => {
    startPerfSampling();
    startPerfSampling(); // idempotent: a second call must not add a timer
    const perf = getPerfMetrics();
    expect(perf.heap.series.length).toBeGreaterThanOrEqual(1);
    expect(perf.heap.series.length).toBeLessThanOrEqual(240);
    // The 512MB pin is the whole point of the runtime phase: it must be
    // visible here, not inferred from container flags.
    expect(perf.heap.limitBytes).toBeGreaterThan(0);
    expect(perf.heap.current.rss).toBeGreaterThan(0);
    expect(perf.heap.peakSampledBytes).toBeGreaterThan(0);
    expect(perf.eventLoop.lastInterval).toHaveProperty("blockedMs");
    expect(perf.eventLoop.lastInterval).toHaveProperty("maxStallMs");
    expect(perf.routes.overall.requests).toBeGreaterThan(0);
  });
});
