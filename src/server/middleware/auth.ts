import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import express from "express";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";

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

export const JWT_SECRET_VALUE = JWT_SECRET || (process.env.NODE_ENV !== "production" ? crypto.randomBytes(48).toString("hex") : "");
export const JWT_EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN || "28800", 10);
export const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);
export const ADMIN_USERNAME_VALUE = ADMIN_USERNAME;

export type AdminRole = "owner" | "news_admin" | "deputy" | "data_admin";

export interface AdminUser {
  username: string;
  passwordHash: string;
  role: AdminRole;
  label: string;
}

export const ALL_PERMISSIONS = [
  "dashboard",
  "matches",
  "bracket",
  "overrides",
  "diagnostics",
  "portal",
  "portal.news",
  "portal.transfers",
  "portal.teamTransfers",
  "portal.legionnaires",
  "portal.gallery",
  "portal.submissions",
  "portal.ads",
  "selectedCombos",
  "players",
  "coaches",
  "teams",
  "media",
  "archive",
  "heroSlides",
  "centralSync"
];

const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "صاحب سایت",
  news_admin: "ادمین انتشار اخبار و گزارش تصویری",
  deputy: "معاون سایت",
  data_admin: "ادمین ورود داده بازیکن/مربی/باشگاه"
};

export function getRoleLabel(role: AdminRole): string {
  return ROLE_LABELS[role] || role;
}

export function getRolePermissions(role: AdminRole): string[] {
  if (role === "owner") return [...ALL_PERMISSIONS];
  if (role === "news_admin") {
    return [
      "dashboard",
      "portal",
      "portal.news",
      "portal.gallery",
      "portal.ads",
      "media",
      "heroSlides"
    ];
  }
  if (role === "data_admin") {
    return [
      "dashboard",
      "matches",
      "portal",
      "portal.news",
      "portal.gallery",
      "media",
      "heroSlides",
      "players",
      "coaches",
      "teams"
    ];
  }
  if (role === "deputy") {
    // [امنیتی] زیرتب‌های نقل‌وانتقال بازیکن‌محور و لژیونرها فقط برای صاحب سایت (owner) باز است.
    return ALL_PERMISSIONS.filter(
      p => p !== "diagnostics" &&
           p !== "centralSync" &&
           p !== "portal.transfers" &&
           p !== "portal.legionnaires"
    );
  }
  return [];
}

function buildAdminUsers(): AdminUser[] {
  const users: AdminUser[] = [];

  if (ADMIN_USERNAME && ADMIN_PASSWORD) {
    users.push({
      username: ADMIN_USERNAME,
      passwordHash: ADMIN_PASSWORD_HASH,
      role: "owner",
      label: ROLE_LABELS.owner
    });
  }

  const newsIds = ["ADMIN_NEWS_1", "ADMIN_NEWS_2", "ADMIN_NEWS_3"];
  for (const id of newsIds) {
    const u = process.env[`${id}_USERNAME`];
    const p = process.env[`${id}_PASSWORD`];
    if (u && p) {
      users.push({
        username: u,
        passwordHash: bcrypt.hashSync(p, 10),
        role: "news_admin",
        label: ROLE_LABELS.news_admin
      });
    }
  }

  const deputyU = process.env.ADMIN_DEPUTY_USERNAME;
  const deputyP = process.env.ADMIN_DEPUTY_PASSWORD;
  if (deputyU && deputyP) {
    users.push({
      username: deputyU,
      passwordHash: bcrypt.hashSync(deputyP, 10),
      role: "deputy",
      label: ROLE_LABELS.deputy
    });
  }

  const dataIds = ["ADMIN_DATA_1", "ADMIN_DATA_2"];
  for (const id of dataIds) {
    const u = process.env[`${id}_USERNAME`];
    const p = process.env[`${id}_PASSWORD`];
    if (u && p) {
      users.push({
        username: u,
        passwordHash: bcrypt.hashSync(p, 10),
        role: "data_admin",
        label: ROLE_LABELS.data_admin
      });
    }
  }

  return users;
}

export const ADMIN_USERS: AdminUser[] = buildAdminUsers();

export function findAdminUser(username: string): AdminUser | undefined {
  return ADMIN_USERS.find(u => u.username === username);
}

export function hasPermission(role: AdminRole, permission: string): boolean {
  if (role === "owner") return true;
  return getRolePermissions(role).includes(permission);
}

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

function extractToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "احراز هویت انجام نشده است." });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "توکن نامعتبر یا منقضی شده است." });
  }
  (req as any).user = { username: decoded.username, role: decoded.role };
  next();
}

export function requirePermission(permission: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "احراز هویت انجام نشده است." });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "توکن نامعتبر یا منقضی شده است." });
    }
    const role = decoded.role as AdminRole;
    if (!hasPermission(role, permission)) {
      return res.status(403).json({ error: "دسترسی شما برای این عملیات کافی نیست." });
    }
    (req as any).user = { username: decoded.username, role };
    next();
  };
}

export function centralAuthGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === "GET" || req.method === "OPTIONS") return next();
  const p = req.originalUrl.split("?")[0];
  const isPublic =
    p === "/api/auth/login" ||
    p === "/api/auth/logout" ||
    p === "/api/contact" ||
    p.startsWith("/api/predictions/") ||
    (req.method === "POST" && /^\/api\/news\/[^/]+\/view$/.test(p)) ||
    (req.method === "POST" && /^\/api\/images\/[^/]+\/view$/.test(p)) ||
    (req.method === "POST" && /^\/api\/ads\/[^/]+\/(view|click)$/.test(p)) ||
    (req.method === "POST" && /^\/api\/detail\/[^/]+\/[^/]+\/view$/.test(p));
  if (isPublic) return next();
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "احراز هویت انجام نشده است." });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "توکن نامعتبر یا منقضی شده است." });
  }
  (req as any).user = { username: decoded.username, role: decoded.role };
  next();
}
