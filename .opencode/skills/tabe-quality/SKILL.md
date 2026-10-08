---
name: tabe-quality
description: Quality gates for Tabe Football — performance budgets, accessibility, SEO (Helmet/canonical/JSON-LD), and vitest strategy. Use before finishing any user-facing change or when touching data fetching, images, lists, or detail pages.
---

# tabe-quality — Performance, A11y, SEO, Testing

## 1. Performance (this repo's actual bottlenecks)
- Data: bulk `GET /api/data` is ~MBs — list surfaces use `fetchCachedAppData` (cached, single-flight); detail surfaces use slim `GET /api/detail/*`; admin uses `GET /api/admin/*`. Never add a new bulk fetch; never `JSON.stringify` large tables in render.
- After admin writes: `invalidateAppDataCache()` + refetch, or the UI serves stale data.
- Lists: paginate with `ADMIN_LIST_PAGE_SIZE = 24` pattern; scope numbers by `seasonId` (computing career-wide on every render is the classic slowdown — hoist with `useMemo`).
- Images: `getSafeImageUrl()` (image-proxy) + `loading="lazy"` + `onError` fallback + `referrerPolicy="no-referrer"`. Uploads pipeline uses `sharp` (watermark/resize) — don't bypass it with external hotlinks.
- Code-split: all pages are `React.lazy` in `App.tsx` — keep it that way; new heavy widgets get their own lazy chunk, never bundled into the index chunk.
- Re-renders: goal-polling (`fetchDataQuietly`) and tickers re-render often — keep their subtrees small, memoize derived stats.

## 2. Accessibility
- Interactive elements are REAL `<button>`s (established: `aria-pressed` on toggle buttons in `MatchWeekWidget`). Never `div onClick` in new code; when touching old clickable divs, convert them.
- Images: meaningful `alt` (player/team names), decorative ones `alt=""`. Focus states must stay visible (`focus-visible` rings; don't remove outlines without replacement). Contrast: slate-400-on-dark minimum for meta text; amber/red text only on tinted pills, never on bare dark bg.
- Keyboard: tab bars, pickers, and dialogs operable by keyboard; pitch nodes reachable where interactive.

## 3. SEO
- Two patterns, don't mix them up: shared `components/SEO.tsx` on tab surfaces (`App.tsx` — home has `WebSite+SearchAction` JSON-LD); raw `<Helmet>` in the 8 detail pages (`News|Gallery|Team|Player|Match|Coach|Legionnaire|TransferDetailPage`) with `title|description|canonical https://tabefotbal.ir/<type>/<id>|og:* (fa_IR)|twitter:*` + entity JSON-LD (`NewsArticle`, `Person` w/ `jobTitle: فوتبالیست`).
- New public route = new Helmet block + canonical + JSON-LD. Never leave a public page without canonical. Admin routes: no indexable tags, keep `robots` exclusion behavior.

## 4. Testing
- `npx vitest run` — 30 files, mostly server matrix tests (`season-stats`, `coach-career-matrix`, `syncResolver`, `playerIdentity`, `matchMinute`) + `utils.test.ts`. New logic gets a co-located `*.test.ts` in the same style (pure functions, deterministic fixtures).
- `api.test.ts` has KNOWN flaky env failures (5s timeouts, dev-server HTML on standings/stats, contact rate-limit). If it fails, verify the failure matches this signature before investigating; never "fix" it with drive-by changes.
- UI changes: no component-test infra exists (`@testing-library/react` is installed but unused) — verify visually at 3 widths + both themes instead of inventing a harness. E2E: none — say so if asked, don't scaffold one unasked.

## 5. Gate checklist (run before handoff)
`tsc --noEmit` → `eslint src/` → `vitest run` → production `vite build` → container sync + restart → check `127.0.0.1:3000` (health + touched pages, 360/768/1280px, dark + light) → `git diff` review (no `Figma/`, mock, or unrelated files).
