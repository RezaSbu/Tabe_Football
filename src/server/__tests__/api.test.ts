import { describe, it, expect, beforeAll } from "vitest";
import { VIEW_MULTIPLIER } from "../config";

const BASE = "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

async function apiGet(path: string) {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json();
  return { status: res.status, data };
}

async function apiPost(path: string, body: any, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function apiPut(path: string, body: any, token: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function apiDelete(path: string, token: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { status: res.status, data };
}

let token = "";

beforeAll(async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { status, data } = await apiPost("/api/auth/login", {
      username: "admin",
      password: ADMIN_PASSWORD,
    });
    if (status === 200 && data.token) {
      token = data.token;
      return;
    }
    await new Promise(r => setTimeout(r, 1500));
  }
});

function needsAuth() {
  if (!token) return false;
  return true;
}

describe("API - Health & Data", () => {
  it("GET /api/health returns 200", async () => {
    const { status } = await apiGet("/api/health");
    expect(status).toBe(200);
  });

  it("GET /api/data returns full database", async () => {
    const { status, data } = await apiGet("/api/data");
    expect(status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.news).toBeDefined();
    expect(data.teams).toBeDefined();
  });

  it("GET /api/ads returns array", async () => {
    const { status, data } = await apiGet("/api/ads");
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/testdb requires diagnostics permission (401 unauthenticated)", async () => {
    const { status } = await apiGet("/api/testdb");
    expect(status).toBe(401);
  });
});

describe("API - Auth Guard", () => {
  it("unauthenticated POST returns 401", async () => {
    const { status } = await apiPost("/api/news", { title: "test" });
    expect(status).toBe(401);
  });

  it("valid token allows POST", async () => {
    if (!needsAuth()) return;
    const { status } = await apiPost("/api/news", { title: "API_TEST", summary: "s", content: "c", category: "pro-league", tags: [] }, token);
    expect(status).toBe(200);
  });
});

describe("API - CRUD: News", () => {
  let createdId = "";

  it("POST /api/news creates item", async () => {
    if (!needsAuth()) return;
    const { status, data } = await apiPost("/api/news", { title: "TEST_NEWS_CRUD", summary: "test", content: "content", category: "pro-league", tags: ["test"] }, token);
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const { data: allData } = await apiGet("/api/data");
    const found = allData.news.find((n: any) => n.title === "TEST_NEWS_CRUD");
    expect(found).toBeDefined();
    createdId = found.id;
  });

  it("PUT /api/news/:id updates item", async () => {
    if (!needsAuth() || !createdId) return;
    const { status, data } = await apiPut(`/api/news/${createdId}`, { title: "TEST_NEWS_EDITED" }, token);
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const { data: allData } = await apiGet("/api/data");
    const found = allData.news.find((n: any) => n.id === createdId);
    expect(found.title).toBe("TEST_NEWS_EDITED");
  });

  it("DELETE /api/news/:id removes item", async () => {
    if (!needsAuth() || !createdId) return;
    const { status, data } = await apiDelete(`/api/news/${createdId}`, token);
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const { data: allData } = await apiGet("/api/data");
    const found = allData.news.find((n: any) => n.id === createdId);
    expect(found).toBeUndefined();
  });
});

describe("API - CRUD: Teams", () => {
  let createdId = "";

  it("POST /api/teams creates team", async () => {
    if (!needsAuth()) return;
    const { status, data } = await apiPost("/api/teams", { name: "TEST_TEAM", logo: "" }, token);
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const { data: allData } = await apiGet("/api/data");
    const found = allData.teams.find((t: any) => t.name === "TEST_TEAM");
    expect(found).toBeDefined();
    createdId = found.id;
  });

  it("PUT /api/teams/:id updates team", async () => {
    if (!needsAuth() || !createdId) return;
    const { status } = await apiPut(`/api/teams/${createdId}`, { name: "TEST_TEAM_EDITED" }, token);
    expect(status).toBe(200);
  });

  it("DELETE /api/teams/:id removes team", async () => {
    if (!needsAuth() || !createdId) return;
    const { status } = await apiDelete(`/api/teams/${createdId}`, token);
    expect(status).toBe(200);
  });
});

