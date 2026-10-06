import { describe, it, expect } from "vitest";
import {
  DESKTOP_VIEWPORT_WIDTH,
  NARROW_BREAKPOINT,
  DEVICE_VIEWPORT,
  isAdminPath,
  shouldUseDesktopViewport,
  resolveViewportContent,
  type ViewportEnv,
} from "./viewport";

const phone390: ViewportEnv = { screenWidth: 390, innerWidth: 390, coarsePointer: true, pathname: "/" };
const desktop1440: ViewportEnv = { screenWidth: 1440, innerWidth: 1440, coarsePointer: false, pathname: "/" };

describe("viewport isAdminPath", () => {
  it("matches /admin and children only", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/matches")).toBe(true);
    expect(isAdminPath("/")).toBe(false);
    expect(isAdminPath("/news/1")).toBe(false);
    expect(isAdminPath("/administrator")).toBe(false);
  });
});

describe("viewport shouldUseDesktopViewport", () => {
  it("phones get the fixed desktop viewport", () => {
    expect(shouldUseDesktopViewport(phone390)).toBe(true);
    expect(shouldUseDesktopViewport({ ...phone390, screenWidth: 412 })).toBe(true);
    expect(shouldUseDesktopViewport({ ...phone390, screenWidth: 360 })).toBe(true);
  });
  it("landscape phones and tablets stay scaled", () => {
    expect(shouldUseDesktopViewport({ ...phone390, screenWidth: 844, innerWidth: 844 })).toBe(true);
    expect(shouldUseDesktopViewport({ ...phone390, screenWidth: 820, innerWidth: 820 })).toBe(true);
  });
  it("desktops keep device-width, even with narrow windows", () => {
    expect(shouldUseDesktopViewport(desktop1440)).toBe(false);
    expect(shouldUseDesktopViewport({ ...desktop1440, screenWidth: 1366, innerWidth: 1366 })).toBe(false);
    // Narrow desktop window (fine pointer): zero desktop regression.
    expect(shouldUseDesktopViewport({ ...desktop1440, screenWidth: 1920, innerWidth: 900 })).toBe(false);
  });
  it("admin routes always keep device-width", () => {
    expect(shouldUseDesktopViewport({ ...phone390, pathname: "/admin" })).toBe(false);
    expect(shouldUseDesktopViewport({ ...phone390, pathname: "/admin/matches" })).toBe(false);
  });
  it("1024px boundary stays device-width", () => {
    expect(shouldUseDesktopViewport({ ...phone390, screenWidth: 1024, innerWidth: 1024 })).toBe(false);
  });
});

describe("viewport resolveViewportContent", () => {
  it("emits the measured desktop width for scaled phones", () => {
    expect(resolveViewportContent(phone390)).toBe(`width=${DESKTOP_VIEWPORT_WIDTH}, initial-scale=1`);
    expect(DESKTOP_VIEWPORT_WIDTH).toBe(1200);
    expect(NARROW_BREAKPOINT).toBe(1024);
  });
  it("keeps device-width otherwise", () => {
    expect(resolveViewportContent(desktop1440)).toBe(DEVICE_VIEWPORT);
    expect(resolveViewportContent({ ...phone390, pathname: "/admin" })).toBe(DEVICE_VIEWPORT);
  });
  it("never restricts pinch zoom", () => {
    for (const env of [phone390, desktop1440]) {
      const out = resolveViewportContent(env);
      expect(out).not.toMatch(/maximum-scale/i);
      expect(out).not.toMatch(/user-scalable\s*=\s*no/i);
    }
  });
});
