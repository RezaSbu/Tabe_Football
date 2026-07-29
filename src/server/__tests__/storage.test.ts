import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { StorageBuilder, ensureDirSync, getUploadsDir, setUploadsDir } from "../db";

let testDir: string;

function makeTestDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "storage-test-"));
}

function cleanDir(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("ensureDirSync", () => {
  let dir: string;
  beforeEach(() => {
    dir = makeTestDir();
  });
  afterAll(() => cleanDir(dir));

  it("creates a single directory", () => {
    const target = path.join(dir, "newdir");
    ensureDirSync(target);
    expect(fs.existsSync(target)).toBe(true);
    expect(fs.statSync(target).isDirectory()).toBe(true);
  });

  it("creates nested directories recursively", () => {
    const target = path.join(dir, "a", "b", "c");
    ensureDirSync(target);
    expect(fs.existsSync(target)).toBe(true);
  });

  it("does not throw if directory already exists", () => {
    ensureDirSync(dir);
    ensureDirSync(dir);
    expect(fs.existsSync(dir)).toBe(true);
  });
});

describe("UPLOADS_DIR management", () => {
  it("getUploadsDir returns a string path", () => {
    const dir = getUploadsDir();
    expect(typeof dir).toBe("string");
    expect(dir.length).toBeGreaterThan(0);
  });

  it("setUploadsDir changes the returned value", () => {
    const original = getUploadsDir();
    const testPath = "/tmp/test-uploads";
    setUploadsDir(testPath);
    expect(getUploadsDir()).toBe(testPath);
    setUploadsDir(original);
  });
});

describe("StorageBuilder.upload", () => {
  let testDir: string;
  let storage: StorageBuilder;

  beforeAll(() => {
    testDir = makeTestDir();
    storage = new StorageBuilder("test_bucket", testDir);
  });

  afterAll(() => {
    cleanDir(testDir);
  });

  it("writes a file to the correct path", async () => {
    const buffer = Buffer.from("hello world", "utf-8");
    const result = await storage.upload("subdir/test.txt", buffer, { upsert: true });

    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(result.data.path).toBe("subdir/test.txt");

    const fullPath = path.join(testDir, "test_bucket", "subdir", "test.txt");
    expect(fs.existsSync(fullPath)).toBe(true);
    expect(fs.readFileSync(fullPath, "utf-8")).toBe("hello world");
  });

  it("creates intermediate directories automatically", async () => {
    const buffer = Buffer.from("deep nested file", "utf-8");
    const result = await storage.upload("a/b/c/d/deep.txt", buffer, { upsert: true });

    expect(result.error).toBeNull();

    const fullPath = path.join(testDir, "test_bucket", "a", "b", "c", "d", "deep.txt");
    expect(fs.existsSync(fullPath)).toBe(true);
    expect(fs.readFileSync(fullPath, "utf-8")).toBe("deep nested file");
  });

  it("returns file size correctly via buffer", async () => {
    const data = "x".repeat(1024);
    const buffer = Buffer.from(data, "utf-8");
    const result = await storage.upload("size-test.txt", buffer, { upsert: true });

    expect(result.error).toBeNull();

    const fullPath = path.join(testDir, "test_bucket", "size-test.txt");
    const stats = fs.statSync(fullPath);
    expect(stats.size).toBe(1024);
  });

  it("writes binary data correctly (image-like buffer)", async () => {
    const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);
    const result = await storage.upload("binary-test.png", binaryData, { upsert: true });

    expect(result.error).toBeNull();

    const fullPath = path.join(testDir, "test_bucket", "binary-test.png");
    expect(fs.existsSync(fullPath)).toBe(true);
    const written = fs.readFileSync(fullPath);
    expect(written.equals(binaryData)).toBe(true);
    expect(written.length).toBe(10);
  });

  it("overwrites file when upsert is true", async () => {
    await storage.upload("overwrite-test.txt", Buffer.from("original"), { upsert: true });
    await storage.upload("overwrite-test.txt", Buffer.from("replaced"), { upsert: true });

    const fullPath = path.join(testDir, "test_bucket", "overwrite-test.txt");
    expect(fs.readFileSync(fullPath, "utf-8")).toBe("replaced");
  });

  it("returns error when file exists and upsert is false", async () => {
    await storage.upload("no-overwrite.txt", Buffer.from("first"), { upsert: true });
    const result = await storage.upload("no-overwrite.txt", Buffer.from("second"), { upsert: false });

    expect(result.error).not.toBeNull();
    expect(result.error.message).toContain("already exists");

    const fullPath = path.join(testDir, "test_bucket", "no-overwrite.txt");
    expect(fs.readFileSync(fullPath, "utf-8")).toBe("first");
  });

  it("handles empty buffer", async () => {
    const result = await storage.upload("empty.txt", Buffer.alloc(0), { upsert: true });
    expect(result.error).toBeNull();

    const fullPath = path.join(testDir, "test_bucket", "empty.txt");
    expect(fs.existsSync(fullPath)).toBe(true);
    expect(fs.readFileSync(fullPath).length).toBe(0);
  });

  it("handles large buffer (1MB)", async () => {
    const largeBuffer = Buffer.alloc(1024 * 1024, 0xab);
    const result = await storage.upload("large.bin", largeBuffer, { upsert: true });
    expect(result.error).toBeNull();

    const fullPath = path.join(testDir, "test_bucket", "large.bin");
    expect(fs.existsSync(fullPath)).toBe(true);
    expect(fs.readFileSync(fullPath).length).toBe(1024 * 1024);
  });

  it("handles filenames with special characters after sanitization", async () => {
    const result = await storage.upload("normal_name-2024.png", Buffer.from("img"), { upsert: true });
    expect(result.error).toBeNull();

    const fullPath = path.join(testDir, "test_bucket", "normal_name-2024.png");
    expect(fs.existsSync(fullPath)).toBe(true);
  });
});