describe("API - CRUD: Players", () => {
  let createdId = "";

  it("POST /api/players creates player", async () => {
    if (!needsAuth()) return;
    const { status } = await apiPost("/api/players", { name: "TEST_PLAYER", position: "FW", teamName: "t", rating: 8.0, averageRating: 8.0, seasonStats: {} }, token);
    expect(status).toBe(200);

    const { data: allData } = await apiGet("/api/data");
    const found = allData.players.find((p: any) => p.name === "TEST_PLAYER");
    expect(found).toBeDefined();
    createdId = found.id;
  });

  it("PUT /api/players/:id updates player", async () => {
    if (!needsAuth() || !createdId) return;
    const { status } = await apiPut(`/api/players/${createdId}`, { name: "TEST_PLAYER_EDITED" }, token);
    expect(status).toBe(200);
  });

  it("DELETE /api/players/:id removes player", async () => {
    if (!needsAuth() || !createdId) return;
    const { status } = await apiDelete(`/api/players/${createdId}`, token);
    expect(status).toBe(200);
  });
});

describe("API - Players with team (ledger FK race regression)", () => {
  // Regression: POST /api/players with teamId used to 500 because the
  // create-bound movement row was persisted in the same saveDB batch as
  // the player row, and the movement INSERT could land first
  // (fk_pcm_player violation). The route now persists the parent first.
  let teamId = "";
  let playerId = "";

  it("POST /api/teams creates fixture team", async () => {
    if (!needsAuth()) return;
    const { status, data } = await apiPost("/api/teams", { name: "TEST_TEAM_FOR_PLAYER" }, token);
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const { data: allData } = await apiGet("/api/data");
    const found = allData.teams.find((t: any) => t.name === "TEST_TEAM_FOR_PLAYER");
    expect(found).toBeDefined();
    teamId = found.id;
  });

  it("POST /api/players with teamId succeeds and writes the create ledger row", async () => {
    if (!needsAuth() || !teamId) return;
    const { status, data } = await apiPost("/api/players", {
      name: "TEST_PLAYER_WITH_TEAM",
      position: "FW",
      teamId,
      seasonStats: { matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 },
    }, token);
    expect(status).toBe(200);
    expect(data.success).toBe(true);

    const { data: allData } = await apiGet("/api/data");
    const found = allData.players.find((p: any) => p.name === "TEST_PLAYER_WITH_TEAM");
    expect(found).toBeDefined();
    expect(String(found.teamId)).toBe(String(teamId));
    playerId = found.id;

    const mvRes = await fetch(`${BASE}/api/player-movements?playerId=${encodeURIComponent(playerId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(mvRes.status).toBe(200);
    const mvData = await mvRes.json();
    const leg = (mvData.movements || []).find(
      (m: any) => String(m.toTeamId) === String(teamId) && m.fromTeamId == null
    );
    expect(leg).toBeDefined();
  });

  it("DELETE cleanup removes player and fixture team", async () => {
    if (!needsAuth()) return;
    if (playerId) {
      const { status } = await apiDelete(`/api/players/${playerId}`, token);
      expect(status).toBe(200);
    }
    if (teamId) {
      const { status } = await apiDelete(`/api/teams/${teamId}`, token);
      expect(status).toBe(200);
    }
  });
});

describe("API - CRUD: Transfers", () => {
  let createdId = "";

  it("POST /api/transfers creates transfer", async () => {
    if (!needsAuth()) return;
    const { status } = await apiPost("/api/transfers", { playerName: "TEST_TRANSFER", type: "permanent", fee: "100K", fromTeam: "A", toTeam: "B", date: "1404/01/01" }, token);
    expect(status).toBe(200);

    const { data: allData } = await apiGet("/api/data");
    const found = allData.transfers.find((t: any) => t.playerName === "TEST_TRANSFER");
    expect(found).toBeDefined();
    createdId = found.id;
  });

  it("PUT /api/transfers/:id updates transfer", async () => {
    if (!needsAuth() || !createdId) return;
    const { status } = await apiPut(`/api/transfers/${createdId}`, { playerName: "TEST_TRANSFER_EDITED" }, token);
    expect(status).toBe(200);
  });

  it("DELETE /api/transfers/:id removes transfer", async () => {
    if (!needsAuth() || !createdId) return;
    const { status } = await apiDelete(`/api/transfers/${createdId}`, token);
    expect(status).toBe(200);
  });
});

describe("API - CRUD: Legionnaires", () => {
  let createdId = "";

  it("POST /api/legionnaires creates legionnaire", async () => {
    if (!needsAuth()) return;
    const { status } = await apiPost("/api/legionnaires", { name: "TEST_LEG", team: "RM", league: "LaLiga", image: "", matchRating: 8.5, description: "great" }, token);
    expect(status).toBe(200);

    const { data: allData } = await apiGet("/api/data");
    const found = allData.legionnaires.find((l: any) => l.name === "TEST_LEG");
    expect(found).toBeDefined();
    createdId = found.id;
  });

  it("PUT /api/legionnaires/:id updates legionnaire", async () => {
    if (!needsAuth() || !createdId) return;
    const { status } = await apiPut(`/api/legionnaires/${createdId}`, { name: "TEST_LEG_EDITED" }, token);
    expect(status).toBe(200);
  });

  it("DELETE /api/legionnaires/:id removes legionnaire", async () => {
    if (!needsAuth() || !createdId) return;
    const { status } = await apiDelete(`/api/legionnaires/${createdId}`, token);
    expect(status).toBe(200);
  });
});

describe("API - CRUD: Images", () => {
  let createdId = "";

  it("POST /api/images creates image", async () => {
    if (!needsAuth()) return;
    const { status } = await apiPost("/api/images", { url: "https://example.com/t.jpg", title: "TEST_IMG", caption: "c", description: "d" }, token);
    expect(status).toBe(200);

    const { data: allData } = await apiGet("/api/data");
    const found = allData.images.find((i: any) => i.title === "TEST_IMG");
    expect(found).toBeDefined();
    createdId = found.id;
  });

  it("PUT /api/images/:id updates image", async () => {
    if (!needsAuth() || !createdId) return;
    const { status } = await apiPut(`/api/images/${createdId}`, { title: "TEST_IMG_EDITED" }, token);
    expect(status).toBe(200);
  });

  it("DELETE /api/images/:id removes image", async () => {
    if (!needsAuth() || !createdId) return;
    const { status } = await apiDelete(`/api/images/${createdId}`, token);
    expect(status).toBe(200);
  });
});

describe("API - View Count x" + VIEW_MULTIPLIER + " (30-min batch)", () => {
  it("POST /api/news/:id/view queues without immediate bump, flush applies " + VIEW_MULTIPLIER, async () => {
    const { data: before } = await apiGet("/api/data");
    const item = before.news.find((n: any) => n.id);
    if (!item) return;

    const beforeCount = item.viewCount || 0;
    const v = await apiPost(`/api/news/${item.id}/view`, {});
    expect(v.status).toBe(200);
    if ((v.data as any)?.skipped) return; // bot UA in this env: counting skipped by design
    expect((v.data as any)?.queued).toBe(true);
    const { data: mid } = await apiGet("/api/data");
    const midItem = mid.news.find((n: any) => n.id === item.id);
    expect(midItem.viewCount).toBe(beforeCount); // no instant jump anymore
    if (!needsAuth()) return;
    const f = await apiPost("/api/admin/views/flush", {}, token);
    expect(f.status).toBe(200);
    const { data: after } = await apiGet("/api/data");
    const afterItem = after.news.find((n: any) => n.id === item.id);
    expect(afterItem.viewCount).toBe(beforeCount + VIEW_MULTIPLIER);
  });

  it("POST /api/images/:id/view queues without immediate bump, flush applies " + VIEW_MULTIPLIER, async () => {
    const { data: before } = await apiGet("/api/data");
    const item = before.images.find((i: any) => i.id);
    if (!item) return;

    const beforeCount = item.viewCount || 0;
    const v = await apiPost(`/api/images/${item.id}/view`, {});
    expect(v.status).toBe(200);
    if ((v.data as any)?.skipped) return; // bot UA in this env: counting skipped by design
    expect((v.data as any)?.queued).toBe(true);
    const { data: mid } = await apiGet("/api/data");
    const midItem = mid.images.find((i: any) => i.id === item.id);
    expect(midItem.viewCount).toBe(beforeCount); // no instant jump anymore
    if (!needsAuth()) return;
    const f = await apiPost("/api/admin/views/flush", {}, token);
    expect(f.status).toBe(200);
    const { data: after } = await apiGet("/api/data");
    const afterItem = after.images.find((i: any) => i.id === item.id);
    expect(afterItem.viewCount).toBe(beforeCount + VIEW_MULTIPLIER);
  });
});

describe("API - Submissions", () => {
  it("POST /api/contact creates submission", async () => {
    const { status, data } = await apiPost("/api/contact", { name: "Test", email: "t@t.com", subject: "hi", message: "hello" });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe("API - Ads Persistence", () => {
  it("GET /api/ads returns ads array", async () => {
    const { status, data } = await apiGet("/api/ads");
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("POST /api/ads creates item and GET /api/data returns persisted ad", async () => {
    if (!needsAuth()) return;
    const payload = {
      type: "banner",
      name: "تست بنر",
      placement: "top",
      title: "بنر تستی",
      promo: "TEST99",
      description: "توضیح تستی",
      linkUrl: "#",
      btnText: "مشاهده",
      isActive: true
    };
    const postRes = await apiPost("/api/ads", payload, token);
    expect(postRes.status).toBe(200);
    expect(postRes.data.success).toBe(true);

    const { data: fullData } = await apiGet("/api/data");
    const found = fullData.ads.find((a: any) => a.name === "تست بنر");
    expect(found).toBeDefined();
    expect(found.title).toBe("بنر تستی");
  });

  it("PUT /api/ads without auth returns 401", async () => {
    const { status } = await apiPut("/api/ads/some-id", { title: "test" }, "");
    expect(status).toBe(401);
  });

  it("POST /api/ads/:id/view is publicly accessible and increments counter", async () => {
    const { data: before } = await apiGet("/api/ads");
    const target = Array.isArray(before) && before.length > 0 ? before[0] : null;
    if (!target) return;
    const beforeCount = target.viewCount || 0;
    const { status, data } = await apiPost(`/api/ads/${target.id}/view`, {});
    expect(status).toBe(200);
    expect(data.viewCount).toBe(beforeCount + 1);
  });
});

describe("API - Security: Auth Guards", () => {
  const protectedRoutes = [
    { method: "POST", path: "/api/news" },
    { method: "PUT", path: "/api/news/fake-id" },
    { method: "DELETE", path: "/api/news/fake-id" },
    { method: "POST", path: "/api/teams" },
    { method: "PUT", path: "/api/teams/fake-id" },
    { method: "DELETE", path: "/api/teams/fake-id" },
    { method: "POST", path: "/api/players" },
    { method: "POST", path: "/api/transfers" },
    { method: "POST", path: "/api/legionnaires" },
    { method: "POST", path: "/api/images" },
    { method: "POST", path: "/api/ads" },
    { method: "PUT", path: "/api/ads/fake-id" },
    { method: "DELETE", path: "/api/ads/fake-id" },
    { method: "POST", path: "/api/sync" },
  ];

  protectedRoutes.forEach(({ method, path }) => {
    it(`${method} ${path} without auth returns 401`, async () => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const res = await fetch(`${BASE}${path}`, { method, headers, body: JSON.stringify({}) });
      expect(res.status).toBe(401);
    });
  });

  it("GET /api/data is publicly accessible", async () => {
    const { status } = await apiGet("/api/data");
    expect(status).toBe(200);
  });

  it("POST /api/contact is publicly accessible", async () => {
    const { status } = await apiPost("/api/contact", { name: "Pub", email: "p@p.com", subject: "s", message: "m" });
    expect(status).toBe(200);
  });
});

describe("API - Standings & Stats", () => {
  it("GET /api/standings returns standings data", async () => {
    const { status, data } = await apiGet("/api/standings");
    expect(status).toBe(200);
  });

  it("GET /api/stats returns stats data", async () => {
    const { status, data } = await apiGet("/api/stats");
    expect(status).toBe(200);
  });
});

describe("API - System", () => {
  it("GET /api/health returns 200", async () => {
    const { status, data } = await apiGet("/api/health");
    expect(status).toBe(200);
  });

  it("GET /api/logs requires diagnostics permission (401 unauthenticated)", async () => {
    const { status } = await apiGet("/api/logs");
    expect(status).toBe(401);
  });
});
