import { describe, it, expect } from "vitest";
import { generateToken, verifyToken } from "../middleware/auth";

describe("Auth - Token Generation & Verification", () => {
  it("generates a valid JWT token", () => {
    const token = generateToken({ username: "admin", role: "admin" });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("verifies a valid token and returns payload", () => {
    const payload = { username: "admin", role: "admin" };
    const token = generateToken(payload);
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.username).toBe("admin");
    expect(decoded!.role).toBe("admin");
  });

  it("returns null for invalid token", () => {
    const result = verifyToken("invalid.token.here");
    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    const result = verifyToken("");
    expect(result).toBeNull();
  });
});
