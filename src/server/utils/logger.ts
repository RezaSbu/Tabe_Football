export interface SystemLog {
  timestamp: string;
  level: "info" | "warn" | "error";
  category: "database" | "api" | "auth" | "general";
  message: string;
  details?: any;
}

export const SYSTEM_LOGS: SystemLog[] = [];

export function logMessage(
  level: "info" | "warn" | "error",
  category: "database" | "api" | "auth" | "general",
  message: string,
  details?: any
): void {
  const log: SystemLog = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details
  };
  SYSTEM_LOGS.unshift(log);
  if (SYSTEM_LOGS.length > 500) {
    SYSTEM_LOGS.pop();
  }

  const colors: Record<string, string> = {
    info: "\x1b[32m[INFO]\x1b[0m",
    warn: "\x1b[33m[WARN]\x1b[0m",
    error: "\x1b[31m[ERROR]\x1b[0m"
  };
  console.log(`${colors[level]} [${category.toUpperCase()}] ${message}`, details ? JSON.stringify(details) : "");
}
