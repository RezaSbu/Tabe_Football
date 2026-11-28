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
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      // nginx used to send its own copies of these (the browser then saw
      // "SAMEORIGIN, SAMEORIGIN" and two different Referrer-Policy values).
      // The app is now the single source for proxied responses, so keep the
      // values the edge used to send instead of helmet's shorter defaults.
      strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      // X-XSS-Protection stays at helmet's "0": the old edge value
      // "1; mode=block" is deprecated and can introduce XSS in old IE.
    })
  );
  app.use((req, res, next) => {
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : null;
    // Only answer CORS for an origin that is explicitly allowed. The old code
    // also echoed CORS_ORIGINS[0] on EVERY response, and .env ships
    // CORS_ORIGIN=http://localhost:3000, so production advertised a dev origin
    // to every browser and paid ~40 bytes per response for it.
    if (origin && CORS_ORIGINS.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    // nginx no longer sets this on proxied responses (see nginx/prod.conf).
    res.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
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
    // Reads are already rate-limited per IP at the edge (limit_req 20r/s,
    // burst 50), and they are exactly what a normal visitor repeats. Counting
    // them here turned one shared address into 429s for everyone behind it:
    // Iranian mobile carriers put many users on one CGNAT IP, and the app is
    // not reachable from the internet anyway (prod publishes only nginx).
    // Writes, auth and contact keep their own budgets below.
    skip: (req) =>
      req.method === "GET" ||
      req.method === "HEAD" ||
      hasValidToken(req) ||
      // originalUrl, not req.path: inside `app.use("/api/", ...)` Express has
      // already stripped the mount prefix, so req.path is "/visit" and the old
      // check never matched. Every page view POSTs /api/visit, so those were
      // silently eating the 200-request budget.
      (req.originalUrl || "").split("?")[0] === "/api/visit",
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید." }
  });
  const visitLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "تعداد ثبت بازدید بیش از حد مجاز است." }
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
  app.use("/api/visit", visitLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/contact", contactLimiter);
}