describe("StorageBuilder.getPublicUrl", () => {
  it("returns correct URL format", () => {
    const storage = new StorageBuilder("media_assets");
    const result = storage.getPublicUrl("team_logo/123_test.png");
    expect(result.data.publicUrl).toBe("/uploads/media_assets/team_logo/123_test.png");
  });

  it("includes bucket name in URL", () => {
    const storage = new StorageBuilder("my_bucket");
    const result = storage.getPublicUrl("file.jpg");
    expect(result.data.publicUrl).toBe("/uploads/my_bucket/file.jpg");
  });

  it("URL does not contain double slashes", () => {
    const storage = new StorageBuilder("media_assets");
    const result = storage.getPublicUrl("category/file.png");
    expect(result.data.publicUrl).not.toContain("//");
    expect(result.data.publicUrl).toBe("/uploads/media_assets/category/file.png");
  });
});

describe("StorageBuilder.remove", () => {
  let testDir: string;
  let storage: StorageBuilder;

  beforeAll(() => {
    testDir = makeTestDir();
    storage = new StorageBuilder("remove_bucket", testDir);
  });

  afterAll(() => {
    cleanDir(testDir);
  });

  it("removes an existing file", async () => {
    await storage.upload("to-delete.txt", Buffer.from("delete me"), { upsert: true });
    const fullPath = path.join(testDir, "remove_bucket", "to-delete.txt");
    expect(fs.existsSync(fullPath)).toBe(true);

    const result = await storage.remove(["to-delete.txt"]);
    expect(result.error).toBeNull();
    expect(fs.existsSync(fullPath)).toBe(false);
  });

  it("does not throw when removing non-existent file", async () => {
    const result = await storage.remove(["does-not-exist.txt"]);
    expect(result.error).toBeNull();
  });

  it("removes multiple files", async () => {
    await storage.upload("multi-a.txt", Buffer.from("a"), { upsert: true });
    await storage.upload("multi-b.txt", Buffer.from("b"), { upsert: true });

    const result = await storage.remove(["multi-a.txt", "multi-b.txt"]);
    expect(result.error).toBeNull();
    expect(fs.existsSync(path.join(testDir, "remove_bucket", "multi-a.txt"))).toBe(false);
    expect(fs.existsSync(path.join(testDir, "remove_bucket", "multi-b.txt"))).toBe(false);
  });
});

describe("Upload + URL consistency", () => {
  let testDir: string;

  beforeAll(() => {
    testDir = makeTestDir();
  });

  afterAll(() => {
    cleanDir(testDir);
  });

  it("file_path on disk matches what getPublicUrl would serve", async () => {
    const bucket = "media_assets";
    const storage = new StorageBuilder(bucket, testDir);
    const filePath = "team_logo/1700000000_test-logo.png";
    const buffer = Buffer.from("fake-png-data");

    const uploadResult = await storage.upload(filePath, buffer, { upsert: true });
    expect(uploadResult.error).toBeNull();

    const { data: { publicUrl } } = storage.getPublicUrl(filePath);
    expect(publicUrl).toBe(`/uploads/${bucket}/${filePath}`);

    const fileOnDisk = path.join(testDir, bucket, filePath);
    expect(fs.existsSync(fileOnDisk)).toBe(true);

    const publicUrlRelativePath = publicUrl.replace("/uploads/", "");
    const expectedDiskPath = path.join(testDir, publicUrlRelativePath);
    expect(fs.existsSync(expectedDiskPath)).toBe(true);

    const diskContent = fs.readFileSync(expectedDiskPath);
    expect(diskContent.equals(buffer)).toBe(true);
  });

  it("all 8 categories produce valid paths", async () => {
    const bucket = "media_assets";
    const storage = new StorageBuilder(bucket, testDir);
    const categories = [
      "player_photo", "team_logo", "coach_photo", "news_image",
      "ad_banner", "match_photo", "stadium_photo", "general"
    ];

    for (const category of categories) {
      const filePath = `${category}/${Date.now()}_test.png`;
      const buffer = Buffer.from(`data-for-${category}`);

      const uploadResult = await storage.upload(filePath, buffer, { upsert: true });
      expect(uploadResult.error).toBeNull();

      const { data: { publicUrl } } = storage.getPublicUrl(filePath);
      expect(publicUrl).toContain(`/uploads/${bucket}/${category}/`);

      const diskPath = path.join(testDir, bucket, filePath);
      expect(fs.existsSync(diskPath)).toBe(true);
      expect(fs.readFileSync(diskPath).toString()).toBe(`data-for-${category}`);
    }
  });

  it("publicUrl always starts with /uploads/", () => {
    const storage = new StorageBuilder("media_assets");
    const paths = [
      "team_logo/test.png",
      "player_photo/123.jpg",
      "general/file.webp",
      "migrated/news_image/456.png"
    ];

    for (const p of paths) {
      const { data: { publicUrl } } = storage.getPublicUrl(p);
      expect(publicUrl.startsWith("/uploads/")).toBe(true);
    }
  });

  it("express.static path resolution matches storage path", () => {
    const uploadsDir = getUploadsDir();
    const bucket = "media_assets";
    const filePath = "category/file.png";

    const storagePath = path.join(uploadsDir, bucket, filePath);
    const publicUrl = `/uploads/${bucket}/${filePath}`;
    const expressServesFrom = path.join(uploadsDir, publicUrl.replace("/uploads/", ""));

    expect(storagePath).toBe(expressServesFrom);
  });
});
