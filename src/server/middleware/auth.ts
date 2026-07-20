import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import express from "express";

const JWT_SECRET = process.env.JWT_SECRET || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === "production") {
    console.error("[FATAL] JWT_SECRET تنظیم نشده یا خیلی کوتاه است. سرور در حالت production متوقف می‌شود.");
    process.exit(1);
  }
  console.warn("[SECURITY] ⚠ JWT_SECRET تنظیم نشده. از مقدار پیش‌فرض توسعه استفاده می‌شود.");
}

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
  if (process.env.NODE_ENV === "production") {
    console.error("[FATAL] ADMIN_PASSWORD تنظیم نشده یا کمتر از ۸ کاراکتر است. سرور متوقف می‌شود.");
    process.exit(1);
  }
  console.warn("[SECURITY] ⚠ ADMIN_PASSWORD تنظیم نشده یا ضعیف است. از رمز پیش‌فرض توسعه استفاده می‌شود.");
}

export const JWT_SECRET_VALUE = JWT_SECRET || "dev-only-fallback-not-for-production";
export const JWT_EXPIRES_IN = "24h";
export const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

export function generateToken(payload: { username: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET_VALUE, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { username: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET_VALUE) as { username: string; role: string };
  } catch {
    return null;
  }
}

export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "احراز هویت انجام نشده است." });
  }
  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "توکن نامعتبر یا منقضی شده است." });
  }
  next();
}

export function centralAuthGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === "GET" || req.method === "OPTIONS") return next();
  const p = req.originalUrl.split("?")[0];
  const isPublic =
    p === "/api/auth/login" ||
    p === "/api/contact" ||
    p.startsWith("/api/predictions/") ||
    (req.method === "POST" && /^\/api\/news\/[^/]+\/view$/.test(p)) ||
    (req.method === "POST" && /^\/api\/images\/[^/]+\/view$/.test(p));
  if (isPublic) return next();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "احراز هویت انجام نشده است." });
  }
  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "توکن نامعتبر یا منقضی شده است." });
  }
  next();
}
