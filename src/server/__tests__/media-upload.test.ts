import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import http from "http";
import express from "express";
import { StorageBuilder } from "../db";

const TEST_PORT = 3456;

function makeTestDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "media-route-test-"));
}

function cleanDir(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function startServer(uploadsDir: string, port: number): Promise<http.Server> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json({ limit: "10mb" }));
    app.use("/uploads", express.static(uploadsDir));

    app.post("/api/media/upload", async (req, res) => {
      const { fileName, fileData, category } = req.body;
      if (!fileName || !fileData) {
        return res.status(400).json({ success: false, message: "fileName and fileData required" });
      }

      const buffer = Buffer.from(fileData, "base64");
      const ext = path.extname(fileName).toLowerCase();
      let mimeType = "image/jpeg";
      if (ext === ".png") mimeType = "image/png";

      const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniquePath = `${category || "general"}/${Date.now()}_${cleanFileName}`;

      const storage = new StorageBuilder("media_assets", uploadsDir);
      const { data: uploadData, error: uploadError } = await storage.upload(uniquePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

      if (uploadError) {
        return res.status(500).json({ success: false, message: uploadError.message });
      }

      const { data: { publicUrl } } = storage.getPublicUrl(uniquePath);

      const record = {
        id: `media-${Date.now()}`,
        file_name: cleanFileName,
        file_path: uniquePath,
        image_url: publicUrl,
        file_size: buffer.length,
        mime_type: mimeType,
        category: category || "general",
      };

      res.json({ success: true, file: record });
    });

    app.post("/api/media/upload-multiple", async (req, res) => {
      const { category, files } = req.body;
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ success: false, message: "no files" });
      }

      const storage = new StorageBuilder("media_assets", uploadsDir);
      const uploadedFiles = [];
      const errors = [];

      for (const f of files) {
        const { fileName, fileData } = f || {};
        if (!fileName || !fileData) {
          errors.push({ fileName: fileName || "unknown", error: "missing fields" });
          continue;
        }

        const buffer = Buffer.from(fileData, "base64");
        const ext = path.extname(fileName).toLowerCase();
        const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const uniquePath = `${category || "general"}/${Date.now()}_${Math.random().toString(36).slice(2)}_${cleanFileName}`;

        const { error: uploadError } = await storage.upload(uniquePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

        if (uploadError) {
          errors.push({ fileName, error: uploadError.message });
          continue;
        }

        const { data: { publicUrl } } = storage.getPublicUrl(uniquePath);

        uploadedFiles.push({
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file_name: cleanFileName,
          file_path: uniquePath,
          image_url: publicUrl,
          file_size: buffer.length,
          mime_type: mimeType,
          category: category || "general",
        });
      }

      res.json({ success: uploadedFiles.length > 0, files: uploadedFiles, errors });
    });

    const server = http.createServer(app);
    server.listen(port, () => resolve(server));
  });
}

