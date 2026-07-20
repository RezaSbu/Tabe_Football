import helmet from "helmet";
import rateLimit from "express-rate-limit";
import express from "express";

const CORS_ORIGIN = process.env.CORS_ORIGIN || "";

if (!CORS_ORIGIN) {
  console.warn("[SECURITY] ⚠ CORS_ORIGIN تنظیم نشده است. CORS با محدودیت کار می‌کند.");
}

export function setupSecurityMiddleware(app: express.Application) {
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use((req, res, next) => {
    if (CORS_ORIGIN) {
      res.header("Access-Control-Allow-Origin", CORS_ORIGIN);
    } else {
      res.header("Access-Control-Allow-Origin", "null");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));

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
  app.use("/api/", apiLimiter);
  app.use("/api/auth/login", authLimiter);
}
