---
name: tabe-football-ui
description: Football domain UI for Tabe Football — player/team/match/league/news/transfer pages, standings, events, ratings, stats visualization. Use when building or changing any football-facing page or widget. See references/match-center.md for the Match Center map.
---

# tabe-football-ui — Football Domain UI

## 1. Page inventory & the detail-page pattern
Pages (`src/pages/`): `HomePage`, `LiveScoresPage`, `StatsPage`, `NewsPage`, `TransfersList`, `LegionnairesPage`, `FutsalPage` (+ archived futsal/legionnaire detail routes, commented out in `App.tsx:372-381` — do not revive without asking).
Detail pages (`Player|Team|Match|Coach|News|GalleryDetailPage`): ALL follow one pattern — fetch slim `GET /api/detail/<type>/<id>`, fire `POST .../view`, render `<Helmet>` SEO tags, delegate to a `components/*Detail` view. New entity UI must follow this pattern, never fetch bulk `/api/data` for a single entity.

## 2. Entity patterns (reuse, don't reinvent)
- **Player** (`PlayerDetail.tsx` + `SeasonSwitcher` + `MovementTimeline` + `CareerSection`): 3 tabs (overview/matches/career); EVERY number scoped by `seasonId` × league/cup split (`leagueStats`/`cupStats`); `career` = all-time. Match log rows: W/D/L chip + `تیم مقابل حریف` + score (3-span rule) + event chips + minutes + rating + MVP badge.
- **Team** (`TeamDetail.tsx`): squad list, `upcomingMatches` (from `not-started` fixtures), past results, coach card. Teams resolve via `resolveTeam(allTeams, id-or-name)` — never raw string compare.
- **Standings** (`LeagueTables.tsx`): rank/team/played/GD/points columns; manual overrides ONLY via `PUT /api/standings/:leagueKey` (server `standings.ts`).
- **News** (`NewsSlider`, `NewsPage`): hero slider + filter chips + search; view counting via `POST /api/news/:id/view` (queued, flushed by `viewTracker`).
- **Transfers/movements**: `playerMovements`/`coachMovements` tables; render with `MovementTimeline`; writes are `requireOwner`.
- **Live** (`MatchTicker`, `LiveScoresPage`, `MatchCard`): status pills from design-system; goal polling via `fetchDataQuietly`; sound via `useGoalSound`.
- **Stats page**: renders SERVER leaderboards (`scorers/assists/cleansheets/ratings` from `stats.ts`) verbatim. Never recompute rankings client-side.

## 3. Events, ratings, visualization
- Match events: use `src/matchcenter/EventIcon.tsx` (`<EventIcon type="goal|assist|substitution|yellow-card|red-card|..." size={n} />`, SVG, no emoji). Grandfathered emoji chips in `PlayerDetail` match log stay as-is unless the task explicitly restyles them.
- Ratings display: color bands `≥7.5 emerald / ≥6.5 amber / else slate` (`PlayerDetail` pattern); MVP = amber badge `MVP زمین`; source is always match `lineups[].rating` aggregated by `stats.ts`.
- Data visualization: there is NO chart library in `package.json`. Charts = hand-written inline SVG (sparklines, rings, bars). Keep node counts small; no new chart dependency without asking.
- Form (W/D/L arrays, e.g. coach `recent_form`): chips newest-last, `W=emerald D=slate L=red`.

## 4. Match Center
Full implementation map lives in `references/match-center.md` (scoreboard layout, pitch/lineup system, participants endpoint, widget rules). Read it before touching `MatchDetailView`, `MatchPitch`, `MatchWeekWidget`, `toPitchPlayer`, or `matchcenter/`.

## 5. Before / During / After
- Before: open the closest existing entity page and list which of its blocks your task maps to; confirm the data exists in the slim detail response (or `playerSeasonStats`/`teamSeasonStats` aggregates) — if not, say so instead of inventing fields.
- During: keep `seasonId` × league/cup scoping on all numbers; 3-span scores; server leaderboards verbatim; reuse `SeasonSwitcher`/`MovementTimeline`/`CareerSection`/`EmptyState`/`Skeleton`.
- After: check goal-less player, goalkeeper (clean-sheet column), futsal variant, empty states, and the matches-tab count badge consistency.
