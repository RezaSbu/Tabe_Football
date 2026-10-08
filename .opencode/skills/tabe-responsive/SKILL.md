---
name: tabe-responsive
description: Responsive viewport rules for Tabe Football — Tailwind breakpoints, grid/table/nav/pitch adaptation, touch targets. Use when building or changing any layout, table, pitch, or navigation in this repo.
---

# tabe-responsive — Viewport Behavior

## 1. Breakpoints
Tailwind defaults ONLY — no custom breakpoints exist in `@theme`. Design mobile-first (`base → sm → lg`), never desktop-down with `max-*` hacks.

## 2. Established patterns (copy them)
- Grids: `grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3` (widget cards); page shells `lg:grid-cols-12` with `lg:col-span-8/4` (HomePage).
- Tables: wrap in `overflow-x-auto`, keep `text-[11px]` minimum, `whitespace-nowrap` on numeric cells, sticky section headers where long.
- Touch: interactive rows/buttons `min-h-[40-44px]`, `px-3 py-2.5`; chips stay tappable at `py-1.5`.
- Nav/tabs: horizontal `overflow-x-auto` scroll rows with `shrink-0` items (league/week pickers); never wrap tab bars into multi-line stacks on mobile.
- Pitch: stacks BELOW the picker on mobile (`MatchWeekWidget` Step 3 → Step 4); nodes keep spacing, no text under `text-[10px]`.
- Filters/search collapse above content; results never push CTAs off-screen.

## 3. Hard rules
- NO user-agent sniffing, NO hardcoded device widths in JS, NO `window.innerWidth` layout branches — Tailwind classes only.
- A table that overflows at 360px gets `overflow-x-auto`, NOT smaller fonts or dropped columns (dropping columns needs user approval).
- Admin panel is desktop-first by nature; changes there must still keep the public shell + `/admin` login usable at 360px.
- Desktop layout must not regress when fixing mobile and vice versa — check both every time.

## 4. Before / During / After
- Before: note which grid/table/nav your change touches and its current `sm/lg` behavior.
- During: add the smaller breakpoint FIRST, then scale up; keep `gap` consistent (`gap-1.5/2` cards, `gap-6` sections).
- After: render at 360px, 768px, 1280px (narrowest content column + widest table); confirm no horizontal page scroll except inside explicit `overflow-x-auto` regions; confirm touch targets ≥40px.
