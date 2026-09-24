import { db as pgDb } from "../db";
import { loadDB, setDb, getInitialDatabase } from "../state";
import { logMessage } from "../utils/logger";
import { dbLock } from "../utils/concurrency";
import { runDatabaseMigrationsAndTransitions } from "./migrations";
import { recalculateAndSyncDatabase } from "./stats";
import { normalizePersianString, fixMojibake } from "../utils/persian";
import { markDataSync } from "./monitoring";

let constraintsMigrated = false;

// Dirty-table tracking for differential saveDB: routes mark which collections
// actually changed, so one-match writes don't rewrite the whole database.
export type DirtyTable =
  | "news" | "teams" | "players" | "coaches" | "matches" | "transfers"
  | "legionnaires" | "images" | "standings" | "stats" | "teamTransfersList"
  | "ads" | "bracket" | "heroSlides" | "selectedCombinations" | "systemInfo"
  | "submissions" | "mediaFiles" | "playerMovements" | "coachMovements"
  | "playerSeasonStats" | "coachSeasonStats" | "teamSeasonStats"
  | "lifecycleEvents" | "coachAppointments" | "lifecycleReasons";

const dirtyTables = new Set<DirtyTable | "all">(["all"]);

export function markTablesDirty(...tables: Array<DirtyTable | "all">): void {
  for (const t of tables) dirtyTables.add(t);
}

function consumeDirty(all: boolean): Set<DirtyTable | "all"> {
  const out = new Set(dirtyTables);
  dirtyTables.clear();
  dirtyTables.add("all");
  void all;
  return out;
}

function isDirty(dirty: Set<DirtyTable | "all">, table: DirtyTable): boolean {
  return dirty.has("all") || dirty.has(table);
}

// Recalc is only needed when finished-match data changed. Structural writes
// (future games, news, media, ads...) skip the ~46s full recompute.
// skipRecalc=true is a caller assertion; the helper double-checks nothing
// finished was touched when the flag is absent.
export function matchTouchesFinishedStats(before: any, after: any): boolean {
  const b = before || {};
  const a = after || {};
  if (b.status === "finished" || a.status === "finished") return true;
  if ((b.archived_stats || a.archived_stats) && (b.status === "finished" || a.status === "finished")) return true;
  const keys = ["scoreHome", "scoreAway", "scorersList", "events", "lineups", "league", "teamHomeId", "teamAwayId", "teamHome", "teamAway", "date", "isAutoFinished"];
  return keys.some((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
}

// Season rows use id='season-<name>' (e.g. id='season-1405' for name='1405').
// Derives the FK value from a legacy season tag; returns null when the tag
// is empty or already an id (the caller then keeps the explicit seasonId).
export function seasonIdFromTag(tag: string | null | undefined): string | null {
  const clean = String(tag || "").trim();
  if (!clean) return null;
  if (clean.startsWith("season-")) return clean;
  return `season-${clean}`;
}

// Canonical 4-digit season tag. The admin form historically defaults to range
// labels like "1405-1406" while stored rows (and the seasons table) use plain
// tags like "1405" — writing the range form into season_id violates
// fk_matches_season and broke match creation. Returns the leading 4-digit
// group (the start year names the season), or null when there is none.
export function normalizeSeasonTag(tag: string | null | undefined): string | null {
  const clean = String(tag || "").trim();
  if (!clean) return null;
  const m = clean.match(/\d{4}/);
  return m ? m[0] : null;
}

// Shirt numbers were removed from the data model: strip the legacy `number`
// key from lineup entries before persisting so it can never come back.
function stripShirtNumbersFromLineups(lineups: any): any {
  if (!lineups || typeof lineups !== "object") return lineups;
  const clean: any = { ...lineups };
  for (const key of ["home", "away", "homeSubs", "awaySubs"]) {
    if (Array.isArray(clean[key])) {
      clean[key] = clean[key].map((lp: any) => {
        if (!lp || typeof lp !== "object") return lp;
        const { number, ...rest } = lp;
        return rest;
      });
    }
  }
  return clean;
}

export async function migrateConstraints(): Promise<void> {
  if (constraintsMigrated) return;
  try {
    const { pool } = await import("../db");
    await pool.query(`
      ALTER TABLE news DROP CONSTRAINT IF EXISTS chk_news_category;
      ALTER TABLE news ADD CONSTRAINT chk_news_category CHECK (category IS NULL OR category IN ('pro-league', 'league-1', 'league-2', 'hazfi-cup', 'futsal', 'all', 'domestic', 'international', 'transfer', 'analysis', 'general', 'other', 'iranian-football', 'match-preview', 'national-team', 'highlights', 'tactical', 'transfer-news', 'injury', 'interview', 'transfers', 'news', 'featured', 'video', 'photo'));
    `);
    await pool.query(`
      ALTER TABLE transfers DROP CONSTRAINT IF EXISTS chk_transfers_type;
      ALTER TABLE transfers ADD CONSTRAINT chk_transfers_type CHECK (type IS NULL OR type IN ('دائمی', 'قرارداد قرضی', 'شایعه نقل و انتقال', 'permanent', 'loan', 'free', 'exchange', 'draft', 'other'));
    `);
    await pool.query(`
      ALTER TABLE players DROP CONSTRAINT IF EXISTS chk_players_position;
      ALTER TABLE players ADD CONSTRAINT chk_players_position CHECK (position IS NULL OR position IN (
        'GK', 'DF', 'MF', 'FW',
        'goalkeeper', 'defender', 'midfielder', 'forward',
        'دروازه‌بان', 'مدافع', 'هافبک', 'مهاجم',
        'هافبک دفاعی', 'هافبک هجومی', 'هافبک تهاجمی', 'مدافع مرکزی', 'مدافع چپ', 'مدافع راست',
        'وینگر چپ', 'وینگر راست', 'مهاجم نوک', 'هافبک مرکزی',
        'مدافع کناری', 'وینگر'
      ));
    `);
    await pool.query(`ALTER TABLE legionnaires DROP CONSTRAINT IF EXISTS chk_legionnaires_league;`);
    await pool.query(`ALTER TABLE images ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0`);
    await pool.query(`ALTER TABLE images ADD COLUMN IF NOT EXISTS photographer text`);
    await pool.query(`ALTER TABLE images ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb`);
    await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS week varchar(50)`);
    await pool.query(`ALTER TABLE legionnaires ADD COLUMN IF NOT EXISTS summary text`);
    await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS cover_image text`);
    await pool.query(`ALTER TABLE team_transfers_list ADD COLUMN IF NOT EXISTS league text DEFAULT 'pro-league'`);
    await pool.query(`ALTER TABLE bracket_slots DROP CONSTRAINT IF EXISTS fk_bracket_slots_match`);
    constraintsMigrated = true;
    logMessage("info", "database", "مهاجرت محدودیت‌های CHECK و ستون‌های view_count/photographer/photos جدول images با موفقیت اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت محدودیت‌های CHECK:", err.message || err);
  }
}

export async function migrateSummaryColumn(): Promise<void> {
  try {
    const { pool } = await import("../db");
    await pool.query(`ALTER TABLE legionnaires ADD COLUMN IF NOT EXISTS summary text`);
    logMessage("info", "database", "مهاجرت ستون summary لژیونرها اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت ستون summary:", err.message || err);
  }
}

export async function migrateHeroSlidesColumns(): Promise<void> {
  try {
    const { pool } = await import("../db");
    await pool.query(`ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS source_type varchar(20) DEFAULT 'custom'`);
    await pool.query(`ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS source_id varchar(100) DEFAULT ''`);
    logMessage("info", "database", "مهاجرت ستون‌های source_type و source_id اسلایدر اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت ستون‌های اسلایدر:", err.message || err);
  }
}

export async function migrateAdsSchema(): Promise<void> {
  try {
    const { pool } = await import("../db");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.ads (
        id varchar(50) NOT NULL,
        type varchar(20) NOT NULL DEFAULT 'slot',
        name text,
        placement varchar(50) DEFAULT '',
        title text,
        promo text,
        description text,
        link_url text,
        image_url text,
        btn_text text,
        width integer DEFAULT 728,
        height integer DEFAULT 90,
        priority integer DEFAULT 0,
        start_date varchar(20) DEFAULT '',
        end_date varchar(20) DEFAULT '',
        is_active boolean DEFAULT true,
        settings jsonb DEFAULT '{}'::jsonb,
        view_count integer DEFAULT 0,
        click_count integer DEFAULT 0,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        CONSTRAINT ads_pkey PRIMARY KEY (id),
        CONSTRAINT chk_ads_type CHECK (type IN ('banner', 'slot', 'popup', 'floating', 'bottom_bar', 'slide_in'))
      )
    `);
    await pool.query(`DROP INDEX IF EXISTS idx_ads_type`);
    await pool.query(`DROP INDEX IF EXISTS idx_ads_placement`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ads_type ON public.ads(type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ads_placement ON public.ads(placement)`);
    await pool.query(`DROP TABLE IF EXISTS public.config`);
    logMessage("info", "database", "مهاجرت سیستم تبلیغات: جدول ads ایجاد شد و جدول config حذف گردید.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت جدول تبلیغات:", err.message || err);
  }
}

export async function migrateNewsGalleryColumns(): Promise<void> {
  try {
    const { pool } = await import("../db");
    await pool.query(`ALTER TABLE news ADD COLUMN IF NOT EXISTS gallery jsonb DEFAULT '[]'::jsonb`);
    await pool.query(`ALTER TABLE news ADD COLUMN IF NOT EXISTS read_more jsonb DEFAULT NULL`);
    logMessage("info", "database", "مهاجرت ستون‌های gallery و read_more جدول اخبار اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت ستون‌های اخبار:", err.message || err);
  }
}

export async function migrateNewsArchiveIndexes(): Promise<void> {
  // Supports the server-side paginated archive (GET /api/news): newest-first
  // ordering plus category filtering. Idempotent; safe to run on every boot.
  try {
    const { pool } = await import("../db");
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_news_created_at ON public.news(created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_news_category ON public.news(category)`);
    logMessage("info", "database", "ایندکس‌های created_at و category جدول اخبار اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت ایندکس‌های اخبار:", err.message || err);
  }
}

export async function migrateDropShirtNumberColumn(): Promise<void> {
  // Shirt numbers were removed from the data model (players + lineups).
  // Drops players.shirt_number for real and strips the legacy `number` key
  // from every lineup entry in matches.lineups. Runs once via guard.
  try {
    const { pool } = await import("../db");
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT NOW())`);
    const { rows } = await pool.query(`SELECT 1 FROM schema_migrations WHERE name = 'drop_shirt_number_v1'`);
    if (rows.length > 0) return;
    await pool.query(`ALTER TABLE players DROP COLUMN IF EXISTS shirt_number`);
    await pool.query(`
      UPDATE matches
      SET lineups = (
        SELECT jsonb_object_agg(
          key,
          CASE WHEN key IN ('home', 'away', 'homeSubs', 'awaySubs') AND jsonb_typeof(value) = 'array'
            THEN (SELECT coalesce(jsonb_agg(elem - 'number'), '[]'::jsonb) FROM jsonb_array_elements(value) elem)
            ELSE value END
        )
        FROM jsonb_each(COALESCE(lineups, '{}'::jsonb))
      )
      WHERE lineups IS NOT NULL
    `);
    await pool.query(`INSERT INTO schema_migrations (name) VALUES ('drop_shirt_number_v1')`);
    logMessage("info", "database", "ستون shirt_number حذف و کلید number از ترکیب‌ها پاکسازی شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در حذف ستون shirt_number:", err.message || err);
  }
}

