-- Tabe Football — EMERGENCY ROLLBACK for tactical lineup keys.
-- Removes formationHome/Away and per-player x/y/formation_slot/captain from
-- matches.lineups, restoring the exact legacy shape
-- ({home,away,homeSubs,awaySubs} with id/name/position/rating/role only).
-- Ratings, events, scores and all other columns are untouched.
-- Legacy UI readers ignore unknown keys anyway, so this is only needed if the
-- new keys themselves must disappear (e.g. bad bulk import).
--
-- !! DRY RUN FIRST: run with BEGIN; ... ROLLBACK; to inspect affected rows.
-- Run for real: docker compose exec -T postgres psql -U tabe_admin -d tabe_football -f scripts/match-lineup-rollback.sql

BEGIN;

-- Preview (does not modify): how many rows would change?
SELECT count(*) AS rows_would_change
FROM matches
WHERE lineups::text LIKE '%formationHome%'
   OR lineups::text LIKE '%formation_slot%'
   OR lineups::text LIKE '%"x":%'
   OR lineups::text LIKE '%captain%';

-- Uncomment to execute:
-- UPDATE matches
-- SET lineups = jsonb_build_object(
--   'home', COALESCE((SELECT jsonb_agg(elem - 'x' - 'y' - 'formation_slot' - 'captain') FROM jsonb_array_elements(COALESCE(lineups->'home', '[]'::jsonb)) AS elem), '[]'::jsonb),
--   'away', COALESCE((SELECT jsonb_agg(elem - 'x' - 'y' - 'formation_slot' - 'captain') FROM jsonb_array_elements(COALESCE(lineups->'away', '[]'::jsonb)) AS elem), '[]'::jsonb),
--   'homeSubs', COALESCE((SELECT jsonb_agg(elem - 'x' - 'y' - 'formation_slot' - 'captain') FROM jsonb_array_elements(COALESCE(lineups->'homeSubs', '[]'::jsonb)) AS elem), '[]'::jsonb),
--   'awaySubs', COALESCE((SELECT jsonb_agg(elem - 'x' - 'y' - 'formation_slot' - 'captain') FROM jsonb_array_elements(COALESCE(lineups->'awaySubs', '[]'::jsonb)) AS elem), '[]'::jsonb)
-- )
-- WHERE lineups::text LIKE '%formationHome%'
--    OR lineups::text LIKE '%formation_slot%'
--    OR lineups::text LIKE '%"x":%'
--    OR lineups::text LIKE '%captain%';

ROLLBACK;
