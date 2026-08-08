import sharp, { type Metadata } from "sharp";

export const IMAGE_MAX_WIDTH = 1600;
export const WEBP_QUALITY = 90;

export interface OptimizeResult {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  converted: boolean;
}

/**
 * تبدیل تصاویر استاتیک (jpeg/png/webp) به WebP با کیفیت بالا به همراه ریسایز (فقط کوچک‌سازی).
 * فایل‌های SVG و GIF متحرک و فرمت‌های ناشناخته دست‌نخورده برمی‌گردند.
 */
export async function optimizeImageToWebp(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  options?: { maxWidth?: number }
): Promise<OptimizeResult> {
  const maxWidth = options?.maxWidth || IMAGE_MAX_WIDTH;

  let meta: Metadata;
  try {
    meta = await sharp(buffer, { failOn: "none" }).metadata();
  } catch {
    return { buffer, mimeType, fileName, converted: false };
  }

  const fmt = meta.format;
  if (fmt === "svg") return { buffer, mimeType, fileName, converted: false };
  if (fmt === "gif" && (meta.pages ?? 1) > 1) {
    return { buffer, mimeType, fileName, converted: false };
  }
  if (fmt !== "jpeg" && fmt !== "png" && fmt !== "gif" && fmt !== "webp") {
    return { buffer, mimeType, fileName, converted: false };
  }

  try {
    const out = await sharp(buffer, { failOn: "none" })
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, alphaQuality: 100 })
      .toBuffer();
    return {
      buffer: out,
      mimeType: "image/webp",
      fileName: fileName.replace(/\.[^.]+$/, "") + ".webp",
      converted: true
    };
  } catch {
    return { buffer, mimeType, fileName, converted: false };
  }
}