export async function migrateDropArchiveTable(): Promise<void> {
  // The multi-season archive system was removed; there is exactly one active
  // season. Drops public.archive for real (it has no foreign keys). Runs once
  // via guard. The 2 legacy rows (matches:1404, stats:1404) exist in backups.
  try {
    const { pool } = await import("../db");
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT NOW())`);
    const { rows } = await pool.query(`SELECT 1 FROM schema_migrations WHERE name = 'drop_archive_table_v1'`);
    if (rows.length > 0) return;
    await pool.query(`DROP TABLE IF EXISTS public.archive`);
    await pool.query(`INSERT INTO schema_migrations (name) VALUES ('drop_archive_table_v1')`);
    logMessage("info", "database", "جدول archive حذف شد (سیستم چندفصله حذف گردید).");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در حذف جدول archive:", err.message || err);
  }
}
export async function migrateSeasonsFull(): Promise<void> {
  // Adopts the existing live seasons table (do NOT recreate it): ensures the
  // season FK column + single-current invariant + season query indexes exist.
  // Guard name is v2 because seasons_full_v1 was claimed on 2026-09-19 by the
  // old season-centric migration code that has since been deleted from the repo.
  // Runs once via guard. Never deletes or rewrites season rows.
  try {
    const { pool } = await import("../db");
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT NOW())`);
    const { rows } = await pool.query(`SELECT 1 FROM schema_migrations WHERE name = 'seasons_full_v2'`);
    if (rows.length > 0) return;
    await pool.query(`CREATE TABLE IF NOT EXISTS public.seasons (
      id varchar(50) NOT NULL,
      name varchar(50) NOT NULL,
      label varchar(50),
      start_date date,
      end_date date,
      is_active boolean DEFAULT false,
      is_archived boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      status varchar(20) NOT NULL DEFAULT 'upcoming',
      CONSTRAINT seasons_pkey PRIMARY KEY (id)
    )`);
    await pool.query(`ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'upcoming'`);
    await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS season varchar(50)`);
    await pool.query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS season_id varchar(50)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_seasons_name ON public.seasons(name)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_seasons_single_current ON public.seasons (is_active) WHERE is_active IS TRUE`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_matches_season_id ON public.matches(season_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_matches_season_status_league ON public.matches(season_id, status, league)`);
    // Enforce the season FK (NOT VALID first so pre-existing rows never block;
    // backfill above already covers them, validation is explicit and safe).
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_matches_season') THEN
        ALTER TABLE matches ADD CONSTRAINT fk_matches_season FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE RESTRICT NOT VALID;
      END IF;
    END $$`);
    await pool.query(`ALTER TABLE matches VALIDATE CONSTRAINT fk_matches_season`);
    // Backfill season_id from legacy season tags where missing (idempotent).
    await pool.query(`UPDATE matches SET season_id = 'season-' || season WHERE season_id IS NULL AND season IS NOT NULL AND season <> ''`);
    // Ensure a current-season row exists (matches system_info.currentSeason).
    const { rows: currentSeasonRow } = await pool.query(`SELECT value FROM system_info WHERE key = 'currentSeason'`);
    const currentSeason = currentSeasonRow[0]?.value || '1405';
    // The 3 season-less Tehran derbies (2026-09-21, real matches) belong to
    // the current season. Assign them explicitly; do NOT touch anything else.
    await pool.query(
      `UPDATE matches SET season = $1, season_id = $2
       WHERE (season IS NULL OR season = '') AND (season_id IS NULL OR season_id = '')`,
      [currentSeason, `season-${currentSeason}`]
    );
    await pool.query(
      `INSERT INTO seasons (id, name, label, is_active, is_archived, status) VALUES ($1, $2, $3, true, false, 'current')
       ON CONFLICT (id) DO NOTHING`,
      [`season-${currentSeason}`, currentSeason, `${currentSeason}-${String(Number(currentSeason) + 1)}`]
    );
    await pool.query(`INSERT INTO schema_migrations (name) VALUES ('seasons_full_v2')`);
    logMessage("info", "database", "مهاجرت یکبار اجرا: جدول seasons و ستون‌های season/season_id در matches اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت seasons_full_v2:", err.message || err);
  }
}

