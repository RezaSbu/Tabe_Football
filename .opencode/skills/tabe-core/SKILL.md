---
name: tabe-core
description: Tabe Football (tabefotbal.ir) project rules — architecture, coding/API/data/git conventions, safe-dev workflow. Use when making ANY code change in this repo. Root skill; wins every conflict with other skills.
---

# tabe-core — Project Rules (root)

## 1. Identity & stack
- Tabe Football (`tabefotbal.ir`): Iranian football stats site, Persian (fa), RTL.
- Frontend: React 19 + Vite 6 + Tailwind CSS v4 (`@tailwindcss/vite`, NO `tailwind.config.*`), `react-router-dom` v7, `lucide-react`, `motion` (rare), `react-helmet-async`.
- Backend: Express 4 + TypeScript, bundled to `dist/server.cjs` via esbuild (`--packages=external`, format cjs).
- Database: PostgreSQL 16 is authoritative in production. Server keeps an in-memory mirror (`src/server/services/database.ts`: `fetchAndPopulateMemoryDB`, `saveDB`); reads are served from memory. There is NO JSON-file fallback — only the `INITIAL_DATABASE` seed + `memoryBootstrapped` guard.
- Deploy: `internet → nginx (TLS/ratelimit) → node app:3000 → postgres:5432` (`docker-compose.yml`, `nginx/`). Uploads/backups are host bind-mounts.
- Local env: Windows PowerShell 5.1. psql via `docker compose exec -T postgres psql -U tabe_admin -d tabe_football`. App at `http://127.0.0.1:3000`.

## 2. Repo map (do not re-derive; verify if unsure)
- `src/pages/` — 14 pages. Only 6 real `<Route>`s in `src/App.tsx` (`/news|gallery|team|player|match|coach/:id`); everything else is tab state (`PATH_TO_TAB`), URL↔`activeTab` synced.
- `src/components/` — feature components. `src/components/ui/` — reusable primitives (`ShareButton`, `Skeleton`, `EmptyState`). Reuse these before creating new ones.
- `src/hooks/` — `useAppData` (bulk data fan-out), `useSmartNavigate`, `useLightTheme`, `useSeasonData`, `useGoalSound`, `useGoalNotifications`.
- `src/shared/` — client+server logic: `playerIdentity` (name-norm, lineup placement), `teamMatch` (`resolveTeam`), `syncResolver`, `matchStatus`, `leagueLabel`, `matchMinute`, `matchGroup`, `career`, `coachTenure`, `newsSort`, `newsRelated`.
- `src/utils.ts` — `fetchCachedAppData` (`GET /api/data`, cached), `formatStatNumber`, Jalali helpers, `getSafeImageUrl`.
- `src/server/routes/` — 12 files: `system` (bulk `/api/data`, health), `diagnostics`, `season`, `teams` (teams/players/coaches CRUD), `matches`, `standings` (manual overrides only), `media`, `misc` (~30 portal CMS routes + auth), `detail` (slim detail + related-news + view tracking), `adminLists` (slim admin lists), `movements`, `lifecycle`.
- `src/server/services/` — `database` (PG↔memory sync, ~20 `migrate*`), `stats` (derived recompute — single source of truth for leaderboards), `migrations` (in-memory transitions), `viewTracker` (batched views, bot filter), `monitoring`, `lifecycle`.
- `src/server/middleware/auth.ts` — JWT (Bearer or cookie). Roles: `owner | news_admin | deputy | data_admin`. Guards: `requirePermission(name)` (18 names incl. `teams/players/coaches/matches/media/diagnostics`), `requireOwner` (seasons, club-transfers, lifecycle writes).
- `Figma/` — untracked Google-AI-Studio export (match-center UI kit). READ-ONLY reference. NEVER edit, import from blindly, or commit.

## 3. Data flow (preserve it)
- List pages use bulk `GET /api/data` via `fetchCachedAppData`. Every `*DetailPage.tsx` fetches slim `GET /api/detail/<type>/<id>` AND fires `POST /api/detail/<type>/<id>/view`. Admin lists use `GET /api/admin/*` (never the 9.5 MB `/api/data`).
- After any admin mutation, call `invalidateAppDataCache()` then refetch (`useAppData.adminRefreshData`).
- Identity matching: players/teams are matched with `normalizePersianString` + `isSamePlayer`/`resolveTeam` — never raw `===` on Persian names.
- Ratings: server `stats.ts` is the ONLY computer (min-5-rated-games filter). Client MUST render server `ratings` verbatim, fallback to local calc only when server data is absent.
- `statsByTeam`/`seasonRows`/`seasonId` scope every per-season number; `career` = all-time sum.

## 4. API rules
- Public reads: `GET /api/*`. Writes require JWT EXCEPT allowlisted public POSTs (`/api/auth/login|logout`, `/api/contact`, `/api/visit`, `/api/predictions/*`, `*/view`, `*/click`).
- New write routes: add `requirePermission(<existing-name>)`, `auditLog(...)` the action, return `{ success, data|message }`.
- No new top-level bulk endpoints; extend `detail.ts` slim shapes or `adminLists.ts` instead.
- `zod` is installed but UNUSED (zero imports) — use the repo's manual-check style, do not introduce zod.

## 5. Coding conventions (observed, enforce)
- Prettier: `semi:true, double quotes, printWidth:120, tabWidth:2`. Run `format:check` before commit.
- ESLint: `@typescript-eslint/no-explicit-any` is OFF — `any` is tolerated in detail components; still prefer real types for NEW shared code (`src/types.ts`, `PlayerItem` shape).
- Persian UI strings inline in JSX. Component files `PascalCase.tsx`; hooks `useX`; shared helpers in `src/shared/`.
- Component size: split anything growing past ~600 lines (bad examples already in repo: `AdminLiveMatchConsole` 1645, `PlayerDetail` 968 — do NOT copy this pattern; extract sub-components into `components/` and logic into `shared/` or hooks).
- Business logic OUT of JSX: compute above `return`, render below. Data-fetching in pages/hooks, never inside presentational components (except the established `related-news` fetch in detail views).

## 6. Git & safety (hard rules)
- Work on `develop`. NEVER `add/commit/push` (or PR) without the user's explicit order.
- NEVER touch: `Figma/`, `backups/`, `.env`, `dist/`, `uploads/`, `*.sql` dumps.
- Commit style: `type(scope): subject` — e.g. `fix(match): ...`, `feat(stats): ...` (imperative, no period).
- Deploy goes ONLY from `main` via PR `develop → main`. Production DB rule ("golden rule"): stop app → SQL → start app → read-only verify.
- Rollback-friendly: small commits, one concern each; never mix refactor + feature.

## 7. Before / During / After (every change)
- Before: `git status` + `git log --oneline -5` (know the branch); read the files you will touch (no blind edits); check for an existing component/helper to reuse.
- During: reuse `ui/*` + `shared/*`; keep RTL + theme behavior; no new dependencies without asking; no backend/DB change for a UI task.
- After: `npx tsc --noEmit` → `npx eslint src/` → `npx vitest run` (note: `api.test.ts` has known flaky env failures — timeouts + dev-server HTML responses; unrelated failures must be called out, not fixed by drive-by) → `vite build` + sync `dist/` to container + restart + visual check at `127.0.0.1:3000`.

## 8. Hierarchy
`tabe-core` > `tabe-design-system` > `tabe-persian-rtl` (wins on any direction/digit question) > `tabe-football-ui` > `tabe-responsive` / `tabe-design-to-code` / `tabe-quality`. If two skills conflict, the higher one wins.
