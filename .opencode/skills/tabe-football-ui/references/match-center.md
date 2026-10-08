# Match Center — implementation map (read-only reference)

## Files
| File | Role | Notes |
|---|---|---|
| `src/pages/MatchDetailPage.tsx` | Route `/match/:id`; fetches `GET /api/detail/match/:id` + `participants?ids=` + view POST | Perf split: match first, lineup names second |
| `src/components/MatchDetailView.tsx` (786 lines) | Scoreboard, tabs, stats, events, H2H | Scoreboard = `grid-cols-[1fr_auto_1fr]`; center score = 3 separate spans in RTL flex (`:363-367`) — the correct pattern |
| `src/components/MatchWeekWidget.tsx` | Homepage "lineup per match" picker (league → week → match → pitch) | Score spans MUST be 3-element RTL flex (`:201-207, :230-233`); single-string scores read reversed here |
| `src/matchcenter/MatchPitch.tsx` | Pitch nodes (`.mc-node`), minute marks (`dir="ltr"`), substitution/goal overlays | Minute labels stay LTR; mapping via `toPitchPlayer.ts` |
| `src/matchcenter/toPitchPlayer.ts` + `pitchCoaches.test.ts` | Lineup→pitch mapping, coach placement | Has unit tests — extend them when changing mapping |
| `src/components/MatchTicker.tsx` | Live ticker rows; per-side score coloring (`scoreHome/scoreAway` + `N&&i>o` highlight) | |
| `src/matchcenter/EventIcon.tsx` | Unified SVG event icons (11 types + MVP; adapted from Figma kit) | `<EventIcon type= size=>`; no emoji, no jersey numbers |
| H2H / team-stats / match-events / match-news blocks | Rendered INLINE as tabs/sections inside `MatchDetailView.tsx` (filter `eventFilter`: goals/cards/subs) | No standalone files in `src/` — the `H2HView`/`MatchStats`/`MatchEvents`/`MatchNews` components exist ONLY in `Figma/` (reference); do not import them |
| `src/shared/matchMinute.ts` + `realMinute` | `90+3'` parsing, futsal 40' vs football 90' durations | Futsal duration = 40, football = 90 — never hardcode 90 |
| Server `detail.ts:229` + `:259` | `GET /api/detail/match/:id` (match only) + `participants` (≤60 ids, slim player/team rows) | Keep this split; do not re-embed full tables |
| `src/components/AdminLiveMatchConsole.tsx` (1645 lines) | Live admin console (goals, events, ratings entry) | LARGEST file in repo — read-only reference; extract, don't grow |

## Rules
1. Scores: 3-span RTL flex everywhere (see `tabe-persian-rtl`). No exceptions.
2. Status comes from `getEffectiveStatus` (`shared/matchStatus.ts`: `not-started|live|finished`), never from date arithmetic in components.
3. Ratings on the pitch come from `lineups[].rating`; MVP from `match.mvpId` via `isSamePlayer`.
4. Finished matches are immutable history — widgets filter `status==="finished"` for stats; `not-started` for fixtures.
5. Mobile: pitch stacks below the picker; nodes keep `min-h` touch targets; never shrink text below `text-[10px]`.