export async function migrateClubMovements(): Promise<void> {
  // Real club-movement ledger (player_club_movements + coach_club_movements).
  // Transfer News (`transfers`) is untouched. Runs once via guard.
  // Never deletes or rewrites rows; CREATE TABLE / ADD CONSTRAINT IF NOT EXISTS only.
  try {
    const { pool } = await import("../db");
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT NOW())`);
    const { rows } = await pool.query(`SELECT 1 FROM schema_migrations WHERE name = 'club_movements_v1'`);
    if (rows.length > 0) return;
    await pool.query(`CREATE TABLE IF NOT EXISTS public.player_club_movements (
      id varchar(50) NOT NULL,
      player_id varchar(50) NOT NULL,
      from_team_id varchar(50),
      to_team_id varchar(50),
      season_id varchar(50),
      movement_date varchar(20),
      note text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT player_club_movements_pkey PRIMARY KEY (id)
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS public.coach_club_movements (
      id varchar(50) NOT NULL,
      coach_id varchar(50) NOT NULL,
      from_team_id varchar(50),
      to_team_id varchar(50),
      season_id varchar(50),
      movement_date varchar(20),
      note text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT coach_club_movements_pkey PRIMARY KEY (id)
    )`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pcm_player') THEN
        ALTER TABLE player_club_movements ADD CONSTRAINT fk_pcm_player FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pcm_from_team') THEN
        ALTER TABLE player_club_movements ADD CONSTRAINT fk_pcm_from_team FOREIGN KEY (from_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pcm_to_team') THEN
        ALTER TABLE player_club_movements ADD CONSTRAINT fk_pcm_to_team FOREIGN KEY (to_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pcm_season') THEN
        ALTER TABLE player_club_movements ADD CONSTRAINT fk_pcm_season FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE RESTRICT;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_pcm_player_from_to_date') THEN
        ALTER TABLE player_club_movements ADD CONSTRAINT uq_pcm_player_from_to_date UNIQUE (player_id, from_team_id, to_team_id, movement_date);
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ccm_coach') THEN
        ALTER TABLE coach_club_movements ADD CONSTRAINT fk_ccm_coach FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE CASCADE;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ccm_from_team') THEN
        ALTER TABLE coach_club_movements ADD CONSTRAINT fk_ccm_from_team FOREIGN KEY (from_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ccm_to_team') THEN
        ALTER TABLE coach_club_movements ADD CONSTRAINT fk_ccm_to_team FOREIGN KEY (to_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ccm_season') THEN
        ALTER TABLE coach_club_movements ADD CONSTRAINT fk_ccm_season FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE RESTRICT;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_ccm_coach_from_to_date') THEN
        ALTER TABLE coach_club_movements ADD CONSTRAINT uq_ccm_coach_from_to_date UNIQUE (coach_id, from_team_id, to_team_id, movement_date);
      END IF;
    END $$`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pcm_player_season ON public.player_club_movements(player_id, season_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pcm_season ON public.player_club_movements(season_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pcm_to_team ON public.player_club_movements(to_team_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ccm_coach_season ON public.coach_club_movements(coach_id, season_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ccm_season ON public.coach_club_movements(season_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ccm_to_team ON public.coach_club_movements(to_team_id)`);
    await pool.query(`INSERT INTO schema_migrations (name) VALUES ('club_movements_v1')`);
    logMessage("info", "database", "مهاجرت یکبار اجرا: جدول‌های player/coach_club_movements اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت club_movements_v1:", err.message || err);
  }
}

export async function migrateSeasonStatsTables(): Promise<void> {
  // Brings the three legacy per-season aggregate tables under repo control.
  // Live DB already has them (PK-only, player/coach tables empty, team table
  // holds 47 all-zero placeholder rows from a deleted system — backed up to
  // backups/season-history/legacy-season-stats.sql, then cleared here).
  // Adds the canonical season_id FK + entity/team FKs + uniqueness guards.
  // Rows themselves are derived data, rewritten by recalc on every save.
  // Runs once via guard.
  try {
    const { pool } = await import("../db");
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT NOW())`);
    const { rows } = await pool.query(`SELECT 1 FROM schema_migrations WHERE name = 'season_stats_tables_v1'`);
    if (rows.length > 0) return;
    for (const t of ["player_season_stats", "coach_season_stats", "team_season_stats"]) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.${t} (id varchar(100) NOT NULL, CONSTRAINT ${t}_pkey PRIMARY KEY (id))`);
      // Legacy tables were created with id varchar(50); derived row ids are
      // composite (entity~season~club) and need the wider type.
      await pool.query(`ALTER TABLE public.${t} ALTER COLUMN id TYPE varchar(100)`);
      await pool.query(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS season varchar(50)`);
      await pool.query(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS season_id varchar(50)`);
      await pool.query(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS team_id varchar(50)`);
      await pool.query(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS team_name varchar(200)`);
      await pool.query(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`);
    }
    await pool.query(`ALTER TABLE public.player_season_stats ADD COLUMN IF NOT EXISTS player_id varchar(50)`);
    await pool.query(`ALTER TABLE public.player_season_stats ADD COLUMN IF NOT EXISTS matches integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.player_season_stats ADD COLUMN IF NOT EXISTS goals integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.player_season_stats ADD COLUMN IF NOT EXISTS assists integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.player_season_stats ADD COLUMN IF NOT EXISTS clean_sheets integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.player_season_stats ADD COLUMN IF NOT EXISTS yellow_cards integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.player_season_stats ADD COLUMN IF NOT EXISTS red_cards integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.player_season_stats ADD COLUMN IF NOT EXISTS minutes integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.player_season_stats ADD COLUMN IF NOT EXISTS avg_rating numeric`);
    await pool.query(`ALTER TABLE public.player_season_stats ADD COLUMN IF NOT EXISTS ratings jsonb`);
    await pool.query(`ALTER TABLE public.player_season_stats ADD COLUMN IF NOT EXISTS league_stats jsonb`);
    await pool.query(`ALTER TABLE public.player_season_stats ADD COLUMN IF NOT EXISTS cup_stats jsonb`);
    await pool.query(`ALTER TABLE public.coach_season_stats ADD COLUMN IF NOT EXISTS coach_id varchar(50)`);
    await pool.query(`ALTER TABLE public.coach_season_stats ADD COLUMN IF NOT EXISTS matches integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.coach_season_stats ADD COLUMN IF NOT EXISTS wins integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.coach_season_stats ADD COLUMN IF NOT EXISTS draws integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.coach_season_stats ADD COLUMN IF NOT EXISTS losses integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.coach_season_stats ADD COLUMN IF NOT EXISTS goals_for integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.coach_season_stats ADD COLUMN IF NOT EXISTS goals_against integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.coach_season_stats ADD COLUMN IF NOT EXISTS win_rate numeric`);
    await pool.query(`ALTER TABLE public.team_season_stats ADD COLUMN IF NOT EXISTS played integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.team_season_stats ADD COLUMN IF NOT EXISTS won integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.team_season_stats ADD COLUMN IF NOT EXISTS drawn integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.team_season_stats ADD COLUMN IF NOT EXISTS lost integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.team_season_stats ADD COLUMN IF NOT EXISTS goals_for integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.team_season_stats ADD COLUMN IF NOT EXISTS goals_against integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.team_season_stats ADD COLUMN IF NOT EXISTS points integer DEFAULT 0`);
    await pool.query(`ALTER TABLE public.team_season_stats ADD COLUMN IF NOT EXISTS rank integer`);
    // Legacy numeric(3,1) caps at 9.9 — a 100% win rate or a 10.0 rating
    // overflows it. Widen once (idempotent; no-op where already widened).
    await pool.query(`ALTER TABLE public.player_season_stats ALTER COLUMN avg_rating TYPE numeric(5,1)`);
    await pool.query(`ALTER TABLE public.coach_season_stats ALTER COLUMN win_rate TYPE numeric(5,1)`);
    // Clear the all-zero legacy placeholders (verified: zero rows with any
    // nonzero stat; backup in backups/season-history/legacy-season-stats.sql).
    await pool.query(`DELETE FROM public.team_season_stats WHERE COALESCE(played,0)=0 AND COALESCE(won,0)=0 AND COALESCE(drawn,0)=0 AND COALESCE(lost,0)=0 AND COALESCE(goals_for,0)=0 AND COALESCE(goals_against,0)=0 AND COALESCE(points,0)=0`);
    await pool.query(`DELETE FROM public.player_season_stats WHERE COALESCE(matches,0)=0 AND COALESCE(goals,0)=0 AND COALESCE(assists,0)=0`);
    await pool.query(`DELETE FROM public.coach_season_stats WHERE COALESCE(matches,0)=0 AND COALESCE(wins,0)=0 AND COALESCE(draws,0)=0 AND COALESCE(losses,0)=0`);
    const fk = async (conname: string, ddl: string) => {
      await pool.query(`DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${conname}') THEN
          ALTER TABLE ${ddl};
        END IF;
      END $$`);
    };
    await fk("fk_pss_player", "public.player_season_stats ADD CONSTRAINT fk_pss_player FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE");
    await fk("fk_pss_team", "public.player_season_stats ADD CONSTRAINT fk_pss_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL");
    await fk("fk_pss_season", "public.player_season_stats ADD CONSTRAINT fk_pss_season FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE RESTRICT");
    await fk("uq_pss_player_season_team", "public.player_season_stats ADD CONSTRAINT uq_pss_player_season_team UNIQUE (player_id, season_id, team_id)");
    await fk("fk_css_coach", "public.coach_season_stats ADD CONSTRAINT fk_css_coach FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE CASCADE");
    await fk("fk_css_team", "public.coach_season_stats ADD CONSTRAINT fk_css_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL");
    await fk("fk_css_season", "public.coach_season_stats ADD CONSTRAINT fk_css_season FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE RESTRICT");
    await fk("uq_css_coach_season_team", "public.coach_season_stats ADD CONSTRAINT uq_css_coach_season_team UNIQUE (coach_id, season_id, team_id)");
    await fk("fk_tss_team", "public.team_season_stats ADD CONSTRAINT fk_tss_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL");
    await fk("fk_tss_season", "public.team_season_stats ADD CONSTRAINT fk_tss_season FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE RESTRICT");
    await fk("uq_tss_team_season", "public.team_season_stats ADD CONSTRAINT uq_tss_team_season UNIQUE (team_id, season_id)");
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pss_player_season ON public.player_season_stats(player_id, season_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pss_season ON public.player_season_stats(season_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_css_coach_season ON public.coach_season_stats(coach_id, season_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_css_season ON public.coach_season_stats(season_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tss_season ON public.team_season_stats(season_id)`);
    await pool.query(`INSERT INTO schema_migrations (name) VALUES ('season_stats_tables_v1')`);
    logMessage("info", "database", "مهاجرت یکبار اجرا: جدول‌های player/coach/team_season_stats تحت کنترل درآمدند.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت season_stats_tables_v1:", err.message || err);
  }
}

export async function migrateCoachMatchColumns(): Promise<void> {
  // Match-embedded coach ids: the durable end of transfer-proof attribution.
  // Columns are additive; backfill is deliberately NULL (unknown is honest —
  // the movement-aware fallback in recalc resolves history instead).
  // Runs once via guard.
  try {
    const { pool } = await import("../db");
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT NOW())`);
    const { rows } = await pool.query(`SELECT 1 FROM schema_migrations WHERE name = 'coach_match_columns_v1'`);
    if (rows.length > 0) return;
    await pool.query(`ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS coach_home_id varchar(50)`);
    await pool.query(`ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS coach_away_id varchar(50)`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_matches_coach_home') THEN
        ALTER TABLE public.matches ADD CONSTRAINT fk_matches_coach_home FOREIGN KEY (coach_home_id) REFERENCES public.coaches(id) ON DELETE SET NULL;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_matches_coach_away') THEN
        ALTER TABLE public.matches ADD CONSTRAINT fk_matches_coach_away FOREIGN KEY (coach_away_id) REFERENCES public.coaches(id) ON DELETE SET NULL;
      END IF;
    END $$`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_matches_coach_home ON public.matches(coach_home_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_matches_coach_away ON public.matches(coach_away_id)`);
    await pool.query(`INSERT INTO schema_migrations (name) VALUES ('coach_match_columns_v1')`);
    logMessage("info", "database", "مهاجرت یکبار اجرا: ستون‌های coach_home_id/coach_away_id به matches اضافه شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت coach_match_columns_v1:", err.message || err);
  }
}

export async function migrateCoachUniqueTeam(): Promise<void> {
  // One head coach per team, enforced at DB level (free agents exempt via
  // partial index). Fails loudly while a duplicate exists — guard is recorded
  // ONLY on success, so boot retries until the duplicate is triaged.
  try {
    const { pool } = await import("../db");
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT NOW())`);
    const { rows } = await pool.query(`SELECT 1 FROM schema_migrations WHERE name = 'coach_unique_team_v1'`);
    if (rows.length > 0) return;
    await pool.query(`CREATE UNIQUE INDEX uq_coaches_one_per_team ON public.coaches(team_id) WHERE team_id IS NOT NULL`);
    await pool.query(`INSERT INTO schema_migrations (name) VALUES ('coach_unique_team_v1')`);
    logMessage("info", "database", "مهاجرت یکبار اجرا: یکتایی مربی هر تیم enforced شد.");
  } catch (err: any) {
    logMessage("warn", "database", "ایندکس یکتایی مربی ثبت نشد (احتمالاً رکورد تکراری) — در بوت بعدی retry می‌شود:", err.message || err);
  }
}

export async function migrateLifecycleSchema(): Promise<void> {
  // Employment/Appointment lifecycle (P1): additive only, zero destructive.
  // New tables: lifecycle_reasons (seeded vocab), lifecycle_events
  // (append-only facts), coach_appointments (interval projection).
  // is_retired flags gate the terminal RETIRED state. Backfills NOTHING —
  // existing rows keep exact values; P2 projects intervals from them.
  try {
    const { pool } = await import("../db");
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT NOW())`);
    const { rows } = await pool.query(`SELECT 1 FROM schema_migrations WHERE name = 'lifecycle_schema_v1'`);
    if (rows.length > 0) return;
    await pool.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    await pool.query(`CREATE TABLE IF NOT EXISTS public.lifecycle_reasons (
      category varchar(30) NOT NULL,
      code varchar(50) NOT NULL,
      label_fa varchar(200) NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      CONSTRAINT lifecycle_reasons_pkey PRIMARY KEY (category, code)
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS public.lifecycle_events (
      id varchar(50) NOT NULL,
      person_kind varchar(10) NOT NULL,
      person_id varchar(50) NOT NULL,
      event_kind varchar(30) NOT NULL,
      team_id varchar(50),
      season_id varchar(50),
      event_date date NOT NULL,
      sequence integer NOT NULL DEFAULT 0,
      reason_category varchar(30),
      reason_code varchar(50),
      appointment_id varchar(60),
      correction_of varchar(50),
      note text,
      actor varchar(100),
      created_at timestamptz DEFAULT now(),
      CONSTRAINT lifecycle_events_pkey PRIMARY KEY (id),
      CONSTRAINT chk_lifecycle_person_kind CHECK (person_kind IN ('player', 'coach')),
      CONSTRAINT chk_lifecycle_event_kind CHECK (event_kind IN (
        'TRANSFER', 'RELEASE', 'SIGNING', 'RETIREMENT', 'CONTRACT_END', 'OTHER',
        'APPOINTMENT', 'DISMISSAL', 'RESIGNATION', 'MUTUAL_TERMINATION', 'RETIRED'
      ))
    )`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lifecycle_team') THEN
        ALTER TABLE public.lifecycle_events ADD CONSTRAINT fk_lifecycle_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lifecycle_season') THEN
        ALTER TABLE public.lifecycle_events ADD CONSTRAINT fk_lifecycle_season FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE RESTRICT;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lifecycle_reason') THEN
        ALTER TABLE public.lifecycle_events ADD CONSTRAINT fk_lifecycle_reason FOREIGN KEY (reason_category, reason_code) REFERENCES public.lifecycle_reasons(category, code) ON DELETE RESTRICT;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lifecycle_correction') THEN
        ALTER TABLE public.lifecycle_events ADD CONSTRAINT fk_lifecycle_correction FOREIGN KEY (correction_of) REFERENCES public.lifecycle_events(id) ON DELETE RESTRICT;
      END IF;
    END $$`);
    // v1 shipped the kind CHECK without RETIRED; widen idempotently.
    await pool.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_lifecycle_event_kind'
          AND pg_get_constraintdef(oid) NOT LIKE '%RETIRED%'
      ) THEN
        ALTER TABLE public.lifecycle_events DROP CONSTRAINT chk_lifecycle_event_kind;
        ALTER TABLE public.lifecycle_events ADD CONSTRAINT chk_lifecycle_event_kind CHECK (event_kind IN (
          'TRANSFER','RELEASE','SIGNING','RETIREMENT','CONTRACT_END','OTHER',
          'APPOINTMENT','DISMISSAL','RESIGNATION','MUTUAL_TERMINATION','RETIRED'
        ));
      END IF;
    END $$`);
    await pool.query(`CREATE TABLE IF NOT EXISTS public.coach_appointments (
      id varchar(60) NOT NULL,
      coach_id varchar(50) NOT NULL,
      team_id varchar(50) NOT NULL,
      role varchar(20) NOT NULL DEFAULT 'HEAD_COACH',
      start_date date,
      end_date date,
      status varchar(10) NOT NULL DEFAULT 'ACTIVE',
      appointment_reason varchar(50),
      departure_reason varchar(50),
      start_event_id varchar(50),
      end_event_id varchar(50),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT coach_appointments_pkey PRIMARY KEY (id),
      CONSTRAINT chk_appointment_status CHECK (status IN ('ACTIVE', 'SCHEDULED', 'ENDED')),
      CONSTRAINT chk_appointment_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
    )`);
    await pool.query(`ALTER TABLE public.coach_appointments ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'HEAD_COACH'`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_appt_coach') THEN
        ALTER TABLE public.coach_appointments ADD CONSTRAINT fk_appt_coach FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE CASCADE;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_appt_team') THEN
        ALTER TABLE public.coach_appointments ADD CONSTRAINT fk_appt_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_appt_start_event') THEN
        ALTER TABLE public.coach_appointments ADD CONSTRAINT fk_appt_start_event FOREIGN KEY (start_event_id) REFERENCES public.lifecycle_events(id) ON DELETE RESTRICT;
      END IF;
    END $$`);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_appt_end_event') THEN
        ALTER TABLE public.coach_appointments ADD CONSTRAINT fk_appt_end_event FOREIGN KEY (end_event_id) REFERENCES public.lifecycle_events(id) ON DELETE RESTRICT;
      END IF;
    END $$`);
    // One open head-coach appointment per coach.
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_appt_one_open_per_coach
      ON public.coach_appointments(coach_id) WHERE status = 'ACTIVE' AND end_date IS NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_appt_coach_dates
      ON public.coach_appointments(coach_id, start_date, end_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_appt_team_status
      ON public.coach_appointments(team_id, status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lifecycle_person
      ON public.lifecycle_events(person_kind, person_id, event_date, sequence)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lifecycle_team
      ON public.lifecycle_events(team_id, event_date)`);
    await pool.query(`ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS is_retired boolean NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE public.players ADD COLUMN IF NOT EXISTS is_retired boolean NOT NULL DEFAULT false`);
    const seeds: [string, string, string, number][] = [
      ["player_appointment", "TRANSFER", "انتقال", 10],
      ["player_appointment", "SIGNING", "پیوستن (بازیکن آزاد)", 20],
      ["player_appointment", "PROMOTION", "ارتقا", 30],
      ["player_appointment", "OTHER", "سایر", 90],
      ["player_departure", "RELEASE", "فسخ/آزادسازی", 10],
      ["player_departure", "CONTRACT_END", "پایان قرارداد", 20],
      ["player_departure", "RETIREMENT", "بازنشستگی", 30],
      ["player_departure", "OTHER", "سایر", 90],
      ["coach_appointment", "NEW_APPOINTMENT", "انتصاب جدید", 10],
      ["coach_appointment", "RETURNING_COACH", "بازگشت مربی", 20],
      ["coach_appointment", "PROMOTION", "ارتقا", 30],
      ["coach_appointment", "OTHER", "سایر", 90],
      ["coach_departure", "DISMISSED", "اخراج", 10],
      ["coach_departure", "RESIGNED", "استعفا", 20],
      ["coach_departure", "MUTUAL_TERMINATION", "توافق دوطرفه", 30],
      ["coach_departure", "CONTRACT_ENDED", "پایان قرارداد", 40],
      ["coach_departure", "RETIRED", "بازنشستگی", 50],
      ["coach_departure", "OTHER", "سایر", 90],
    ];
    for (const [cat, code, label, ord] of seeds) {
      await pool.query(
        `INSERT INTO public.lifecycle_reasons (category, code, label_fa, sort_order)
         VALUES ($1,$2,$3,$4) ON CONFLICT (category, code) DO NOTHING`,
        [cat, code, label, ord]
      );
    }
    await pool.query(`INSERT INTO schema_migrations (name) VALUES ('lifecycle_schema_v1')`);
    logMessage("info", "database", "مهاجرت یکبار اجرا: اسکیمای Employment/Appointment Lifecycle اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت lifecycle_schema_v1:", err.message || err);
  }
}

// Phase-4 perf: add missing indexes for common query patterns.
export async function migrateMissingIndexes(): Promise<void> {
  try {
    const { pool } = await import("../db");
    // visits page-based analytics queries
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_visits_page ON public.visits(page) WHERE page IS NOT NULL AND page <> ''`);
    // submissions chronological listing in admin
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at DESC)`);
    // media_files ordering
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_files_created_at ON public.media_files(created_at DESC)`);
    // audit_logs action filtering
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action)`);
    // matches composite (status + league) for admin list endpoint
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_matches_status_league ON public.matches(status, league)`);
    // players search on name
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_players_name_trgm ON public.players USING gin(name gin_trgm_ops)`);
  } catch (err: any) {
    // gin_trgm_ops may not be available on some PG installs; catch gracefully
    logMessage("warn", "database", "خطا در اعمال ایندکس‌های بهینه:", err.message || err);
  }
}

export async function migrateReadMoreContent2(): Promise<void> {
  // One-time backfill: after the first run every row already has content2,
  // so skip the full-table UPDATE on every boot.
  try {
    const { pool } = await import("../db");
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT NOW())`);
    const { rows } = await pool.query(`SELECT 1 FROM schema_migrations WHERE name = 'readmore_content2_v1'`);
    if (rows.length > 0) return;
    await pool.query(`
      UPDATE news
      SET read_more = CASE
        WHEN read_more IS NULL THEN NULL
        WHEN jsonb_typeof(read_more) = 'object'
          THEN read_more || jsonb_build_object('content2', COALESCE(read_more->>'content2', ''))
        ELSE read_more
      END
      WHERE read_more IS NOT NULL
        AND jsonb_typeof(read_more) = 'object'
        AND NOT (read_more ? 'content2')
    `);
    await pool.query(`INSERT INTO schema_migrations (name) VALUES ('readmore_content2_v1')`);
    logMessage("info", "database", "مهاجرت فیلد content2 (متن پایین ادامه مطلب) اخبار اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت content2 ادامه مطلب:", err.message || err);
  }
}

