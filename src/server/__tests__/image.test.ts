import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { optimizeImageToWebp, buildWatermarkSvg } from "../utils/image";

async function makeTestPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 90, b: 160 }
    }
  }).png().toBuffer();
}

describe("optimizeImageToWebp - Watermark", () => {
  it("builds watermark svg with 3 text elements (center + 2 corners)", () => {
    const svg = buildWatermarkSvg(1200, 800, "Zm9udA==").toString("utf8");
    const count = (svg.match(/<text/g) || []).length;
    expect(count).toBe(3);
    expect(svg).toContain("تب فوتبال");
    expect(svg).toContain("tabefotbal.ir");
  });

  it("applies watermark to large photos (news_image)", async () => {
    const src = await makeTestPng(1200, 800);
    const result = await optimizeImageToWebp(src, "photo.png", "image/png", { category: "news_image" });
    expect(result.converted).toBe(true);
    expect(result.mimeType).toBe("image/webp");
    expect(result.watermarked).toBe(true);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(800);
  });

  it("skips watermark for team_logo and ad_banner categories", async () => {
    const src = await makeTestPng(1200, 800);
    for (const category of ["team_logo", "ad_banner"]) {
      const result = await optimizeImageToWebp(src, "logo.png", "image/png", { category });
      expect(result.converted).toBe(true);
      expect(result.watermarked).toBeUndefined();
    }
  });

  it("skips watermark for small images below minimum width", async () => {
    const src = await makeTestPng(300, 200);
    const result = await optimizeImageToWebp(src, "small.png", "image/png", { category: "news_image" });
    expect(result.converted).toBe(true);
    expect(result.watermarked).toBeUndefined();
  });

  it("resizes wide images to max width before watermarking", async () => {
    const src = await makeTestPng(3000, 1500);
    const result = await optimizeImageToWebp(src, "wide.png", "image/png", { category: "general" });
    expect(result.converted).toBe(true);
    expect(result.watermarked).toBe(true);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(1600);
    expect(meta.height).toBe(800);
  });

  it("leaves svg and animated gifs untouched", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#f00"/></svg>');
    const svgResult = await optimizeImageToWebp(svg, "logo.svg", "image/svg+xml", { category: "news_image" });
    expect(svgResult.converted).toBe(false);
    expect(svgResult.mimeType).toBe("image/svg+xml");
  });
});
