import helmet from "helmet";
import rateLimit from "express-rate-limit";
import express from "express";
import { verifyToken } from "./auth";

const CORS_ORIGINS = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin: string) => origin.trim())
  .filter(Boolean);

if (CORS_ORIGINS.length === 0) {
  console.warn("[SECURITY] ⚠ CORS_ORIGIN تنظیم نشده است. CORS با محدودیت کار می‌کند.");
}

// [امنیتی] فقط درخواست‌هایی که توکن JWT واقعاً معتبر دارند از ریت‌لیمیت عمومی مستثنی می‌شوند.
// وجود هدر/کوکی به تنهایی کافی نیست؛ امضا با JWT_SECRET تأیید می‌شود تا با کوکی جعلی دور نزنند.
function hasValidToken(req: express.Request): boolean {
  const authHeader = req.headers.authorization;
  const token =
    (authHeader && authHeader.startsWith("Bearer ") && authHeader.split(" ")[1]) ||
    req.cookies?.token;
  if (!token) return false;
  return verifyToken(token) !== null;
}

export function setupSecurityMiddleware(app: express.Application) {
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use((req, res, next) => {
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : null;
    if (origin && CORS_ORIGINS.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    } else if (CORS_ORIGINS.length > 0) {
      res.header("Access-Control-Allow-Origin", CORS_ORIGINS[0]);
    } else {
      res.header("Access-Control-Allow-Origin", "null");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ limit: "30mb", extended: true }));

  app.use((_req, res, next) => {
    const origJson = res.json.bind(res);
    res.json = (body: any) => {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return origJson(body);
    };
    const origSend = res.send.bind(res);
    res.send = (body: any) => {
      const ct = res.getHeader("Content-Type");
      if (typeof ct === "string" && !ct.includes("charset")) {
        res.setHeader("Content-Type", ct + "; charset=utf-8");
      }
      return origSend(body);
    };
    next();
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    skip: (req) => hasValidToken(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید." }
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "تعداد تلاش‌های ورود بیش از حد مجاز است." }
  });
  const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "تعداد پیام‌های ارسالی بیش از حد مجاز است. لطفاً یک ساعت بعد تلاش کنید." }
  });
  app.use("/api/", apiLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/contact", contactLimiter);
}
