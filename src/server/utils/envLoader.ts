import * as fs from "fs";
import * as path from "path";
import { logMessage } from "./logger";

export function loadEnvFile(filename: string): void {
  const filepath: string = path.join(process.cwd(), filename);
  if (fs.existsSync(filepath)) {
    try {
      const dotenvContent: string = fs.readFileSync(filepath, "utf-8");
      let count: number = 0;
      dotenvContent.split("\n").forEach((line: string) => {
        const trimmed: string = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const parts: string[] = trimmed.split("=");
          const key: string = parts[0].trim();
          let value: string = parts.slice(1).join("=").trim();
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          process.env[key] = value;
          count++;
        }
      });
      logMessage("info", "general", `فایل تنظیمات ${filename} با موفقیت بارگذاری شد (${count} متغیر فعال شدند).`);
    } catch (err: any) {
      logMessage("error", "general", `خطا در خواندن فایل محیطی ${filename}:`, err.message || err);
    }
  }
}

loadEnvFile(".env.example");
loadEnvFile(".env");
loadEnvFile(".env.local");