export async function migrateMonitoringTables(): Promise<void> {
  try {
    const { pool } = await import("../db");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id bigserial PRIMARY KEY,
        username varchar(100),
        role varchar(50),
        action varchar(50),
        method varchar(10),
        path text,
        ip varchar(64),
        details jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.visits (
        id bigserial PRIMARY KEY,
        visitor_id varchar(64),
        ip varchar(64),
        user_agent text,
        page text,
        referrer text,
        is_bot boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON public.audit_logs(username)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_visits_created_at ON public.visits(created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON public.visits(visitor_id)`);
    logMessage("info", "database", "مهاجرت جداول مانیتورینگ (audit_logs و visits) اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت جداول مانیتورینگ:", err.message || err);
  }
}

export async function migrateRatingDefaults(): Promise<void> {
  try {
    const { pool } = await import("../db");
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT NOW())`);
    const { rows } = await pool.query(`SELECT 1 FROM schema_migrations WHERE name = 'strip_old_ratings_v1'`);
    if (rows.length > 0) return;

    await pool.query(`ALTER TABLE players ALTER COLUMN rating DROP DEFAULT`);
    await pool.query(`ALTER TABLE players ALTER COLUMN average_rating DROP DEFAULT`);
    await pool.query(`UPDATE players SET rating = NULL WHERE rating = 0`);
    await pool.query(`UPDATE players SET average_rating = NULL WHERE average_rating = 0`);
    await pool.query(`
      UPDATE matches
      SET lineups = jsonb_build_object(
        'home', (
          SELECT coalesce(jsonb_agg(jsonb_set(elem, '{rating}', 'null'::jsonb)), '[]'::jsonb)
          FROM jsonb_array_elements(COALESCE(lineups->'home', '[]'::jsonb)) elem
        ),
        'away', (
          SELECT coalesce(jsonb_agg(jsonb_set(elem, '{rating}', 'null'::jsonb)), '[]'::jsonb)
          FROM jsonb_array_elements(COALESCE(lineups->'away', '[]'::jsonb)) elem
        )
      )
      WHERE lineups IS NOT NULL
    `);
    await pool.query(`INSERT INTO schema_migrations (name) VALUES ('strip_old_ratings_v1')`);
    logMessage("info", "database", "مهاجرت یکبار اجرا: حذف Default rating و پاکسازی ratingهای خودکار قدیمی اعمال شد.");
  } catch (err: any) {
    logMessage("warn", "database", "خطا در مهاجرت rating defaults:", err.message || err);
  }
}

function mapAdRow(r: any) {
  let settings: Record<string, any> = {};
  if (r.settings) {
    if (typeof r.settings === "string") {
      try { settings = JSON.parse(r.settings) || {}; } catch { settings = {}; }
    } else if (typeof r.settings === "object") {
      settings = r.settings;
    }
  }
  return {
    id: r.id,
    type: r.type || "slot",
    name: fixMojibake(r.name || ""),
    placement: r.placement || "",
    title: fixMojibake(r.title || ""),
    promo: fixMojibake(r.promo || ""),
    description: fixMojibake(r.description || ""),
    linkUrl: r.link_url || "",
    imageUrl: r.image_url || "",
    btnText: fixMojibake(r.btn_text || ""),
    width: r.width || 728,
    height: r.height || 90,
    priority: r.priority || 0,
    startDate: r.start_date || "",
    endDate: r.end_date || "",
    isActive: r.is_active !== false,
    settings,
    viewCount: r.view_count || 0,
    clickCount: r.click_count || 0
  };
}

export async function fetchAndPopulateMemoryDB(): Promise<void> {
  const seedData = getInitialDatabase();
  try {
    logMessage("info", "database", "در حال دریافت کلیه جداول از PostgreSQL...");

    const [
      { data: dbAds, error: errAds },
      { data: dbSystemInfo, error: errSys },
      { data: dbSeasons, error: errSeasons },
      { data: dbPlayerMovements, error: errPM },
      { data: dbCoachMovements, error: errCM },
      { data: dbLifecycleEvents, error: errLE },
      { data: dbCoachAppointments, error: errCA },
      { data: dbLifecycleReasons, error: errLR },
      { data: dbPlayerSeasonStats, error: errPSS },
      { data: dbCoachSeasonStats, error: errCSS },
      { data: dbTeamSeasonStats, error: errTSS },
      { data: dbBracket, error: errBracket },
      { data: dbNews, error: errNews },
      { data: dbTeams, error: errTeams },
      { data: dbPlayers, error: errPlayers },
      { data: dbCoaches, error: errCoaches },
      { data: dbMatches, error: errMatches },
      { data: dbTransfers, error: errTransfers },
      { data: dbLegionnaires, error: errLegionnaires },
      { data: dbImages, error: errImages },
      { data: dbStandings, error: errStandings },
      { data: dbStats, error: errStats },
      { data: dbSubmissions, error: errSubmissions },
      { data: dbHeroSlides, error: errHero },
      { data: dbSelectedCombinations, error: errSC },
      dbTeamTransfersList,
      dbMediaFiles
    ] = await Promise.all([
      Promise.resolve(pgDb.from('ads').select('*')).catch(err => ({ data: null, error: err })),
      pgDb.from('system_info').select('*'),
      Promise.resolve(pgDb.from('seasons').select('*')).catch(err => ({ data: null, error: err })),
      Promise.resolve(pgDb.from('player_club_movements').select('*')).catch(err => ({ data: null, error: err })),
      Promise.resolve(pgDb.from('coach_club_movements').select('*')).catch(err => ({ data: null, error: err })),
      Promise.resolve(pgDb.from('lifecycle_events').select('*')).catch(err => ({ data: null, error: err })),
      Promise.resolve(pgDb.from('coach_appointments').select('*')).catch(err => ({ data: null, error: err })),
      Promise.resolve(pgDb.from('lifecycle_reasons').select('*')).catch(err => ({ data: null, error: err })),
      Promise.resolve(pgDb.from('player_season_stats').select('*')).catch(err => ({ data: null, error: err })),
      Promise.resolve(pgDb.from('coach_season_stats').select('*')).catch(err => ({ data: null, error: err })),
      Promise.resolve(pgDb.from('team_season_stats').select('*')).catch(err => ({ data: null, error: err })),
      pgDb.from('bracket').select('*').eq('id', 'main').maybeSingle(),
      pgDb.from('news').select('*').order('created_at', { ascending: false }),
      pgDb.from('teams').select('*'),
      pgDb.from('players').select('*'),
      pgDb.from('coaches').select('*'),
      pgDb.from('matches').select('*'),
      pgDb.from('transfers').select('*'),
      pgDb.from('legionnaires').select('*'),
      pgDb.from('images').select('*'),
      pgDb.from('standings').select('*'),
      pgDb.from('stats').select('*'),
      pgDb.from('submissions').select('*'),
      pgDb.from('hero_slides').select('*'),
      pgDb.from('selected_combinations').select('*'),
      Promise.resolve(pgDb.from('team_transfers_list').select('*')).catch(err => ({ data: null, error: err })),
      Promise.resolve(pgDb.from('media_files').select('*')).catch(err => ({ data: null, error: err }))
    ]);

    if (errNews) logMessage("warn", "database", "خطا در دریافت جدول اخبار", errNews);
    if (errTeams) logMessage("warn", "database", "خطا در دریافت جدول تیم‌ها", errTeams);
    if (errPlayers) logMessage("warn", "database", "خطا در دریافت جدول بازیکنان", errPlayers);
    if (errCoaches) logMessage("warn", "database", "خطا در دریافت جدول مربیان", errCoaches);
    if (errMatches) logMessage("warn", "database", "خطا در دریافت جدول مسابقات", errMatches);

    const parsed: any = { ...seedData };

    if (dbAds && Array.isArray(dbAds)) {
      parsed.ads = dbAds.map(mapAdRow);
    }

    if (dbSystemInfo) {
      const row = dbSystemInfo.find((r: any) => r.key === 'lastScraped');
      if (row) parsed.lastScraped = row.value || "";

      const rowSeason = dbSystemInfo.find((r: any) => r.key === 'currentSeason');
      if (rowSeason) parsed.currentSeason = rowSeason.value || "1405";
    }

    if (dbSeasons && Array.isArray(dbSeasons)) {
      parsed.seasons = dbSeasons.map((s: any) => ({
        id: s.id,
        name: s.name,
        label: s.label,
        startDate: s.start_date || null,
        endDate: s.end_date || null,
        isActive: s.is_active === true,
        isArchived: s.is_archived === true,
        status: s.status || (s.is_active ? 'current' : 'upcoming'),
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }));
      // Cross-check: system_info.currentSeason must match the active seasons row.
      const activeRow = parsed.seasons.find((s: any) => s.isActive || s.status === 'current');
      if (activeRow && activeRow.name && activeRow.name !== parsed.currentSeason) {
        logMessage("warn", "database", `ناهماهنگی فصل جاری: system_info=${parsed.currentSeason} ولی seasons فعال=${activeRow.name}. مقدار seasons معتبر است.`);
        parsed.currentSeason = activeRow.name;
      }
      if (!activeRow && parsed.seasons.length > 0) {
        logMessage("warn", "database", "هیچ فصل فعالی در جدول seasons یافت نشد.");
      }
    } else {
      parsed.seasons = [];
    }

    if (dbPlayerMovements && Array.isArray(dbPlayerMovements)) {
      parsed.playerMovements = dbPlayerMovements.map((m: any) => ({
        id: m.id,
        playerId: m.player_id,
        fromTeamId: m.from_team_id || null,
        toTeamId: m.to_team_id || null,
        seasonId: m.season_id || null,
        movementDate: m.movement_date || null,
        note: m.note || null,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      }));
    } else {
      parsed.playerMovements = [];
    }

    if (dbCoachMovements && Array.isArray(dbCoachMovements)) {
      parsed.coachMovements = dbCoachMovements.map((m: any) => ({
        id: m.id,
        coachId: m.coach_id,
        fromTeamId: m.from_team_id || null,
        toTeamId: m.to_team_id || null,
        seasonId: m.season_id || null,
        movementDate: m.movement_date || null,
        note: m.note || null,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      }));
    } else {
      parsed.coachMovements = [];
    }

    // Lifecycle domain (P1): append-only events + appointment projection.
    // Memory mirrors PG verbatim; service layer (P2+) writes both sides.
    if (dbLifecycleEvents && Array.isArray(dbLifecycleEvents)) {
      parsed.lifecycleEvents = dbLifecycleEvents.map((e: any) => ({
        id: e.id,
        personKind: e.person_kind,
        personId: e.person_id,
        eventKind: e.event_kind,
        teamId: e.team_id || null,
        seasonId: e.season_id || null,
        eventDate: e.event_date instanceof Date ? e.event_date.toISOString().slice(0, 10) : (e.event_date || null),
        sequence: e.sequence || 0,
        reasonCategory: e.reason_category || null,
        reasonCode: e.reason_code || null,
        appointmentId: e.appointment_id || null,
        correctionOf: e.correction_of || null,
        note: e.note || null,
        actor: e.actor || null,
        createdAt: e.created_at
      }));
    } else {
      parsed.lifecycleEvents = [];
    }

    if (dbCoachAppointments && Array.isArray(dbCoachAppointments)) {
      parsed.coachAppointments = dbCoachAppointments.map((a: any) => ({
        id: a.id,
        coachId: a.coach_id,
        teamId: a.team_id,
        startDate: a.start_date instanceof Date ? a.start_date.toISOString().slice(0, 10) : (a.start_date || null),
        endDate: a.end_date instanceof Date ? a.end_date.toISOString().slice(0, 10) : (a.end_date || null),
        status: a.status || "ACTIVE",
        appointmentReason: a.appointment_reason || null,
        departureReason: a.departure_reason || null,
        startEventId: a.start_event_id || null,
        endEventId: a.end_event_id || null,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      }));
    } else {
      parsed.coachAppointments = [];
    }

    if (dbLifecycleReasons && Array.isArray(dbLifecycleReasons)) {
      parsed.lifecycleReasons = dbLifecycleReasons.map((r: any) => ({
        category: r.category,
        code: r.code,
        labelFa: r.label_fa,
        sortOrder: r.sort_order || 0
      }));
    } else {
      parsed.lifecycleReasons = [];
    }

    // Derived per-season aggregates (recomputed verbatim by recalc; the DB
    // rows are the durable mirror, memory is authoritative for serving).
    if (dbPlayerSeasonStats && Array.isArray(dbPlayerSeasonStats)) {
      parsed.playerSeasonStats = dbPlayerSeasonStats.map((r: any) => ({
        id: r.id,
        playerId: r.player_id,
        season: r.season || null,
        seasonId: r.season_id || null,
        teamId: r.team_id || null,
        teamName: r.team_name || null,
        matches: r.matches || 0,
        goals: r.goals || 0,
        assists: r.assists || 0,
        cleanSheets: r.clean_sheets || 0,
        yellowCards: r.yellow_cards || 0,
        redCards: r.red_cards || 0,
        minutes: r.minutes || 0,
        avgRating: r.avg_rating != null ? parseFloat(String(r.avg_rating)) : null,
        ratings: r.ratings || null,
        leagueStats: r.league_stats || null,
        cupStats: r.cup_stats || null,
        createdAt: r.created_at
      }));
    } else {
      parsed.playerSeasonStats = [];
    }

    if (dbCoachSeasonStats && Array.isArray(dbCoachSeasonStats)) {
      parsed.coachSeasonStats = dbCoachSeasonStats.map((r: any) => ({
        id: r.id,
        coachId: r.coach_id,
        season: r.season || null,
        seasonId: r.season_id || null,
        teamId: r.team_id || null,
        teamName: r.team_name || null,
        matches: r.matches || 0,
        wins: r.wins || 0,
        draws: r.draws || 0,
        losses: r.losses || 0,
        goalsFor: r.goals_for || 0,
        goalsAgainst: r.goals_against || 0,
        winRate: r.win_rate != null ? parseFloat(String(r.win_rate)) : 0,
        createdAt: r.created_at
      }));
    } else {
      parsed.coachSeasonStats = [];
    }

    if (dbTeamSeasonStats && Array.isArray(dbTeamSeasonStats)) {
      parsed.teamSeasonStats = dbTeamSeasonStats.map((r: any) => ({
        id: r.id,
        teamId: r.team_id,
        season: r.season || null,
        seasonId: r.season_id || null,
        played: r.played || 0,
        won: r.won || 0,
        drawn: r.drawn || 0,
        lost: r.lost || 0,
        goalsFor: r.goals_for || 0,
        goalsAgainst: r.goals_against || 0,
        points: r.points || 0,
        rank: r.rank ?? null,
        createdAt: r.created_at
      }));
    } else {
      parsed.teamSeasonStats = [];
    }

    if (dbBracket && dbBracket.data) {
      parsed.bracket = dbBracket.data;
    }

    if (dbNews) {
      parsed.news = dbNews.map((n: any) => ({
        id: n.id,
        title: fixMojibake(n.title || ""),
        summary: fixMojibake(n.summary || ""),
        content: fixMojibake(n.content || ""),
        image: n.image,
        gallery: Array.isArray(n.gallery) ? n.gallery.map((g: any) => fixMojibake(String(g))) : [],
        read_more: n.read_more || null,
        category: n.category,
        tags: Array.isArray(n.tags) ? n.tags.map((t: any) => fixMojibake(String(t))) : (typeof n.tags === 'string' ? n.tags.replace(/[{}]/g, '').split(',').map((x: any) => fixMojibake(x.trim())).filter(Boolean) : []),
        viewCount: n.view_count || 0,
        createdAt: n.created_at
      }));
    }

    if (dbTeams) {
      parsed.teams = dbTeams.map((t: any) => ({
        id: t.id,
        name: fixMojibake(t.name || ""),
        logo: t.logo,
        coverImage: t.cover_image || "",
        stats: t.stats,
        coach: fixMojibake(t.stats?.coach || t.coach || ""),
        city: fixMojibake(t.stats?.city || t.city || ""),
        stadium: fixMojibake(t.stats?.stadium || t.stadium || ""),
        stadiumCapacity: t.stats?.stadiumCapacity || t.stats?.stadium_capacity || t.stadiumCapacity || "",
        founded: t.stats?.founded || t.founded || "",
        basePlayed: t.base_played || 0,
        baseWon: t.base_won || 0,
        baseDrawn: t.base_drawn || 0,
        baseLost: t.base_lost || 0,
        basePoints: t.base_points || 0,
        baseGoalsFor: t.base_goals_for || 0,
        baseGoalsAgainst: t.base_goals_against || 0,
        recentForm: t.recent_form || [],
        recentMatches: t.recent_matches || [],
        divisionKey: t.division_key || null,
        isEliminated: t.is_eliminated || false
      }));
    }

    if (dbPlayers) {
      parsed.players = dbPlayers.map((p: any) => {
        const sStats = p.season_stats || {};
        return {
          id: p.id,
          name: fixMojibake(p.name || ""),
          teamId: p.team_id,
          teamName: fixMojibake(p.team_name || ""),
          position: p.position,
          rating: p.rating != null ? parseFloat(p.rating) : null,
          averageRating: p.average_rating != null ? parseFloat(p.average_rating) : null,
          image: p.image,
          seasonStats: sStats,
          leagueStats: sStats.leagueStats || { matches: p.base_matches || 0, goals: p.base_goals || 0, assists: p.base_assists || 0, cleanSheets: p.base_clean_sheets || 0, yellowCards: p.base_yellow_cards || 0, redCards: p.base_red_cards || 0 },
          cupStats: sStats.cupStats || { matches: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 },
          careerHistory: sStats.careerHistory || p.career_history || [],
          baseMatches: p.base_matches || 0,
          baseGoals: p.base_goals || 0,
          baseAssists: p.base_assists || 0,
          baseCleanSheets: p.base_clean_sheets || 0,
          baseYellowCards: p.base_yellow_cards || 0,
          baseRedCards: p.base_red_cards || 0,
          ratingsHistory: p.ratings_history || [],
          age: p.age || null,
          nationality: p.nationality || null,
          foot: p.foot || null,
          height: p.height || null,
          isRetired: p.is_retired === true
        };
      });
    }

    if (dbCoaches) {
      parsed.coaches = dbCoaches.map((c: any) => {
        const sStats = c.season_stats || {};
        return {
          id: c.id,
          name: fixMojibake(c.name || ""),
          image: c.image,
          teamId: c.team_id,
          teamName: fixMojibake(c.team_name || ""),
          nationality: fixMojibake(c.nationality || ""),
          age: c.age || null,
          biography: c.biography || "",
          seasonStats: sStats,
          careerHistory: sStats.careerHistory || c.career_history || [],
          teamHistory: sStats.teamHistory || c.team_history || [],
          baseMatches: c.base_matches || 0,
          baseWins: c.base_wins || 0,
          baseDraws: c.base_draws || 0,
          baseLosses: c.base_losses || 0,
          titles: c.titles || [],
          coachingStyle: c.coaching_style || "",
          licenseLevel: c.license_level || "",
          experienceYears: c.experience_years || 0,
          isRetired: c.is_retired === true,
          recentForm: c.recent_form || []
        };
      });
    }

    if (dbMatches) {
      parsed.matches = [];
      parsed.football_Feature_Games = [];
      parsed.football_Now_Games = [];
      parsed.football_Finished_Games = [];
      parsed.futsal_Feature_Games = [];
      parsed.futsal_Now_Games = [];
      parsed.futsal_Finished_Games = [];

      dbMatches.forEach((m: any) => {
        const mappedMatch = {
          id: m.id,
          teamHome: m.team_home,
          teamAway: m.team_away,
          teamHomeId: m.team_home_id,
          teamAwayId: m.team_away_id,
          teamHomeLogo: m.team_home_logo,
          teamAwayLogo: m.team_away_logo,
          scoreHome: m.score_home || 0,
          scoreAway: m.score_away || 0,
          status: m.status || 'not-started',
          minutes: m.minutes,
          league: m.league,
          date: m.date,
          time: m.time,
          venue: m.venue,
          isPopular: m.is_popular || false,
          hotTopic: m.hot_topic,
          predictions: m.predictions,
          sport: m.sport || 'football',
          stage: m.stage || 'Feature_Games',
          week: m.week,
          season: m.season || null,
          seasonId: m.season_id || null,
          coachHomeId: m.coach_home_id || null,
          coachAwayId: m.coach_away_id || null,
          tag: m.tag,
          isAutoFinished: m.is_auto_finished || false,
          lineups: m.lineups,
          events: m.events,
          scorersList: m.scorers_list,
          teamStats: m.team_stats,
          referee: m.referee
        };

        parsed.matches.push(mappedMatch);

        const sport = m.sport || 'football';
        const stage = m.stage || 'Feature_Games';
        const targetListKey = `${sport}_${stage}`;
        if (parsed[targetListKey]) {
          parsed[targetListKey].push(mappedMatch);
        }
      });
    }

    if (dbTransfers) {
      parsed.transfers = dbTransfers.map((t: any) => ({
        id: t.id,
        playerName: fixMojibake(t.player_name || ""),
        playerImage: t.player_image,
        fromTeam: fixMojibake(t.from_team || ""),
        fromTeamLogo: t.from_team_logo,
        toTeam: fixMojibake(t.to_team || ""),
        toTeamLogo: t.to_team_logo,
        type: t.type,
        fee: t.fee,
        date: t.date,
        details: fixMojibake(t.description || t.details || ""),
        description: fixMojibake(t.description || t.details || ""),
        viewCount: t.view_count || 0,
        createdAt: t.created_at || null,
        tags: Array.isArray(t.tags) ? t.tags.map((x: any) => fixMojibake(String(x))) : (typeof t.tags === 'string' ? t.tags.replace(/[{}]/g, '').split(',').map((x: any) => fixMojibake(x.trim())).filter(Boolean) : [])
      }));
    }



    if (dbLegionnaires) {
      parsed.legionnaires = dbLegionnaires.map((l: any) => ({
        id: l.id,
        name: fixMojibake(l.name || ""),
        image: l.image,
        league: fixMojibake(l.league || ""),
        team: fixMojibake(l.team || ""),
        teamLogo: l.team_logo,
        summary: fixMojibake(l.summary || ""),
        logo: l.logo,
        performance: fixMojibake(l.description || l.performance || ""),
        description: fixMojibake(l.description || l.performance || ""),
        viewCount: l.view_count || 0,
        createdAt: l.created_at || null,
        tags: Array.isArray(l.tags) ? l.tags.map((x: any) => fixMojibake(String(x))) : (typeof l.tags === 'string' ? l.tags.replace(/[{}]/g, '').split(',').map((x: any) => fixMojibake(x.trim())).filter(Boolean) : [])
      }));
    }

    if (dbImages) {
      parsed.images = dbImages.map((img: any) => {
        let parsedTags: string[] = [];
        if (img.tags) {
          if (Array.isArray(img.tags)) {
            parsedTags = img.tags.map((t: any) => String(t));
          } else if (typeof img.tags === 'string') {
            try {
              const res = JSON.parse(img.tags);
              if (Array.isArray(res)) {
                parsedTags = res.map((t: any) => String(t));
              } else {
                parsedTags = [res];
              }
            } catch (e) {
              parsedTags = img.tags.replace(/[{}]/g, '').split(',').map((t: any) => t.trim()).filter(Boolean);
            }
          }
        }
        let parsedPhotos: any[] = [];
        if (img.photos) {
          if (Array.isArray(img.photos)) {
            parsedPhotos = img.photos;
          } else if (typeof img.photos === 'string') {
            try {
              const res = JSON.parse(img.photos);
              if (Array.isArray(res)) {
                parsedPhotos = res;
              }
            } catch (e) {
              parsedPhotos = [];
            }
          }
        }
        return {
          id: img.id,
          url: img.url,
          title: fixMojibake(img.title || img.caption || ""),
          caption: fixMojibake(img.caption || img.title || ""),
          description: fixMojibake(img.description || ""),
          tags: parsedTags.map((t: string) => fixMojibake(t)),
          photographer: img.photographer ? fixMojibake(String(img.photographer)) : undefined,
          createdAt: img.created_at,
          viewCount: img.view_count || 0,
          photos: parsedPhotos
            .map((p: any) => ({
              url: p.url,
              caption: p.caption ? fixMojibake(String(p.caption)) : "",
              altText: p.altText ? fixMojibake(String(p.altText)) : undefined,
              width: p.width,
              height: p.height
            }))
            .filter((p: any) => Boolean(p.url))
        };
      });
    }

    if (!parsed.images) {
      parsed.images = [];
    }

    if (dbStandings) {
      dbStandings.forEach((league: any) => {
        parsed.standings[league.league_key] = Array.isArray(league.rows) ? league.rows : [];
      });
    }

    if (dbStats) {
      dbStats.forEach((league: any) => {
        parsed.stats[league.league_key] = league.data;
      });
    }

    if (dbSubmissions) {
      parsed.submissions = dbSubmissions.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        email: sub.email,
        subject: sub.subject,
        message: sub.message,
        isRead: sub.is_read || false,
        createdAt: sub.created_at
      }));
    }

    if (dbHeroSlides) {
      parsed.heroSlides = dbHeroSlides.map((slide: any) => ({
        id: slide.id,
        image: slide.image,
        title: slide.title,
        subtitle: slide.subtitle,
        link: slide.link,
        active: slide.active !== false,
        sort_order: slide.sort_order || 0,
        sourceType: slide.source_type || "custom",
        sourceId: slide.source_id || ""
      }));
    }

    if (dbSelectedCombinations) {
      parsed.selectedCombinations = dbSelectedCombinations.map((sc: any) => {
        let leagueKey = "pro-league";
        let week = 1;

        if (sc.id && sc.id.startsWith("sc-")) {
          const parts = sc.id.split("-");
          const wPart = parts.find((p: string) => p.startsWith("w") && !isNaN(parseInt(p.slice(1), 10)));
          if (wPart) {
            week = parseInt(wPart.slice(1), 10);
            if (parts.includes("pro") && parts.includes("league")) {
              leagueKey = "pro-league";
            } else if (parts.includes("1")) {
              leagueKey = "league-1";
            } else if (parts.includes("2")) {
              leagueKey = "league-2";
            } else if (parts.includes("futsal")) {
              leagueKey = "futsal";
            }
          }
        }

        let posObj = sc.positions;
        if (typeof posObj === "string" && posObj.trim() !== "") {
          try {
            posObj = JSON.parse(posObj);
          } catch (e) {
            posObj = {};
          }
        }
        if (posObj && typeof posObj === "object") {
          if (posObj.leagueKey) leagueKey = posObj.leagueKey;
          if (posObj.week) week = Number(posObj.week);
        }

        let playersObj = sc.players;
        if (typeof playersObj === "string" && playersObj.trim() !== "") {
          try {
            playersObj = JSON.parse(playersObj);
          } catch (e) {
            playersObj = {};
          }
        }

        return {
          id: sc.id,
          leagueKey: leagueKey,
          week: week,
          title: sc.title,
          description: sc.description,
          positions: posObj,
          players: playersObj,
          createdAt: sc.created_at
        };
      });
    }

    if (dbTeamTransfersList && dbTeamTransfersList.data && dbTeamTransfersList.data.length > 0) {
      parsed.teamTransfersList = dbTeamTransfersList.data.map((t: any) => ({
        id: t.id,
        teamName: t.team_name,
        teamLogo: t.team_logo,
        league: t.league || "pro-league",
        incomings: Array.isArray(t.incomings) ? t.incomings : [],
        outgoings: Array.isArray(t.outgoings) ? t.outgoings : [],
        probables: Array.isArray(t.probables) ? t.probables : []
      }));
    } else {
      parsed.teamTransfersList = [];
    }

    if (dbMediaFiles && dbMediaFiles.data) {
      parsed.media_files = dbMediaFiles.data.map((mf: any) => ({
        id: mf.id,
        title: mf.title,
        file_name: mf.file_name,
        file_path: mf.file_path,
        image_url: mf.image_url,
        file_size: mf.file_size,
        mime_type: mf.mime_type,
        category: mf.category,
        old_url: mf.old_url,
        created_at: mf.created_at,
        updated_at: mf.updated_at
      }));
    } else {
      parsed.media_files = [];
    }

    const migResult = runDatabaseMigrationsAndTransitions(parsed);
    recalculateAndSyncDatabase();

    if (migResult.changed) {
      logMessage("info", "database", "تشخیص تغییرات ساختاری در مهاجرت خودکار داده‌ها؛ ثبت تغییرات در پایگاه داده...");
      setDb(parsed);
      saveDB();
    }

    logMessage("info", "database", "کل داده‌ها با موفقیت از PostgreSQL دریافت و همگام گردید.");
    setDb(parsed);
    markDataSync(true);
    // Phase 3 backfill: the migration cleared the legacy zero-placeholders,
    // so the first boot recomputes + persists the derived season tables once.
    // Any empty table (e.g. after a partial write failure) self-heals here.
    const seasonBackfillNeeded = (!dbPlayerSeasonStats || dbPlayerSeasonStats.length === 0)
      || (!dbCoachSeasonStats || dbCoachSeasonStats.length === 0)
      || (!dbTeamSeasonStats || dbTeamSeasonStats.length === 0);
    if (seasonBackfillNeeded) {
      logMessage("info", "database", "جدول‌های آمار فصلی خالی‌اند؛ بازمحاسبه و ذخیره اولیه انجام می‌شود...");
      saveDB();
    }
  } catch (err: any) {
    logMessage("error", "database", "خطا در بارگذاری اولیه اطلاعات از PostgreSQL", err.message || err);
    setDb(seedData);
    markDataSync(false);
  }
}

