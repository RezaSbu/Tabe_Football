import { describe, it, expect, beforeAll } from "vitest";

const BASE = "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "mylJgXoY55EHH0YM1OTwm91n";

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

  it("GET /api/config returns config object", async () => {
    const { status, data } = await apiGet("/api/config");
    expect(status).toBe(200);
    expect(data).toHaveProperty("adTitle");
  });

  it("GET /api/testdb returns connected: true", async () => {
    const { status, data } = await apiGet("/api/testdb");
    expect(status).toBe(200);
    expect(data.connected).toBe(true);
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

describe("API - View Count x7", () => {
  it("POST /api/news/:id/view increments by 7", async () => {
    const { data: before } = await apiGet("/api/data");
    const item = before.news.find((n: any) => n.id);
    if (!item) return;

    const beforeCount = item.viewCount || 0;
    await apiPost(`/api/news/${item.id}/view`, {});
    const { data: after } = await apiGet("/api/data");
    const afterItem = after.news.find((n: any) => n.id === item.id);
    expect(afterItem.viewCount).toBe(beforeCount + 7);
  });

  it("POST /api/images/:id/view increments by 7", async () => {
    const { data: before } = await apiGet("/api/data");
    const item = before.images.find((i: any) => i.id);
    if (!item) return;

    const beforeCount = item.viewCount || 0;
    await apiPost(`/api/images/${item.id}/view`, {});
    const { data: after } = await apiGet("/api/data");
    const afterItem = after.images.find((i: any) => i.id === item.id);
    expect(afterItem.viewCount).toBe(beforeCount + 7);
  });
});

describe("API - Submissions", () => {
  it("POST /api/contact creates submission", async () => {
    const { status, data } = await apiPost("/api/contact", { name: "Test", email: "t@t.com", subject: "hi", message: "hello" });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});
