import { useEffect, useState } from "react";

// Desktop-style mobile behavior: touch devices with narrow screens render
// the desktop layout (fixed 1200px layout viewport, scaled down, with
// pinch-zoom + pan) instead of a separate stacked mobile UI.
//
// Why this works with zero CSS changes: every responsive rule in the app is
// a Tailwind min-width prefix (sm/md/lg), so at a 1200px layout viewport all
// of them evaluate to their desktop branch automatically. The only JS width
// branch (MatchPitch vertical mode) also follows the layout viewport.
// Never add maximum-scale/user-scalable=no here: pinch zoom must stay free.
export const DESKTOP_VIEWPORT_WIDTH = 1200;
// Below the lg breakpoint the phone would otherwise build a mobile UI.
export const NARROW_BREAKPOINT = 1024;
export const DEVICE_VIEWPORT = "width=device-width, initial-scale=1.0";

export interface ViewportEnv {
  /** window.screen.width (physical CSS px, orientation-independent-ish) */
  screenWidth: number | null;
  /** window.innerWidth (current layout viewport) */
  innerWidth: number | null;
  /** matchMedia("(pointer: coarse)").matches */
  coarsePointer: boolean;
  /** window.location.pathname */
  pathname: string;
}

export function isAdminPath(pathname: string): boolean {
  return /^\/admin(\/|$)/.test(pathname || "");
}

// Pure rule (unit-tested): fixed desktop viewport only for touch devices
// with a narrow screen on public routes. Narrow desktop windows keep
// device-width (zero desktop regression); /admin keeps device-width.
export function shouldUseDesktopViewport(env: ViewportEnv): boolean {
  if (isAdminPath(env.pathname)) return false;
  if (!env.coarsePointer) return false;
  const w = Math.min(env.screenWidth ?? Infinity, env.innerWidth ?? Infinity);
  return w < NARROW_BREAKPOINT;
}

export function resolveViewportContent(env: ViewportEnv): string {
  return shouldUseDesktopViewport(env)
    ? `width=${DESKTOP_VIEWPORT_WIDTH}, initial-scale=1`
    : DEVICE_VIEWPORT;
}

export function readViewportEnv(): ViewportEnv {
  if (typeof window === "undefined") {
    return { screenWidth: null, innerWidth: null, coarsePointer: false, pathname: "/" };
  }
  let coarse = false;
  try {
    coarse = !!window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  } catch {
    /* matchMedia unavailable: stay on device-width */
  }
  return {
    screenWidth: typeof window.screen?.width === "number" ? window.screen.width : null,
    innerWidth: typeof window.innerWidth === "number" ? window.innerWidth : null,
    coarsePointer: coarse,
    pathname: window.location?.pathname || "/",
  };
}

export function applyViewport(): string {
  const content = resolveViewportContent(readViewportEnv());
  try {
    const tag = document.querySelector('meta[name="viewport"]');
    if (tag) tag.setAttribute("content", content);
  } catch {
    /* DOM unavailable: no-op */
  }
  return content;
}

// True while the page is rendered through the scaled desktop viewport
// (used to suppress fixed-position floating ads that would be tiny and
// off-screen at ~0.3 scale; in-flow ad slots are unaffected).
export function useIsScaledMobile(): boolean {
  const [scaled, setScaled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return shouldUseDesktopViewport(readViewportEnv());
  });
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => setScaled(shouldUseDesktopViewport(readViewportEnv()));
    const debounced = () => {
      clearTimeout(t);
      t = setTimeout(refresh, 250);
    };
    window.addEventListener("orientationchange", debounced);
    window.addEventListener("resize", debounced);
    return () => {
      clearTimeout(t);
      window.removeEventListener("orientationchange", debounced);
      window.removeEventListener("resize", debounced);
    };
  }, []);
  return scaled;
}