export async function saveDB(options?: { skipRecalc?: boolean; tables?: Array<DirtyTable | "all"> }): Promise<void> {
  return dbLock.acquire(async () => {
  const data = loadDB();
  try {
    const dirty = consumeDirty(false);
    if (options && options.tables) {
      for (const t of options.tables) dirty.add(t);
    }
    const need = (t: DirtyTable) => isDirty(dirty, t);
    const allStagedMatches: any[] = [];
    const sports = ["football", "futsal"];
    const stages = ["Feature_Games", "Now_Games", "Finished_Games"];
    
    sports.forEach(sport => {
      stages.forEach(stage => {
        const arrKey = `${sport}_${stage}`;
        const arr = data[arrKey] || [];
        arr.forEach((m: any) => {
          allStagedMatches.push({ ...m, sport, stage });
        });
      });
    });

    const matchIdMap = new Map<string, any>();
    allStagedMatches.forEach(m => {
      const existing = matchIdMap.get(m.id);
      if (!existing) {
        matchIdMap.set(m.id, m);
      } else {
        if (m.stage !== "Feature_Games") {
          matchIdMap.set(m.id, m);
        }
      }
    });
    data.matches = Array.from(matchIdMap.values());

    runDatabaseMigrationsAndTransitions(data);
    // Derived per-season aggregates only change inside recalc; skipRecalc
    // paths must not rewrite them (memory rows would just be restated).
    let recalcRan = false;
    if (options && options.skipRecalc) {
      logMessage("info", "database", "saveDB بدون بازمحاسبه آمار (تغییر غیر finished).");
    } else {
      recalculateAndSyncDatabase();
      recalcRan = true;
      markTablesDirty("playerSeasonStats", "coachSeasonStats", "teamSeasonStats");
    }

    const promises: any[] = [];

    if (need("news") && data.news && data.news.length > 0) {
      const formattedNews = data.news.map((n: any) => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        content: n.content,
        image: n.image,
        gallery: Array.isArray(n.gallery) ? n.gallery : [],
        read_more: n.read_more || null,
        category: n.category,
        tags: n.tags || [],
        view_count: n.viewCount || 0,
        created_at: n.createdAt
      }));
      promises.push(pgDb.from('news').upsert(formattedNews));
      
      const newsIds = data.news.map((x: any) => x.id);
      promises.push(pgDb.from('news').delete().not('id', 'in', `(${newsIds.join(',')})`));
    } else if (need("news") && data.news) {
      promises.push(pgDb.from('news').delete().neq('id', ''));
    }

    const teamIdSet = new Set<string>((data.teams || []).map((t: any) => t.id));

    if (need("teams") && data.teams && data.teams.length > 0) {
      const formattedTeams = data.teams.map((t: any) => {
        const stats = {
          ...(t.stats || {}),
          coach: t.coach || (t.stats && t.stats.coach) || "",
          city: t.city || (t.stats && t.stats.city) || "",
          stadium: t.stadium || (t.stats && t.stats.stadium) || "",
          stadiumCapacity: t.stadiumCapacity || (t.stats && t.stats.stadiumCapacity) || "",
          founded: t.founded || (t.stats && t.stats.founded) || ""
        };
        return {
          id: t.id,
          name: t.name,
          logo: t.logo,
          cover_image: t.coverImage || "",
          stats: stats,
          base_played: t.basePlayed || 0,
          base_won: t.baseWon || 0,
          base_drawn: t.baseDrawn || 0,
          base_lost: t.baseLost || 0,
          base_points: t.basePoints || 0,
          base_goals_for: t.baseGoalsFor || 0,
          base_goals_against: t.baseGoalsAgainst || 0,
          recent_form: t.recentForm || [],
          recent_matches: t.recentMatches || [],
          division_key: t.divisionKey || null,
          is_eliminated: t.isEliminated || false
        };
      });

      const teamResults = pgDb.from('teams').upsert(formattedTeams);
      promises.push(teamResults);

      const teamIds = data.teams.map((x: any) => x.id);
      promises.push(pgDb.from('teams').delete().not('id', 'in', `(${teamIds.join(',')})`));
    } else if (need("teams") && data.teams) {
      promises.push(pgDb.from('teams').delete().neq('id', ''));
    }

    if (need("players") && data.players && data.players.length > 0) {
      const formattedPlayers = data.players.map((p: any) => ({
        id: p.id,
        name: p.name,
        team_id: p.teamId && teamIdSet.has(p.teamId) ? p.teamId : null,
        team_name: p.teamName,
        position: p.position,
        rating: p.rating != null ? p.rating : null,
        average_rating: p.averageRating != null ? p.averageRating : null,
        image: p.image,
        season_stats: {
          ...p.seasonStats,
          leagueStats: p.leagueStats,
          cupStats: p.cupStats,
          careerHistory: p.careerHistory || []
        },
        base_matches: p.baseMatches || 0,
        base_goals: p.baseGoals || 0,
        base_assists: p.baseAssists || 0,
        base_clean_sheets: p.baseCleanSheets || 0,
        base_yellow_cards: p.baseYellowCards || 0,
        base_red_cards: p.baseRedCards || 0,
        ratings_history: p.ratingsHistory || [],
        age: p.age || null,
        nationality: p.nationality || null,
        foot: p.foot || null,
        height: p.height || null,
        is_retired: p.isRetired === true
      }));
      promises.push(pgDb.from('players').upsert(formattedPlayers));

      const playerIds = data.players.map((x: any) => x.id);
      promises.push(pgDb.from('players').delete().not('id', 'in', `(${playerIds.join(',')})`));
    } else if (need("players") && data.players) {
      promises.push(pgDb.from('players').delete().neq('id', ''));
    }

    if (need("coaches") && data.coaches && data.coaches.length > 0) {
      const formattedCoaches = data.coaches.map((c: any) => ({
        id: c.id,
        name: c.name,
        image: c.image,
        team_id: c.teamId && teamIdSet.has(c.teamId) ? c.teamId : null,
        team_name: c.teamName,
        nationality: c.nationality,
        age: c.age || null,
        biography: c.biography || "",
        season_stats: {
          ...(c.seasonStats || {}),
          careerHistory: c.careerHistory || [],
          teamHistory: c.teamHistory || []
        },
        base_matches: c.baseMatches || 0,
        base_wins: c.baseWins || 0,
        base_draws: c.baseDraws || 0,
        base_losses: c.baseLosses || 0,
        titles: c.titles || [],
        coaching_style: c.coachingStyle || "",
        license_level: c.licenseLevel || "",
        experience_years: c.experienceYears || 0,
        is_retired: c.isRetired === true,
        recent_form: c.recentForm || []
      }));
      promises.push(pgDb.from('coaches').upsert(formattedCoaches));

      const coachIds = data.coaches.map((x: any) => x.id);
      promises.push(pgDb.from('coaches').delete().not('id', 'in', `(${coachIds.join(',')})`));
    } else if (need("coaches") && data.coaches) {
      promises.push(pgDb.from('coaches').delete().neq('id', ''));
    }

    if (need("matches") && data.matches && data.matches.length > 0) {
      const coachIdSet = new Set<string>((data.coaches || []).map((c: any) => String(c.id)));
      const formattedMatches = data.matches.map((m: any) => {
        const isFutsal = m.league === "futsal" || m.sport === "futsal";
        const sport = m.sport || (isFutsal ? "futsal" : "football");
        const stage = m.stage || (m.status === "live" ? "Now_Games" : (m.status === "finished" ? "Finished_Games" : "Feature_Games"));
        return {
          id: m.id,
          team_home: m.teamHome,
          team_away: m.teamAway,
          team_home_id: m.teamHomeId && teamIdSet.has(m.teamHomeId) ? m.teamHomeId : null,
          team_away_id: m.teamAwayId && teamIdSet.has(m.teamAwayId) ? m.teamAwayId : null,
          coach_home_id: m.coachHomeId && coachIdSet.has(String(m.coachHomeId)) ? String(m.coachHomeId) : null,
          coach_away_id: m.coachAwayId && coachIdSet.has(String(m.coachAwayId)) ? String(m.coachAwayId) : null,
          team_home_logo: m.teamHomeLogo,
          team_away_logo: m.teamAwayLogo,
          score_home: m.scoreHome || 0,
          score_away: m.scoreAway || 0,
          status: m.status || 'not-started',
          minutes: m.minutes || null,
          league: m.league,
          date: m.date,
          time: m.time,
          venue: m.venue,
          is_popular: m.isPopular || false,
          hot_topic: m.hotTopic,
          predictions: m.predictions,
          sport: sport,
          stage: stage,
          tag: m.tag || null,
          is_auto_finished: m.isAutoFinished || false,
          lineups: stripShirtNumbersFromLineups(m.lineups),
          events: m.events,
          scorers_list: m.scorersList,
          team_stats: m.teamStats,
          referee: m.referee || null,
          week: m.week || null,
          season: m.season || null,
          season_id: (() => {
            // Fail-safe: the FK rejects unknown season ids, so never write
            // one. Prefer the explicit id, else derive from the canonical tag,
            // else fall back to the current season, else NULL (always valid).
            const known = new Set((data.seasons || []).map((s: any) => String(s.id)));
            const raw = m.seasonId != null ? String(m.seasonId).trim() : "";
            if (raw && known.has(raw)) return raw;
            const derived = seasonIdFromTag(normalizeSeasonTag(m.season));
            if (derived && known.has(derived)) {
              if (raw && raw !== derived) {
                logMessage("warn", "database", `season_id ناشناخته برای بازی ${m.id} اصلاح شد: ${raw} -> ${derived}`);
              }
              return derived;
            }
            const fallback = seasonIdFromTag(normalizeSeasonTag(data.currentSeason));
            if (fallback && known.has(fallback)) {
              logMessage("warn", "database", `season_id نامعتبر برای بازی ${m.id} به فصل جاری برگردانده شد.`);
              return fallback;
            }
            if (raw || m.season) {
              logMessage("warn", "database", `season_id بازی ${m.id} تهی شد (فصل ناشناخته، بدون فصل جاری معتبر).`);
            }
            return null;
          })()
        };
      });
      promises.push(pgDb.from('matches').upsert(formattedMatches));

      const matchIds = data.matches.map((x: any) => x.id);
      promises.push(pgDb.from('matches').delete().not('id', 'in', `(${matchIds.join(',')})`));
    } else if (data.matches) {
      promises.push(pgDb.from('matches').delete().neq('id', ''));
    }

    if (need("transfers") && data.transfers && data.transfers.length > 0) {
      const formattedTransfers = data.transfers.map((t: any) => ({
        id: t.id,
        player_name: t.playerName,
        player_image: t.playerImage,
        from_team: t.fromTeam,
        from_team_logo: t.fromTeamLogo,
        to_team: t.toTeam,
        to_team_logo: t.toTeamLogo,
        type: t.type,
        fee: t.fee,
        date: t.date,
        description: t.details || t.description || "",
        view_count: t.viewCount || 0,
        created_at: t.createdAt || t.created_at || new Date().toISOString(),
        tags: t.tags || []
      }));
      promises.push(pgDb.from('transfers').upsert(formattedTransfers));

      const transferIds = data.transfers.map((x: any) => x.id);
      promises.push(pgDb.from('transfers').delete().not('id', 'in', `(${transferIds.join(',')})`));
    } else if (need("transfers") && data.transfers) {
      promises.push(pgDb.from('transfers').delete().neq('id', ''));
    }

    if (need("legionnaires") && data.legionnaires && data.legionnaires.length > 0) {
      const formattedLegionnaires = data.legionnaires.map((l: any) => ({
        id: l.id,
        name: l.name,
        image: l.image,
        league: l.league,
        team: l.team,
        team_logo: l.teamLogo,
        summary: l.summary || "",
        logo: l.logo,
        description: l.performance || l.description || "",
        view_count: l.viewCount || 0,
        created_at: l.createdAt || l.created_at || new Date().toISOString(),
        tags: l.tags || []
      }));
      promises.push(pgDb.from('legionnaires').upsert(formattedLegionnaires));

      const legionId = data.legionnaires.map((x: any) => x.id);
      promises.push(pgDb.from('legionnaires').delete().not('id', 'in', `(${legionId.join(',')})`));
    } else if (need("legionnaires") && data.legionnaires) {
      promises.push(pgDb.from('legionnaires').delete().neq('id', ''));
    }

    if (need("images") && data.images && data.images.length > 0) {
      const formattedImages = data.images.map((img: any) => ({
        id: img.id,
        url: img.url,
        title: img.title || null,
        caption: img.caption || null,
        description: img.description || null,
        created_at: img.createdAt || img.created_at || new Date().toISOString(),
        tags: img.tags || [],
        view_count: img.viewCount || 0,
        photographer: img.photographer || null,
        photos: Array.isArray(img.photos) ? img.photos : []
      }));
      promises.push(pgDb.from('images').upsert(formattedImages));

      const imgIds = data.images.map((x: any) => x.id);
      promises.push(pgDb.from('images').delete().not('id', 'in', `(${imgIds.join(',')})`));
    } else if (need("images") && data.images) {
      promises.push(pgDb.from('images').delete().neq('id', ''));
    }

    if (need("standings") && data.standings) {
      for (const [key, val] of Object.entries(data.standings)) {
        promises.push(pgDb.from('standings').upsert({ league_key: key, rows: val }));
      }
    }

    if (need("stats") && data.stats) {
      for (const [key, val] of Object.entries(data.stats)) {
        promises.push(pgDb.from('stats').upsert({ league_key: key, data: val }));
      }
    }

    // Movement ledger is append-only: upsert rows, never delete-not-in.
    // History rows must survive even if a stale client omits them.
    if (need("playerMovements") && Array.isArray(data.playerMovements) && data.playerMovements.length > 0) {
      const formattedPM = data.playerMovements.map((m: any) => ({
        id: m.id,
        player_id: m.playerId,
        from_team_id: m.fromTeamId || null,
        to_team_id: m.toTeamId || null,
        season_id: m.seasonId || null,
        movement_date: m.movementDate || null,
        note: m.note || null,
        created_at: m.createdAt || new Date().toISOString(),
        updated_at: m.updatedAt || new Date().toISOString()
      }));
      promises.push(pgDb.from('player_club_movements').upsert(formattedPM));
    }

    if (need("coachMovements") && Array.isArray(data.coachMovements) && data.coachMovements.length > 0) {
      const formattedCM = data.coachMovements.map((m: any) => ({
        id: m.id,
        coach_id: m.coachId,
        from_team_id: m.fromTeamId || null,
        to_team_id: m.toTeamId || null,
        season_id: m.seasonId || null,
        movement_date: m.movementDate || null,
        note: m.note || null,
        created_at: m.createdAt || new Date().toISOString(),
        updated_at: m.updatedAt || new Date().toISOString()
      }));
      promises.push(pgDb.from('coach_club_movements').upsert(formattedCM));
    }

    // Lifecycle domain (P1): events are append-only like the legacy ledgers;
    // appointments are a full-rewrite projection, persisted only when the
    // lifecycle service explicitly marked them dirty (never implicitly).
    if (need("lifecycleEvents") && Array.isArray((data as any).lifecycleEvents) && (data as any).lifecycleEvents.length > 0) {
      const formattedLE = (data as any).lifecycleEvents.map((e: any) => ({
        id: e.id,
        person_kind: e.personKind,
        person_id: e.personId,
        event_kind: e.eventKind,
        team_id: e.teamId || null,
        season_id: e.seasonId || null,
        event_date: e.eventDate || null,
        sequence: e.sequence || 0,
        reason_category: e.reasonCategory || null,
        reason_code: e.reasonCode || null,
        appointment_id: e.appointmentId || null,
        correction_of: e.correctionOf || null,
        note: e.note || null,
        actor: e.actor || null,
        created_at: e.createdAt || new Date().toISOString()
      }));
      promises.push(pgDb.from('lifecycle_events').upsert(formattedLE));
    }

    if (need("coachAppointments") && Array.isArray((data as any).coachAppointments)) {
      const rows = (data as any).coachAppointments.map((a: any) => ({
        id: a.id,
        coach_id: a.coachId,
        team_id: a.teamId,
        start_date: a.startDate || null,
        end_date: a.endDate || null,
        status: a.status || "ACTIVE",
        appointment_reason: a.appointmentReason || null,
        departure_reason: a.departureReason || null,
        start_event_id: a.startEventId || null,
        end_event_id: a.endEventId || null,
        created_at: a.createdAt || new Date().toISOString(),
        updated_at: a.updatedAt || new Date().toISOString()
      }));
      promises.push((async () => {
        const del = await pgDb.from('coach_appointments').delete();
        if (del.error) { logMessage("warn", "database", "خطا در پاک‌سازی انتصاب‌ها", del.error); return; }
        if (rows.length === 0) return;
        const res = await pgDb.from('coach_appointments').upsert(rows);
        if (res.error) logMessage("warn", "database", "خطا در ذخیره انتصاب‌ها", res.error);
      })());
    }

    // Derived per-season aggregates: full rewrite (recalc regenerates the
    // whole set; delete-not-in would leave stale buckets behind).
    if (recalcRan && Array.isArray(data.playerSeasonStats)) {
      const rows = data.playerSeasonStats.map((r: any) => ({
        id: r.id,
        player_id: r.playerId,
        season: r.season || null,
        season_id: r.seasonId || null,
        team_id: r.teamId || null,
        team_name: r.teamName || null,
        matches: r.matches || 0,
        goals: r.goals || 0,
        assists: r.assists || 0,
        clean_sheets: r.cleanSheets || 0,
        yellow_cards: r.yellowCards || 0,
        red_cards: r.redCards || 0,
        minutes: r.minutes || 0,
        avg_rating: r.avgRating ?? null,
        ratings: r.ratings || null,
        league_stats: r.leagueStats || null,
        cup_stats: r.cupStats || null,
        created_at: r.createdAt || new Date().toISOString()
      }));
      promises.push((async () => {
        const del = await pgDb.from('player_season_stats').delete();
        if (del.error) { logMessage("warn", "database", "خطا در پاک‌سازی آمار فصلی بازیکنان", del.error); return; }
        if (rows.length === 0) return;
        const res = await pgDb.from('player_season_stats').upsert(rows);
        if (res.error) logMessage("warn", "database", "خطا در ذخیره آمار فصلی بازیکنان", res.error);
      })());
    }

    if (recalcRan && Array.isArray(data.coachSeasonStats)) {
      const rows = data.coachSeasonStats.map((r: any) => ({
        id: r.id,
        coach_id: r.coachId,
        season: r.season || null,
        season_id: r.seasonId || null,
        team_id: r.teamId || null,
        team_name: r.teamName || null,
        matches: r.matches || 0,
        wins: r.wins || 0,
        draws: r.draws || 0,
        losses: r.losses || 0,
        goals_for: r.goalsFor || 0,
        goals_against: r.goalsAgainst || 0,
        win_rate: r.winRate ?? 0,
        created_at: r.createdAt || new Date().toISOString()
      }));
      promises.push((async () => {
        const del = await pgDb.from('coach_season_stats').delete();
        if (del.error) { logMessage("warn", "database", "خطا در پاک‌سازی آمار فصلی مربیان", del.error); return; }
        if (rows.length === 0) return;
        const res = await pgDb.from('coach_season_stats').upsert(rows);
        if (res.error) logMessage("warn", "database", "خطا در ذخیره آمار فصلی مربیان", res.error);
      })());
    }

    if (recalcRan && Array.isArray(data.teamSeasonStats)) {
      const rows = data.teamSeasonStats.map((r: any) => ({
        id: r.id,
        team_id: r.teamId,
        season: r.season || null,
        season_id: r.seasonId || null,
        played: r.played || 0,
        won: r.won || 0,
        drawn: r.drawn || 0,
        lost: r.lost || 0,
        goals_for: r.goalsFor || 0,
        goals_against: r.goalsAgainst || 0,
        points: r.points || 0,
        rank: r.rank ?? null,
        created_at: r.createdAt || new Date().toISOString()
      }));
      promises.push((async () => {
        const del = await pgDb.from('team_season_stats').delete();
        if (del.error) { logMessage("warn", "database", "خطا در پاک‌سازی آمار فصلی تیم‌ها", del.error); return; }
        if (rows.length === 0) return;
        const res = await pgDb.from('team_season_stats').upsert(rows);
        if (res.error) logMessage("warn", "database", "خطا در ذخیره آمار فصلی تیم‌ها", res.error);
      })());
    }

    if (need("teamTransfersList") && data.teamTransfersList && data.teamTransfersList.length > 0) {
      const formattedTeamTransfers = data.teamTransfersList.map((t: any) => ({
        id: t.id,
        team_name: t.teamName,
        team_logo: t.teamLogo,
        league: t.league || "pro-league",
        incomings: t.incomings || [],
        outgoings: t.outgoings || [],
        probables: t.probables || []
      }));
      promises.push(
        pgDb.from('team_transfers_list')
          .upsert(formattedTeamTransfers)
          .then(res => {
            if (res.error) {
              logMessage("warn", "database", "جدول تیم_انتقالات در PostgreSQL یافت نشد یا خطا دارد مپ نهایی صورت پذیرفت اما کش محلی اولویت بالاتری دارد.");
            }
            return res;
          })
      );

      const ttIds = data.teamTransfersList.map((x: any) => x.id);
      promises.push(
        pgDb.from('team_transfers_list')
          .delete()
          .not('id', 'in', `(${ttIds.join(',')})`)
          .then(res => res)
      );
    } else if (need("teamTransfersList") && data.teamTransfersList) {
      promises.push(
        pgDb.from('team_transfers_list')
          .delete()
          .neq('id', '')
          .then(res => res)
      );
    }

    if (need("ads") && data.ads && data.ads.length > 0) {
      const formattedAds = data.ads.map((a: any) => ({
        id: a.id,
        type: a.type || 'slot',
        name: a.name || '',
        placement: a.placement || '',
        title: a.title || '',
        promo: a.promo || '',
        description: a.description || '',
        link_url: a.linkUrl || '',
        image_url: a.imageUrl || '',
        btn_text: a.btnText || '',
        width: a.width || 728,
        height: a.height || 90,
        priority: a.priority || 0,
        start_date: a.startDate || '',
        end_date: a.endDate || '',
        is_active: a.isActive !== false,
        settings: a.settings || {},
        view_count: a.viewCount || 0,
        click_count: a.clickCount || 0
      }));
      promises.push(pgDb.from('ads').upsert(formattedAds));

      const adIds = data.ads.map((x: any) => x.id);
      promises.push(pgDb.from('ads').delete().not('id', 'in', `(${adIds.join(',')})`));
    } else if (need("ads") && data.ads) {
      promises.push(pgDb.from('ads').delete().neq('id', ''));
    }

    if (need("bracket") && data.bracket) {
      promises.push(pgDb.from('bracket').upsert({ id: 'main', data: data.bracket }));

      const slots: any[] = [];
      const b = data.bracket;

      if (Array.isArray(b.round16)) {
        b.round16.forEach((m: any, idx: number) => {
          const slotId = `r16-slot-${idx + 1}`;
          const nextSlotId = `qf-slot-${Math.floor(idx / 2) + 1}`;
          slots.push({
            id: slotId,
            stage: 'round-16',
            match_id: (m && m.id && !m.id.startsWith('placeholder-') && !m.id.startsWith('r16-placeholder-')) ? m.id : null,
            next_slot_id: nextSlotId
          });
        });
      }

      if (Array.isArray(b.quarterFinals)) {
        b.quarterFinals.forEach((m: any, idx: number) => {
          const slotId = `qf-slot-${idx + 1}`;
          const nextSlotId = `sf-slot-${Math.floor(idx / 2) + 1}`;
          slots.push({
            id: slotId,
            stage: 'quarter-finals',
            match_id: (m && m.id && !m.id.startsWith('placeholder-') && !m.id.startsWith('qf-placeholder-')) ? m.id : null,
            next_slot_id: nextSlotId
          });
        });
      }

      if (Array.isArray(b.semiFinals)) {
        b.semiFinals.forEach((m: any, idx: number) => {
          const slotId = `sf-slot-${idx + 1}`;
          const nextSlotId = `final-slot-1`;
          slots.push({
            id: slotId,
            stage: 'semi-finals',
            match_id: (m && m.id && !m.id.startsWith('placeholder-') && !m.id.startsWith('sf-placeholder-')) ? m.id : null,
            next_slot_id: nextSlotId
          });
        });
      }

      if (b.final) {
        const m = b.final;
        slots.push({
          id: 'final-slot-1',
          stage: 'final',
          match_id: (m && m.id && !m.id.startsWith('placeholder-') && !m.id.startsWith('final-placeholder')) ? m.id : null,
          next_slot_id: null
        });
      }

      (global as any).__pendingBracketSlots = slots;
    }

    if (need("heroSlides") && data.heroSlides && data.heroSlides.length > 0) {
      const formattedSlides = data.heroSlides.map((slide: any) => ({
        id: slide.id,
        image: slide.image,
        title: slide.title,
        subtitle: slide.subtitle,
        link: slide.link,
        active: slide.active !== false,
        sort_order: slide.sort_order || 0,
        source_type: slide.sourceType || "custom",
        source_id: slide.sourceId || ""
      }));
      promises.push(pgDb.from('hero_slides').upsert(formattedSlides));

      const slideIds = data.heroSlides.map((x: any) => x.id);
      promises.push(pgDb.from('hero_slides').delete().not('id', 'in', `(${slideIds.join(',')})`));
    } else if (need("heroSlides") && data.heroSlides) {
      promises.push(pgDb.from('hero_slides').delete().neq('id', ''));
    }

    if (need("selectedCombinations") && data.selectedCombinations && data.selectedCombinations.length > 0) {
      const formattedSC = data.selectedCombinations.map((sc: any) => {
        let posObj = sc.positions || {};
        if (typeof posObj === "string" && posObj.trim() !== "") {
          try {
            posObj = JSON.parse(posObj);
          } catch (e) {
            posObj = {};
          }
        } else if (typeof posObj !== "object") {
          posObj = {};
        }

        posObj.leagueKey = sc.leagueKey;
        posObj.week = sc.week;

        let playersObj = sc.players || {};
        if (typeof playersObj === "string" && playersObj.trim() !== "") {
          try {
            playersObj = JSON.parse(playersObj);
          } catch (e) {
            playersObj = {};
          }
        } else if (typeof playersObj !== "object") {
          playersObj = {};
        }

        return {
          id: sc.id,
          title: sc.title,
          description: sc.description,
          positions: posObj,
          players: playersObj,
          created_at: sc.createdAt
        };
      });
      promises.push(pgDb.from('selected_combinations').upsert(formattedSC));

      const scIds = data.selectedCombinations.map((x: any) => x.id);
      promises.push(pgDb.from('selected_combinations').delete().not('id', 'in', `(${scIds.join(',')})`));
    } else if (need("selectedCombinations") && data.selectedCombinations) {
      promises.push(pgDb.from('selected_combinations').delete().neq('id', ''));
    }

    if (need("systemInfo") && data.lastScraped) {
      promises.push(pgDb.from('system_info').upsert({ key: 'lastScraped', value: data.lastScraped }));
    }

    if (need("systemInfo") && data.currentSeason) {
      promises.push(pgDb.from('system_info').upsert({ key: 'currentSeason', value: data.currentSeason }));
    }

    if (need("submissions") && data.submissions && data.submissions.length > 0) {
      const formattedSubs = data.submissions.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        email: sub.email,
        subject: sub.subject,
        message: sub.message,
        is_read: sub.isRead || false,
        created_at: sub.createdAt
      }));
      promises.push(pgDb.from('submissions').upsert(formattedSubs));

      const subIds = data.submissions.map((x: any) => x.id);
      promises.push(pgDb.from('submissions').delete().not('id', 'in', `(${subIds.join(',')})`));
    } else if (need("submissions") && data.submissions) {
      promises.push(pgDb.from('submissions').delete().neq('id', ''));
    }

    if (need("mediaFiles") && data.media_files && data.media_files.length > 0) {
      const formattedMedia = data.media_files.map((mf: any) => ({
        id: mf.id,
        title: mf.title || null,
        file_name: mf.file_name,
        file_path: mf.file_path,
        image_url: mf.image_url,
        file_size: mf.file_size || null,
        mime_type: mf.mime_type || null,
        category: mf.category || null,
        old_url: mf.old_url || null,
        created_at: mf.created_at || new Date().toISOString(),
        updated_at: mf.updated_at || new Date().toISOString()
      }));
      promises.push(
        pgDb.from('media_files')
          .upsert(formattedMedia)
          .then(res => {
            if (res.error) {
              logMessage("warn", "database", "جدول رسانه‌ها در PostgreSQL یافت نشد یا خطا دارد مپ نهایی صورت پذیرفت اما کش محلی اولویت بالاتری دارد.");
            }
            return res;
          })
      );

      const mfIds = data.media_files.map((x: any) => x.id);
      promises.push(
        Promise.resolve(
          pgDb.from('media_files')
            .delete()
            .not('id', 'in', `(${mfIds.join(',')})`)
        ).catch(e => null)
      );
    } else if (need("mediaFiles") && data.media_files) {
      promises.push(
        Promise.resolve(
          pgDb.from('media_files')
            .delete()
            .neq('id', '')
        ).catch(e => null)
      );
    }

    const results = await Promise.all(promises);
    const errors = results.filter(r => r && r.error);
    if (errors.length > 0) {
      const errorDetails = errors.map(e => e.error?.message || e.error).join('; ');
      logMessage("warn", "database", "خطا در آپلود تغییرات به PostgreSQL", errors.map(e => e.error));
      throw new Error(`ذخیره‌سازی دیتابیس ناموفق بود: ${errorDetails}`);
    }

    const pendingSlots = (global as any).__pendingBracketSlots;
    if (pendingSlots && pendingSlots.length > 0) {
      try {
        await pgDb.from('bracket_slots').delete().neq('id', '');
        await pgDb.from('bracket_slots').upsert(pendingSlots);
      } catch (e: any) {
        logMessage("warn", "database", "خطا در آپلود bracket_slots", e.message || e);
      }
      delete (global as any).__pendingBracketSlots;
    }

    logMessage("info", "database", "همگام‌سازی PostgreSQL با موفقیت به پایان رسید.");
  } catch (err: any) {
    logMessage("error", "database", "خطای فاجعه‌بار در پس‌زمینه در حین آپلود به PostgreSQL:", err.message || err);
    throw err;
  }
  });
}

