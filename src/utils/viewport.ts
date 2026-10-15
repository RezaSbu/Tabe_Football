// Desktop-on-Mobile: touch devices with narrow screens render the desktop
// layout at a fixed 1122px layout viewport, auto-fitted to the screen width
// (initial-scale = screenWidth / 1122). The whole desktop page is visible at
// once; pinch-zoom and pan stay completely free.
//
// Why an explicit initial-scale (and not a bare `width=1122`): with no
// initial-scale the browser auto-fits, but the exact scale is then
// unpredictable across browsers; pinning the fitted scale makes behavior
// deterministic and keeps `--app-min-h` measurable from the visual viewport.
//
// Why this works with zero CSS/layout changes: every responsive rule in the
// app is a Tailwind min-width prefix (sm/md/lg), so at a 1122px layout
// viewport all of them evaluate to their desktop branch automatically. All
// inner containers are fluid max-w-* (shell max-w-7xl); wide tables scroll
// inside their own overflow-x-auto wrappers.
//
// Whitespace note: a fixed-width layout viewport inflates `100vh` (layout
// height ~= screenHeight / scale, ~2600px on a 390px phone), so the app
// shell uses `--app-min-h` (real visual-viewport height) instead of `100vh`.
//
// Never add maximum-scale/user-scalable=no: pinch zoom must stay free
// (user-scalable=yes is emitted explicitly on the scaled branch).
export const DESKTOP_VIEWPORT_WIDTH = 1122;
// Below this layout width a touch screen would otherwise build a mobile UI.
export const NARROW_BREAKPOINT = 1122;
export const DEVICE_VIEWPORT = "width=device-width, initial-scale=1.0";
// Guard rails for the computed fit-scale (never zoom in past 1:1).
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 1;
// Class toggled on <html> while the scaled desktop viewport is active;
// used to hide non-essential fixed overlays (ads) on scaled mobile only.
export const SCALED_CLASS = "is-scaled-mobile";

export interface ViewportEnv {
  /** window.screen.width (physical CSS px, stable across viewport changes) */
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

// Pure rule (unit-tested): fixed desktop viewport only for touch devices with
// a narrow screen on public routes. Narrow desktop windows keep device-width
// (zero desktop regression — fine-pointer devices are never touched);
// /admin keeps device-width.
export function shouldUseDesktopViewport(env: ViewportEnv): boolean {
  if (isAdminPath(env.pathname)) return false;
  if (!env.coarsePointer) return false;
  const w = Math.min(env.screenWidth ?? Infinity, env.innerWidth ?? Infinity);
  return w < NARROW_BREAKPOINT;
}

// Fit-scale: how much to zoom OUT so the 1122px layout fits the screen.
// E.g. 390 -> 0.348. Clamped to [MIN_SCALE, MAX_SCALE].
//
// Uses the physical screen width, NOT innerWidth: once `width=1122` is
// applied the layout viewport itself becomes 1122 wide (innerWidth ===
// 1122), so deriving the scale from innerWidth would flip back to 1:1 on
// the next resize/re-apply.
export function computeScale(env: ViewportEnv): number {
  const w = env.screenWidth ?? env.innerWidth;
  if (!w || w <= 0) return 1;
  const scale = w / DESKTOP_VIEWPORT_WIDTH;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(scale.toFixed(3))));
}

export function resolveViewportContent(env: ViewportEnv): string {
  return shouldUseDesktopViewport(env)
    ? `width=${DESKTOP_VIEWPORT_WIDTH}, initial-scale=${computeScale(env)}, user-scalable=yes`
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

// Height of the area the user actually sees, in CSS px. On the scaled
// desktop viewport `100vh` is inflated (layout height = screenHeight /
// scale), so the app shell reads `--app-min-h` for its min-height instead.
export function measureAppMinHeight(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  const h = (vv && vv.height ? vv.height : window.innerHeight) || 0;
  return Math.round(h);
}

// Apply the resolved viewport meta tag, the real-height CSS var, and the
// scaled-mode class. Returns the content that was set so callers (and the
// pre-paint inline script) share one source of truth.
export function applyViewport(): string {
  const env = readViewportEnv();
  const content = resolveViewportContent(env);
  const scaled = shouldUseDesktopViewport(env);
  try {
    const tag = document.querySelector('meta[name="viewport"]');
    if (tag && tag.getAttribute("content") !== content) tag.setAttribute("content", content);
    const h = measureAppMinHeight();
    if (h > 0) document.documentElement.style.setProperty("--app-min-h", `${h}px`);
    document.documentElement.classList.toggle(SCALED_CLASS, scaled);
  } catch {
    /* DOM unavailable: no-op */
  }
  return content;
}
