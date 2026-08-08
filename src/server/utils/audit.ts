import { pool } from "../db";
import { logMessage } from "./logger";

// ============================================
// Audit Trail + Authentication Events
// ============================================

export interface AuditEntry {
  username: string;
  role?: string;
  action: string;
  method?: string;
  path?: string;
  ip?: string;
  details?: any;
}

// ثبت غیرهمزمان عملیات ادمین در جدول audit_logs (بدون بلوکه‌کردن درخواست)
export function auditLog(entry: AuditEntry): void {
  pool
    .query(
      `INSERT INTO public.audit_logs (username, role, action, method, path, ip, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [
        entry.username || "unknown",
        entry.role || null,
        entry.action,
        entry.method || null,
        (entry.path || "").slice(0, 500),
        entry.ip || null,
        entry.details ? JSON.stringify(entry.details) : null,
      ]
    )
    .catch((err: any) => {
      // قبل از اجرای مهاجرت ممکن است جدول وجود نداشته باشد؛ بی‌صدا نادیده بگیر
      if (/does not exist/i.test(err?.message || "")) return;
      logMessage("warn", "auth", "خطا در ثبت لاگ عملیات ادمین", err?.message || err);
    });
}

// ============================================
// Auth events (login success/failure) — in-memory
// ============================================

const MAX_AUTH_EVENTS = 400;

export interface AuthEvent {
  username: string;
  success: boolean;
  ip?: string;
  at: string;
}

export const AUTH_EVENTS: AuthEvent[] = [];

export function recordAuthEvent(username: string, success: boolean, ip?: string): void {
  AUTH_EVENTS.unshift({ username, success, ip, at: new Date().toISOString() });
  if (AUTH_EVENTS.length > MAX_AUTH_EVENTS) {
    AUTH_EVENTS.pop();
  }
}
