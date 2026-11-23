import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { storeUploadedImage } from "../routes/media";
import { getUploadsDir, setUploadsDir } from "../db";

// 1x1 transparent PNG: passes the magic-byte check used by the real route.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

describe("storeUploadedImage (raw upload pipeline)", () => {
  let tmp: string;
  const previousUploadsDir = getUploadsDir();

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tabe-raw-upload-"));
    setUploadsDir(tmp);
  });

  afterAll(() => {
    setUploadsDir(previousUploadsDir);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("validates, optimizes, writes the file and returns a DB record", async () => {
    const result = await storeUploadedImage({
      fileName: "pixel.png",
      buffer: PNG_1PX,
      title: "پیکسل",
      category: "news_image",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const record = result.record;
    expect(record.title).toBe("پیکسل");
    expect(record.category).toBe("news_image");
    expect(record.file_path.startsWith("news_image/")).toBe(true);
    expect(record.image_url).toBe(`/uploads/media_assets/${record.file_path}`);
    expect(record.file_size).toBeGreaterThan(0);
    expect(["image/webp", "image/png"]).toContain(record.mime_type);

    const onDisk = path.join(tmp, "media_assets", record.file_path);
    expect(fs.existsSync(onDisk)).toBe(true);
    expect(fs.statSync(onDisk).size).toBe(record.file_size);
  });

  it("rejects a buffer whose magic bytes do not match the extension", async () => {
    const result = await storeUploadedImage({
      fileName: "fake.png",
      buffer: Buffer.from("not an image"),
      category: "news_image",
    });

    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects unsupported extensions", async () => {
    const result = await storeUploadedImage({
      fileName: "payload.exe",
      buffer: PNG_1PX,
      category: "general",
    });

    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("enforces the 8MB cap", async () => {
    const result = await storeUploadedImage({
      fileName: "huge.png",
      buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
      category: "general",
    });

    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("sanitizes the category into a safe path segment", async () => {
    const result = await storeUploadedImage({
      fileName: "pixel.png",
      buffer: PNG_1PX,
      category: "../../etc",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.category).toBe("______etc");
    expect(result.record.file_path.startsWith("______etc/")).toBe(true);
    expect(result.record.file_path.includes("..")).toBe(false);
  });
});
