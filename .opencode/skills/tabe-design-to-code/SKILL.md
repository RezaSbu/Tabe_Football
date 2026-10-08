---
name: tabe-design-to-code
description: Convert Figma designs, screenshots, or pasted UI code into Tabe Football codebase without breaking its architecture. Use when implementing a design from Figma, Figma MCP, images, or external UI code. MCP-agnostic; never invents MCP config.
---

# tabe-design-to-code — Design → Codebase

## 1. Ground truth (read this first)
- NO Figma MCP is configured in this environment (no `opencode.json`, no `mcp` block anywhere in the repo — verified). NEVER invent MCP configuration, fake tool calls, or connection steps.
- `Figma/` is a Google-AI-Studio export of a match-center UI kit: untracked, READ-ONLY inspiration. Never edit it, never import from it blindly, never commit it.
- Accepted inputs: pasted component code, screenshots/reference images, Figma inspect values (colors, spacing, type), or design tokens. All are treated as MOCK until wired (rule 4).

## 2. Ingest workflow (Figma values → repo tokens)
| Figma concept | Repo equivalent |
|---|---|
| Color style | `src/index.css` `@theme` var or existing hex (`#121215/#0a0a0c`, emerald-400/500) — new hex needs justification |
| Text style | Vazirmatn scale (`font-black text-lg/xs`, rows `text-[11px]`, chips `text-[10px]/[9px]`); digits → JetBrains Mono + `formatStatNumber` |
| Auto Layout | flex/grid with repo `gap` scale; cards `rounded-2xl border-white/5` |
| Breakpoints | Tailwind `sm/lg` on the same element (see `tabe-responsive`) |
| Assets (logos/photos) | `uploads/` + `getSafeImageUrl()` + `onError` fallback + `referrerPolicy="no-referrer"` + `loading="lazy"` |
| Light/dark variants | `html.light` scope or registered dark-locked scope (see `tabe-design-system`) |

## 3. Architecture preservation (the prime directive)
Figma must NEVER cause a rewrite of existing architecture. Order of operations:
1. FIND the existing component/page rendering that surface (`pages/`, `components/`, App routes). Read it first.
2. REUSE: `ui/*` primitives, `shared/*` logic, `SeasonSwitcher`/`MovementTimeline`/`CareerSection`/`EmptyState`/`Skeleton`, existing hooks. New abstractions only when nothing fits — and then placed in the same folders with the same conventions.
3. KEEP stable: props interfaces, callback names (`onSelectTeam/Match/News`, `onBack`), route paths, API shapes. A redesign changes JSX + classes, not contracts.
4. SPLIT: Figma screens arrive as one big frame — implement as small components (<~600 lines each), never one giant file.

## 4. Mock-data rule
External UI code always ships mock data. Replace it field-for-field with the REAL bindings before calling anything done:
- Get the real shape from the slim `GET /api/detail/<type>/<id>` response (or `PlayerItem` in `src/types.ts`), never from the mock's invented fields.
- Sections with no real data (e.g. market value, radar attributes): hide behind a boolean flag or `EmptyState` — never ship mock numbers as if real.
- Every number keeps `seasonId` × league/cup scoping; every score uses the 3-span rule.

## 5. Before / During / After
- Before: identify target component + its data source + which sibling components share its patterns; list the mock↔real field map in your reply.
- During: tokens→existing vars; RTL from the first line (not retrofitted); both themes; responsive at 3 widths (see `tabe-responsive`).
- After: full `tabe-core` verify loop + side-by-side check against the design (spacing, type scale, states: loading/empty/error); delete no-longer-used code paths; confirm no `Figma/`, mock, or invented-config residue in the diff.