describe("Media Upload Route - Full Pipeline", () => {
  let testDir: string;
  let server: http.Server;
  const BASE = `http://localhost:${TEST_PORT}`;

  beforeAll(async () => {
    testDir = makeTestDir();
    server = await startServer(testDir, TEST_PORT);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    cleanDir(testDir);
  });

  it("uploads a file and creates correct DB record", async () => {
    const testBase64 = Buffer.from("test image content here").toString("base64");

    const res = await fetch(`${BASE}/api/media/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "test",
        fileName: "test-photo.png",
        category: "team_logo",
        fileData: testBase64,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.file).toBeDefined();

    const record = data.file;
    expect(record.file_name).toBe("test-photo.png");
    expect(record.category).toBe("team_logo");
    expect(record.file_path).toContain("team_logo/");
    expect(record.image_url).toBe(`/uploads/media_assets/${record.file_path}`);
    expect(record.file_size).toBe(Buffer.from("test image content here").length);
    expect(record.mime_type).toBe("image/png");
  });

  it("uploads multiple files in one request with unique paths", async () => {
    const files = [
      { fileName: "multi-a.png", fileData: Buffer.from("aaa").toString("base64") },
      { fileName: "multi-b.png", fileData: Buffer.from("bbb").toString("base64") },
      { fileName: "multi-c.png", fileData: Buffer.from("ccc").toString("base64") },
    ];

    const res = await fetch(`${BASE}/api/media/upload-multiple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "gallery", category: "news_image", files }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.files).toHaveLength(3);
    expect(data.errors).toHaveLength(0);

    const paths = data.files.map((f: any) => f.file_path);
    expect(new Set(paths).size).toBe(3);
    for (const p of paths) {
      expect(p).toContain("news_image/");
      expect(fs.existsSync(path.join(testDir, "media_assets", p))).toBe(true);
    }

    expect(data.files[0].file_size).toBe(3);
    expect(data.files[0].mime_type).toBe("image/png");
  });

  it("rejects request with zero files", async () => {
    const res = await fetch(`${BASE}/api/media/upload-multiple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: [] }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it("file is actually written to disk at the correct path", async () => {
    const testBase64 = Buffer.from("disk-check-content").toString("base64");

    const res = await fetch(`${BASE}/api/media/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "disk-check.jpg",
        category: "player_photo",
        fileData: testBase64,
      }),
    });

    const data = await res.json();
    expect(data.success).toBe(true);

    const record = data.file;
    const diskPath = path.join(testDir, "media_assets", record.file_path);
    expect(fs.existsSync(diskPath)).toBe(true);

    const content = fs.readFileSync(diskPath, "utf-8");
    expect(content).toBe("disk-check-content");
  });

  it("image_url matches what static serving provides", async () => {
    const testBase64 = Buffer.from("static-serve-test").toString("base64");

    const uploadRes = await fetch(`${BASE}/api/media/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "serve-test.png",
        category: "news_image",
        fileData: testBase64,
      }),
    });

    const uploadData = await uploadRes.json();
    expect(uploadData.success).toBe(true);
    const imageUrl = uploadData.file.image_url;

    const serveRes = await fetch(`${BASE}${imageUrl}`);
    expect(serveRes.status).toBe(200);
    expect(serveRes.headers.get("content-type")).toContain("image");

    const servedContent = await serveRes.text();
    expect(servedContent).toBe("static-serve-test");
  });

  it("all categories produce valid file_path and image_url", async () => {
    const categories = [
      "player_photo", "team_logo", "coach_photo", "news_image",
      "ad_banner", "match_photo", "stadium_photo", "general",
    ];

    for (const category of categories) {
      const testBase64 = Buffer.from(`category-test-${category}`).toString("base64");

      const res = await fetch(`${BASE}/api/media/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: `${category}-test.png`,
          category,
          fileData: testBase64,
        }),
      });

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.file.category).toBe(category);
      expect(data.file.file_path).toContain(`${category}/`);
      expect(data.file.image_url).toBe(`/uploads/media_assets/${data.file.file_path}`);

      const diskPath = path.join(testDir, "media_assets", data.file.file_path);
      expect(fs.existsSync(diskPath)).toBe(true);
    }
  });

  it("file_size in record matches actual file on disk", async () => {
    const payload = "x".repeat(5000);
    const testBase64 = Buffer.from(payload).toString("base64");

    const res = await fetch(`${BASE}/api/media/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "size-check.bin",
        category: "general",
        fileData: testBase64,
      }),
    });

    const data = await res.json();
    expect(data.success).toBe(true);

    const diskPath = path.join(testDir, "media_assets", data.file.file_path);
    const stats = fs.statSync(diskPath);
    expect(stats.size).toBe(data.file.file_size);
    expect(stats.size).toBe(5000);
  });

  it("rejects request without fileName", async () => {
    const res = await fetch(`${BASE}/api/media/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileData: "abc" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects request without fileData", async () => {
    const res = await fetch(`${BASE}/api/media/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: "test.png" }),
    });
    expect(res.status).toBe(400);
  });

  it("overwrites file when uploading same path with upsert", async () => {
    const storage = new StorageBuilder("media_assets", testDir);
    const fixedPath = `general/fixed-name-test.png`;

    await storage.upload(fixedPath, Buffer.from("version-1"), { upsert: true });
    await storage.upload(fixedPath, Buffer.from("version-2"), { upsert: true });

    const diskPath = path.join(testDir, "media_assets", fixedPath);
    expect(fs.readFileSync(diskPath, "utf-8")).toBe("version-2");

    const { data: { publicUrl } } = storage.getPublicUrl(fixedPath);
    expect(publicUrl).toBe("/uploads/media_assets/general/fixed-name-test.png");
  });
});