// Fills missing match-embedded coach ids from the CURRENT mapping.
// Never overwrites existing stamps: re-saving an old match after a transfer
// must not rewrite its history. Used by POST creates and updateMatchInDb.
export function stampMissingCoachIds(match: any, dbObj: any): void {
  if (!match) return;
  if (match.coachHomeId == null || String(match.coachHomeId).trim() === "") {
    const homeCoach = (dbObj.coaches || []).find((c: any) =>
      c.teamId && (c.teamId === match.teamHomeId || (match.teamHome && normalizePersianString(c.teamName || "") === normalizePersianString(match.teamHome)))
    );
    if (homeCoach) match.coachHomeId = homeCoach.id;
  }
  if (match.coachAwayId == null || String(match.coachAwayId).trim() === "") {
    const awayCoach = (dbObj.coaches || []).find((c: any) =>
      c.teamId && (c.teamId === match.teamAwayId || (match.teamAway && normalizePersianString(c.teamName || "") === normalizePersianString(match.teamAway)))
    );
    if (awayCoach) match.coachAwayId = awayCoach.id;
  }
}

export function updateMatchInDb(matchId: string, updates: any): boolean {
  const dbObj = loadDB();
  const sports = ["football", "futsal"];
  const stages = ["Feature_Games", "Now_Games", "Finished_Games"];
  let foundSport = "";
  
  for (const sp of sports) {
    for (const st of stages) {
      if ((dbObj[`${sp}_${st}`] || []).some((m: any) => String(m.id) === String(matchId))) {
        foundSport = sp;
        break;
      }
    }
    if (foundSport) break;
  }
  
  if (!foundSport) {
    return false;
  }
  
  let baseMatchObj: any = null;
  for (const st of stages) {
    const list = dbObj[`${foundSport}_${st}`] || [];
    const item = list.find((m: any) => String(m.id) === String(matchId));
    if (item) {
      baseMatchObj = { ...item };
    }
  }
  
  if (!baseMatchObj) {
    return false;
  }
  
  const mergedMatch = { ...baseMatchObj, ...updates };

  // Same canonical-season rule as POST /api/matches: range labels and stale
  // ids must never reach the FK (the saveDB mapping re-validates anyway).
  if (updates.season !== undefined || updates.seasonId !== undefined) {
    const tag = normalizeSeasonTag(mergedMatch.season)
      || normalizeSeasonTag(dbObj.currentSeason)
      || "1405";
    const rawSid = mergedMatch.seasonId != null ? String(mergedMatch.seasonId).trim() : "";
    mergedMatch.season = tag;
    mergedMatch.seasonId = /^season-\d{4}$/.test(rawSid) ? rawSid : `season-${tag}`;
  }
  
  if (updates.status === "finished" || updates.scoreHome !== undefined || updates.scoreAway !== undefined || updates.scorersList || updates.events || updates.lineups) {
    delete mergedMatch.tag;
    delete mergedMatch.isAutoFinished;
  }

  // Stamp match-embedded coach ids, but NEVER overwrite existing stamps:
  // re-saving an old match after a transfer must not rewrite its history.
  stampMissingCoachIds(mergedMatch, dbObj);
  
  let targetStage = "Feature_Games";
  if (mergedMatch.status === "finished") {
    targetStage = "Finished_Games";
  } else if (mergedMatch.status === "live") {
    targetStage = "Now_Games";
  }
  
  mergedMatch.stage = targetStage;
  
  stages.forEach(st => {
    dbObj[`${foundSport}_${st}`] = (dbObj[`${foundSport}_${st}`] || []).filter((m: any) => String(m.id) !== String(matchId));
  });
  
  dbObj[`${foundSport}_${targetStage}`].push(mergedMatch);
  
  if (targetStage !== "Feature_Games") {
    const clonedForFeature = { ...mergedMatch, stage: "Feature_Games" };
    dbObj[`${foundSport}_Feature_Games`].push(clonedForFeature);
  }
  
  return true;
}
