import { describe, it, expect } from "vitest";
import { generateToken, requireOwner } from "../middleware/auth";

function mockReq(token?: string) {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as any;
}

function mockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: any) => {
    res.body = body;
    return res;
  };
  return res;
}

describe("requireOwner (tabe_admin only)", () => {
  it("401 without token", () => {
    const res = mockRes();
    let next = false;
    requireOwner()(mockReq(), res, () => { next = true; });
    expect(res.statusCode).toBe(401);
    expect(next).toBe(false);
  });

  it("401 with invalid token", () => {
    const res = mockRes();
    let next = false;
    requireOwner()(mockReq("bad.token.here"), res, () => { next = true; });
    expect(res.statusCode).toBe(401);
    expect(next).toBe(false);
  });

  it("403 for deputy/data roles", () => {
    for (const role of ["deputy", "data_admin", "news_admin"]) {
      const token = generateToken({ username: `some-${role}`, role });
      const res = mockRes();
      let next = false;
      requireOwner()(mockReq(token), res, () => { next = true; });
      expect(res.statusCode).toBe(403);
      expect(next).toBe(false);
    }
  });

  it("passes owner role", () => {
    const token = generateToken({ username: "the-owner", role: "owner" });
    const res = mockRes();
    let next = false;
    const req = mockReq(token);
    requireOwner()(req, res, () => { next = true; });
    expect(next).toBe(true);
    expect((req as any).user.username).toBe("the-owner");
  });

  it("passes tabe_admin username", () => {
    const token = generateToken({ username: "tabe_admin", role: "owner" });
    const res = mockRes();
    let next = false;
    requireOwner()(mockReq(token), res, () => { next = true; });
    expect(next).toBe(true);
  });
});
