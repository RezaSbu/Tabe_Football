---
name: tabe-design-system
description: Tabe Football visual language — Tailwind v4 tokens, colors, typography, cards, light/dark themes, loading/empty states, icons. Use when writing or restyling any JSX/Tailwind in this repo.
---

# tabe-design-system — Visual Language

Tailwind v4.1 via `@tailwindcss/vite`. NO `tailwind.config.*` — tokens live in `src/index.css` (`@import "tailwindcss"` + `@theme`). Never invent palette entries; use the values below.

## 1. Surfaces, text, accent (dark-first)
| Use | Classes / hex |
|---|---|
| Page bg | `body{background:#030712}` (`index.css:27`) |
| Card | `bg-[#121215]`, inner `bg-[#0a0a0c]`, alt card `bg-[#18181c]/40`, borders `border border-white/5` |
| Chips | `bg-white/5`, inner rows `bg-gray-900/950`, logo tile `bg-black/40` |
| Headings | `text-white font-black` (section `h2 text-lg`, column `h3 text-xs`) |
| Names/rows | `text-slate-200/300`, meta `text-slate-400/500`, faint `text-gray-300/400/500` |
| Accent | `text-emerald-400`, hovers `hover:text-emerald-400 hover:border-emerald-500/30` |
| Primary CTA | `bg-emerald-500 text-black hover:bg-emerald-400` |
| Custom tokens (`@theme`, `index.css:4-23`) | `--color-red-650 #d91b23`, `--color-red-655 #be1218`, `--color-gray-805 #1e293b`, `--color-gray-850 #1b202e`, `--color-gray-855 #181d29`, `--shadow-glow-emerald/red/amber`, `--shadow-lift` |

## 2. Status pills (copy exactly; `MatchCard.tsx:71-93`)
- Live: `bg-red-950 text-red-500 border-red-950 animate-pulse` (+ `• زنده {minutes}'`)
- Half-time: `bg-amber-950 text-amber-400 border-amber-900/60`
- Finished: `rounded bg-slate-800 text-slate-400` + label `پایان یافته`
- Upcoming: `bg-emerald-950 text-emerald-400 border-emerald-900/10` (shows `time`)
- Per-stat colors: scorers `text-red-500`, assists `text-sky-400`, clean sheets `text-amber-550`, rating `text-emerald-400`.

## 3. Typography
- Fonts loaded in CSS (`index.css:1`): **Vazirmatn** (`--font-sans`) for everything, **JetBrains Mono** (`--font-mono`) for Latin digits/scores/ranks ONLY. `index.html` has only a fonts `preconnect`, no `<link>` tags.
- Patterns: rows `text-[11px] font-bold`, chips `text-[10px]/text-[9px] font-bold/black`, scores `text-xl font-mono font-black`, section titles `font-black` with `border-r-4 border-emerald-500 pr-2` on detail pages.
- Radius: cards `rounded-2xl`, inner `rounded-xl`, chips `rounded-lg`, pills/dots `rounded-full`. Shadows usually bare `shadow(-lg/xl/2xl)`.

## 4. Light theme (isolated or global — same mechanism)
- Toggle: `ThemeToggle.tsx` flips `documentElement.classList` (`tabefootball-theme` in localStorage, default dark); `index.html:33-44` restores pre-paint; read reactively via `useLightTheme()` (MutationObserver).
- ALL overrides live under `html.light` in `src/index.css:98-774` (palette remaps + `bg-[#121215]/bg-[#0a0a0c]/bg-white/5/border-white/*` → CSS vars). Never add global selectors outside this scope for theme work.
- Dark-locked scopes (keep dark even in light mode): `.hero-slider .news-slider .ad-banner-card .hazfi-final-card .combo-pitch .match-hero .team-of-week-light` (`index.css:357-427,658-774`). New dark-only artwork must register its scope class here.

## 5. States & motion
- Loading: `Loader2 animate-spin text-emerald-500` (detail pages) or `ui/Skeleton.tsx` (`SkeletonCard/Row/Grid/List`, `.skeleton-shimmer`).
- Empty: `ui/EmptyState.tsx` (dashed `border-white/10 bg-[#121215]/40` + lucide icon + `title+hint+action`). There is NO error component — reuse `EmptyState` for errors too. Legacy inline gray-text fallbacks exist; do not copy them into new code.
- Animation: `motion/react` is used in ONLY 2 files (`FanPredictions`, `GoalNotification`). Everything else: CSS `animate-in fade-in slide-in-from-bottom-*`, `animate-pulse` for live, `animate-spin/ping` for loaders. Do not add framer-motion; `motion` is already the installed package.

## 6. Icons — lucide + match-event SVG set
- ~80 files import from `lucide-react`. Canonical match-event icons: `src/matchcenter/EventIcon.tsx` (hand-drawn SVG set, 11 event types + MVP star, `EventIcon type= size=` API, used by `MatchDetailView`) — use it for ALL new event UI.
- Emoji is grandfathered ONLY in: `PlayerDetail` match-log chips (⚽🎯🟨🟥🔄🥅), `TeamLogo` `fallback="⚽/🔴/🔵"`, goal toast `⚽`, admin console labels. Never add NEW emoji to fan-facing UI; prefer `EventIcon`/lucide.

## 7. Before / During / After
- Before: read `src/index.css` `@theme` + the closest existing widget (`TopStatsWidget`, `MatchCard`, `MatchTicker`) and copy its card/chip/pill structure.
- During: existing hex/scale only; `font-mono` strictly for Latin digits; every new surface must have an `html.light` path (or a registered dark-locked scope); clickable rows get `hover:border-emerald-500/30`.
- After: view the page in BOTH themes; check `360px` width for overflow; confirm no new `tailwind.config` or CSS file outside `index.css` (page-scoped exceptions need user approval).
