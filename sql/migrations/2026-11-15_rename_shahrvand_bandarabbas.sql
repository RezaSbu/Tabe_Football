-- One-time rename: شهرداری بندرعباس -> شهروند بندرعباس (team-1792140334172)
-- Team names are denormalized in several tables AND matches carry no team ids
-- (name is the join key), so the rename must touch every copy in one transaction.
\set QUIET on
BEGIN;

-- 1) canonical row
UPDATE teams
SET name = 'شهروند بندرعباس', updated_at = now()
WHERE id = 'team-1792140334172';

-- 2) matches (matched by name; team ids are NULL for this club's fixtures)
UPDATE matches SET team_home = 'شهروند بندرعباس'
WHERE team_home_id = 'team-1792140334172' OR team_home = 'شهرداری بندرعباس';
UPDATE matches SET team_away = 'شهروند بندرعباس'
WHERE team_away_id = 'team-1792140334172' OR team_away = 'شهرداری بندرعباس';

-- 3) player rows + season aggregates
UPDATE players SET team_name = 'شهروند بندرعباس'
WHERE team_id = 'team-1792140334172' OR team_name = 'شهرداری بندرعباس';
UPDATE player_season_stats SET team_name = 'شهروند بندرعباس'
WHERE team_id = 'team-1792140334172' OR team_name = 'شهرداری بندرعباس';

-- 4) coaches + coach season aggregates
UPDATE coaches SET team_name = 'شهروند بندرعباس'
WHERE team_id = 'team-1792140334172' OR team_name = 'شهرداری بندرعباس';
UPDATE coach_season_stats SET team_name = 'شهروند بندرعباس'
WHERE team_id = 'team-1792140334172' OR team_name = 'شهرداری بندرعباس';

-- 5) team season archive
UPDATE team_season_stats SET team_name = 'شهروند بندرعباس'
WHERE team_id = 'team-1792140334172' OR team_name = 'شهرداری بندرعباس';

-- 6) standings JSON rows (display + rank payload)
UPDATE standings
SET rows = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'team-1792140334172' OR elem->>'team' = 'شهرداری بندرعباس'
      THEN jsonb_set(elem, '{team}', '"شهروند بندرعباس"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(rows) elem
)
WHERE rows::text LIKE '%شهرداری بندرعباس%';

-- 7) team of the week snapshots (same entity, current season)
UPDATE selected_combinations
SET players = (
  SELECT jsonb_object_agg(
    key,
    CASE WHEN value->>'teamName' = 'شهرداری بندرعباس'
      THEN jsonb_set(value, '{teamName}', '"شهروند بندرعباس"')
      ELSE value END
  )
  FROM jsonb_each(players)
)
WHERE players::text LIKE '%شهرداری بندرعباس%';

COMMIT;

-- Verification: every functional copy must be renamed; editorial news text is
-- intentionally historical and keeps the old name.
\pset footer off
select 'teams' k, count(*) n from teams where name = 'شهروند بندرعباس'
union all select 'players.team_name', count(*) from players where team_name = 'شهروند بندرعباس'
union all select 'player_season_stats', count(*) from player_season_stats where team_name = 'شهروند بندرعباس'
union all select 'matches', count(*) from matches where team_home = 'شهروند بندرعباس' or team_away = 'شهروند بندرعباس'
union all select 'standings', count(*) from standings where rows::text like '%شهروند بندرعباس%'
union all select 'coaches', count(*) from coaches where team_name = 'شهروند بندرعباس'
union all select 'coach_season_stats', count(*) from coach_season_stats where team_name = 'شهروند بندرعباس'
union all select 'team_season_stats', count(*) from team_season_stats where team_name = 'شهروند بندرعباس'
union all select 'selected_combinations', count(*) from selected_combinations where players::text like '%شهروند بندرعباس%'
union all select 'LEFTOVER teams', count(*) from teams where name = 'شهرداری بندرعباس'
union all select 'LEFTOVER matches', count(*) from matches where team_home = 'شهرداری بندرعباس' or team_away = 'شهرداری بندرعباس'
union all select 'LEFTOVER players', count(*) from players where team_name = 'شهرداری بندرعباس'
union all select 'LEFTOVER seasonstats', count(*) from player_season_stats where team_name = 'شهرداری بندرعباس'
union all select 'LEFTOVER standings', count(*) from standings where rows::text like '%شهرداری بندرعباس%'
union all select 'news (historical, expected >0)', count(*) from news where content like '%شهرداری بندرعباس%';
