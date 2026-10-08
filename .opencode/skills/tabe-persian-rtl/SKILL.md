---
name: tabe-persian-rtl
description: Persian RTL rules for Tabe Football — dir management, score rendering, Persian/Latin digits, Jalali dates, directional icons. Use when rendering ANY text, numbers, scores, or dates in this repo. Wins over design-system on direction/digit questions.
---

# tabe-persian-rtl — Persian / RTL Rules

## 1. Direction
- Root is `<html lang="fa" dir="rtl">` (`index.html:2`). Repeat `dir="rtl"` on each card/section root (established pattern: `TopStatsWidget`, `MatchCard`, `MatchWeekWidget:109`).
- `dir="ltr"` is allowed ONLY on Latin/numeric runs: promo-code blocks (`AdBannerWidget.tsx:43`), lineup inputs (`matchcenter/LineupBuilder.tsx`), JSON editor (`AdminDirectOverrides.tsx`), minute marks on the pitch (`matchcenter/MatchPitch.tsx`). Never on a container holding Persian text.

## 2. Scores — the hard rule (learned from a real bug)
European digits ALWAYS render left-to-right inside their run, regardless of `dir`. So a single string `1-0` inside ANY one span puts `1` on the left — next to the AWAY team in an RTL row — and reads reversed.
- FORBIDDEN in RTL rows: `<span dir="...">{scoreHome}-{scoreAway}</span>` (one text node).
- REQUIRED: three separate spans in an RTL flex, so the first child (home) sits rightmost, adjacent to the home side:
  ```tsx
  <span className="flex items-center gap-1" dir="rtl">
    <span>{scoreHome ?? 0}</span><span className="opacity-60">-</span><span>{scoreAway ?? 0}</span>
  </span>
  ```
  Reference: `MatchDetailView.tsx:363-367` (correct grid scoreboard), `MatchWeekWidget.tsx:201-207,230-233` (fixed cards + pitch header).

## 3. Digits — Latin for data, Persian for prose
- `formatStatNumber(v)` (`src/utils.ts:115-118`) forces Latin digits (`toEnglishDigits`, `utils.ts:135-144`). Apply it to EVERY rendered stat: scores, minutes, ratings, counts, ranks, dates, view counts. Always pair with `font-mono` (JetBrains Mono).
- Persian prose (labels, names, sentences) stays Persian. Never convert a whole sentence with digit helpers.
- Known inconsistency — do NOT propagate: player back-nav uses `ArrowLeft` (`PlayerDetail.tsx:444`) while page-level back uses `ArrowRight` (`PlayerDetailPage.tsx:76`). In RTL, "back" points RIGHT (direction of reading start). For new back buttons use `ArrowRight`; flag old divergences instead of copying them.

## 4. Dates
- Storage is Gregorian (`YYYY-MM-DD`). Display via `convertGregorianToShamsi` / `formatJalaliDate` (`utils.ts`), output in Latin digits + `font-mono`. Relative labels via `getRelativeDateLabel`. Season tags are Shamsi year strings (`"1405"`); never do arithmetic on them without `normalizeSeasonTag` (`database.ts:79`).

## 5. Names & mixed text
- Team/player names render as-is (Persian). Parenthesised Latin (e.g. `(C)`, `w=75` image params) never touches display strings.
- Truncation: `truncate` + `min-w-0` in flex rows; keep team names unbroken (`whitespace-nowrap` only for chips/scores).

## 6. Before / During / After
- Before: identify every number/score/date the change renders; find the nearest existing RTL row rendering the same kind of value and copy its structure.
- During: 3-span scores; `formatStatNumber` + `font-mono` on all stats; `dir="ltr"` only on pure-Latin runs; back/forward chevrons follow reading direction.
- After: visually verify a NON-DRAW result (e.g. `1-0`) — draws hide reversal bugs; check the digit adjacent to each team name; verify Jalali dates render Latin digits.
