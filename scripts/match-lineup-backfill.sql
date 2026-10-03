-- Tabe Football — match lineup tactical keys: verification + backfill report.
-- The tactical model (formationHome/Away, per-player x/y/formation_slot/captain)
-- lives inside the existing matches.lineups JSONB: NO schema migration needed.
-- This script is READ-ONLY: it reports how many rows carry the new keys.
-- Run: docker compose exec -T postgres psql -U tabe_admin -d tabe_football -f scripts/match-lineup-backfill.sql

-- 1. Coverage of the new keys (expected: 0 before first pitch-mode save).
SELECT
  count(*) FILTER (WHERE lineups IS NOT NULL) AS rows_with_lineups,
  count(*) FILTER (WHERE lineups::text LIKE '%formationHome%') AS rows_with_formation,
  count(*) FILTER (WHERE lineups::text LIKE '%formation_slot%') AS rows_with_slots,
  count(*) FILTER (WHERE lineups::text LIKE '%"x":%') AS rows_with_coords,
  count(*) FILTER (WHERE lineups::text LIKE '%captain%') AS rows_with_captain
FROM matches;

-- 2. Legacy rows load through the formation fallback (no data loss by design).
--    A row is "legacy-shaped" when it has starters but no tactical keys:
SELECT count(*) AS legacy_rows_needing_fallback
FROM matches
WHERE lineups IS NOT NULL
  AND jsonb_array_length(COALESCE(lineups->'home', '[]'::jsonb)) > 0
  AND NOT (lineups::text LIKE '%formationHome%');

-- 3. Integrity: every starter entry must keep id+name (backfill never touches these).
SELECT id AS match_id
FROM matches
WHERE lineups IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(lineups->'home', '[]'::jsonb)) AS h(elem)
    WHERE elem->>'id' IS NULL OR elem->>'name' IS NULL
  )
LIMIT 20;
-- Expected: 0 rows. Any row listed here must be fixed manually before relying
-- on id-based event attribution for that match.
