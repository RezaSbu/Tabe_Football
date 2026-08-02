-- ============================================
-- Tabe Football - Database Schema V2
-- PostgreSQL 16
-- ============================================

-- Enforce UTF-8 encoding
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- ============================================
-- Tables (creation order matters for FKs)
-- ============================================

CREATE TABLE public.ads (
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
);

CREATE TABLE public.system_info (
  key varchar(100) NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT system_info_pkey PRIMARY KEY (key)
);

CREATE TABLE public.teams (
  id varchar(50) NOT NULL,
  name varchar(200) NOT NULL,
  logo text,
  cover_image text,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  recent_form jsonb DEFAULT '[]'::jsonb,
  recent_matches jsonb DEFAULT '[]'::jsonb,
  division_key varchar(50),
  base_played integer DEFAULT 0,
  base_won integer DEFAULT 0,
  base_drawn integer DEFAULT 0,
  base_lost integer DEFAULT 0,
  base_points integer DEFAULT 0,
  base_goals_for integer DEFAULT 0,
  base_goals_against integer DEFAULT 0,
  is_eliminated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT teams_pkey PRIMARY KEY (id)
);

CREATE TABLE public.news (
  id varchar(50) NOT NULL,
  title text NOT NULL,
  summary text,
  content text,
  image text,
  category varchar(50),
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  view_count integer DEFAULT 0,
  CONSTRAINT news_pkey PRIMARY KEY (id),
  CONSTRAINT chk_news_category CHECK (category IS NULL OR category IN ('pro-league', 'league-1', 'league-2', 'hazfi-cup', 'futsal', 'all', 'domestic', 'international', 'transfer', 'analysis', 'general', 'other', 'iranian-football', 'match-preview', 'national-team', 'highlights', 'tactical', 'transfer-news', 'injury', 'interview', 'transfers', 'news', 'featured', 'video', 'photo'))
);

CREATE TABLE public.players (
  id varchar(50) NOT NULL,
  name varchar(200) NOT NULL,
  team_id varchar(50),
  team_name varchar(200),
  position varchar(50),
  rating numeric(3,1) DEFAULT 0.0,
  image text,
  season_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  ratings_history jsonb DEFAULT '[]'::jsonb,
  age integer,
  nationality varchar(100),
  foot varchar(10),
  height integer,
  shirt_number integer,
  average_rating numeric(3,1) DEFAULT 0.0,
  base_matches integer DEFAULT 0,
  base_goals integer DEFAULT 0,
  base_assists integer DEFAULT 0,
  base_clean_sheets integer DEFAULT 0,
  base_yellow_cards integer DEFAULT 0,
  base_red_cards integer DEFAULT 0,
  career_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT players_pkey PRIMARY KEY (id),
  CONSTRAINT fk_players_teams FOREIGN KEY (team_id)
    REFERENCES public.teams(id) ON DELETE SET NULL,
  CONSTRAINT chk_players_position CHECK (position IS NULL OR position IN ('GK', 'DF', 'MF', 'FW', 'goalkeeper', 'defender', 'midfielder', 'forward', 'دروازه‌بان', 'مدافع', 'هافبک', 'مهاجم', 'هافبک دفاعی', 'هافبک تهاجمی', 'مدافع مرکزی', 'مدافع چپ', 'مدافع راست', 'وینگر چپ', 'وینگر راست', 'مهاجم نوک', 'هافبک مرکزی'))
);

CREATE TABLE public.coaches (
  id varchar(50) NOT NULL,
  name varchar(200) NOT NULL,
  image text,
  team_id varchar(50),
  team_name varchar(200),
  nationality varchar(100),
  age integer,
  biography text,
  coaching_style varchar(100),
  license_level varchar(50),
  season_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  team_history jsonb DEFAULT '[]'::jsonb,
  base_matches integer DEFAULT 0,
  base_wins integer DEFAULT 0,
  base_draws integer DEFAULT 0,
  base_losses integer DEFAULT 0,
  titles jsonb DEFAULT '[]'::jsonb,
  experience_years integer DEFAULT 0,
  recent_form jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT coaches_pkey PRIMARY KEY (id),
  CONSTRAINT fk_coaches_teams FOREIGN KEY (team_id)
    REFERENCES public.teams(id) ON DELETE SET NULL
);

CREATE TABLE public.matches (
  id varchar(50) NOT NULL,
  team_home varchar(200) NOT NULL,
  team_away varchar(200) NOT NULL,
  team_home_id varchar(50),
  team_away_id varchar(50),
  team_home_logo text,
  team_away_logo text,
  minutes varchar(10),
  league varchar(50),
  date varchar(20),
  time varchar(10),
  venue text,
  hot_topic text,
  predictions jsonb,
  tag text,
  lineups jsonb,
  events jsonb,
  scorers_list jsonb,
  team_stats jsonb,
  referee text,
  score_home integer DEFAULT 0,
  score_away integer DEFAULT 0,
  status varchar(20) DEFAULT 'not-started',
  is_popular boolean DEFAULT false,
  sport varchar(20) DEFAULT 'football',
  stage varchar(50) DEFAULT 'Feature_Games',
  week varchar(50),
  is_auto_finished boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT fk_matches_team_home FOREIGN KEY (team_home_id)
    REFERENCES public.teams(id) ON DELETE SET NULL,
  CONSTRAINT fk_matches_team_away FOREIGN KEY (team_away_id)
    REFERENCES public.teams(id) ON DELETE SET NULL,
  CONSTRAINT chk_matches_status CHECK (status IN ('not-started', 'live', 'finished', 'archived', 'halftime', 'postponed')),
  CONSTRAINT chk_matches_sport CHECK (sport IN ('football', 'futsal')),
  CONSTRAINT chk_matches_league CHECK (league IS NULL OR league IN ('pro-league', 'league-1', 'league-2', 'hazfi-cup', 'futsal'))
);

CREATE TABLE public.transfers (
  id varchar(50) NOT NULL,
  player_name varchar(200) NOT NULL,
  player_image text,
  from_team varchar(200),
  from_team_logo text,
  to_team varchar(200),
  to_team_logo text,
  type varchar(50),
  fee varchar(50),
  date varchar(20),
  from_team_id varchar(50),
  to_team_id varchar(50),
  description text,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tags jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT transfers_pkey PRIMARY KEY (id),
  CONSTRAINT fk_transfers_from_team FOREIGN KEY (from_team_id)
    REFERENCES public.teams(id) ON DELETE SET NULL,
  CONSTRAINT fk_transfers_to_team FOREIGN KEY (to_team_id)
    REFERENCES public.teams(id) ON DELETE SET NULL,
  CONSTRAINT chk_transfers_type CHECK (type IS NULL OR type IN ('دائمی', 'قرارداد قرضی', 'شایعه نقل و انتقال', 'permanent', 'loan', 'free', 'exchange', 'draft', 'other'))
);

CREATE TABLE public.legionnaires (
  id varchar(50) NOT NULL,
  name varchar(200) NOT NULL,
  image text,
  league varchar(50),
  team varchar(200),
  team_logo text,
  match_rating numeric(3,1),
  match_status varchar(50),
  logo text,
  goals integer DEFAULT 0,
  assists integer DEFAULT 0,
  minutes_played integer DEFAULT 0,
  description text,
  summary text,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tags jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT legionnaires_pkey PRIMARY KEY (id)
);

CREATE TABLE public.images (
  id varchar(50) NOT NULL,
  url text NOT NULL,
  title text,
  caption text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tags jsonb DEFAULT '[]'::jsonb,
  view_count integer DEFAULT 0,
  CONSTRAINT images_pkey PRIMARY KEY (id)
);

CREATE TABLE public.standings (
  league_key varchar(50) NOT NULL,
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT standings_pkey PRIMARY KEY (league_key)
);

CREATE TABLE public.stats (
  league_key varchar(50) NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT stats_pkey PRIMARY KEY (league_key)
);

CREATE TABLE public.submissions (
  id varchar(50) NOT NULL,
  name varchar(200) NOT NULL,
  email varchar(200),
  subject text,
  message text,
  created_at timestamptz DEFAULT now(),
  is_read boolean DEFAULT false,
  CONSTRAINT submissions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.hero_slides (
  id varchar(50) NOT NULL,
  image text NOT NULL,
  title text,
  subtitle text,
  link text,
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  source_type varchar(20) DEFAULT 'custom',
  source_id varchar(100) DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT hero_slides_pkey PRIMARY KEY (id)
);

CREATE TABLE public.selected_combinations (
  id varchar(50) NOT NULL,
  title text,
  description text,
  positions jsonb,
  players jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT selected_combinations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.bracket (
  id varchar(50) NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bracket_pkey PRIMARY KEY (id)
);

CREATE TABLE public.bracket_slots (
  id varchar(50) NOT NULL,
  stage varchar(50) NOT NULL,
  match_id varchar(50),
  next_slot_id varchar(50),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bracket_slots_pkey PRIMARY KEY (id)
);

CREATE TABLE public.team_transfers_list (
  id varchar(50) NOT NULL,
  team_name text NOT NULL,
  team_logo text DEFAULT '',
  incomings jsonb DEFAULT '[]'::jsonb,
  outgoings jsonb DEFAULT '[]'::jsonb,
  probables jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT team_transfers_list_pkey PRIMARY KEY (id)
);

CREATE TABLE public.media_files (
  id varchar(50) NOT NULL,
  title text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  image_url text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text,
  category text,
  old_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT media_files_pkey PRIMARY KEY (id)
);

CREATE TABLE public.archive (
  id varchar(50) NOT NULL,
  season_tag varchar(50) NOT NULL,
  type varchar(50) NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT archive_pkey PRIMARY KEY (id)
);

-- ============================================
-- Indexes
-- ============================================

-- news
CREATE INDEX idx_news_category ON public.news(category);
CREATE INDEX idx_news_created_at ON public.news(created_at DESC);

-- teams
CREATE INDEX idx_teams_division ON public.teams(division_key);
CREATE INDEX idx_teams_name ON public.teams(name);

-- players
CREATE INDEX idx_players_team_id ON public.players(team_id);
CREATE INDEX idx_players_team_name ON public.players(team_name);
CREATE INDEX idx_players_name ON public.players(name);
CREATE INDEX idx_players_position ON public.players(position);

-- matches
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_league ON public.matches(league);
CREATE INDEX idx_matches_date ON public.matches(date);
CREATE INDEX idx_matches_sport ON public.matches(sport);
CREATE INDEX idx_matches_stage ON public.matches(stage);
CREATE INDEX idx_matches_team_home ON public.matches(team_home_id);
CREATE INDEX idx_matches_team_away ON public.matches(team_away_id);

-- transfers
CREATE INDEX idx_transfers_from_team ON public.transfers(from_team_id);
CREATE INDEX idx_transfers_to_team ON public.transfers(to_team_id);
CREATE INDEX idx_transfers_created_at ON public.transfers(created_at DESC);

-- coaches
CREATE INDEX idx_coaches_team_id ON public.coaches(team_id);

-- submissions
CREATE INDEX idx_submissions_is_read ON public.submissions(is_read);

-- hero_slides
CREATE INDEX idx_hero_slides_active ON public.hero_slides(active);
CREATE INDEX idx_hero_slides_sort ON public.hero_slides(sort_order);

-- media_files
CREATE INDEX idx_media_files_category ON public.media_files(category);

-- archive
CREATE INDEX idx_archive_type ON public.archive(type);
CREATE INDEX idx_archive_season ON public.archive(season_tag);
CREATE INDEX idx_archive_created_at ON public.archive(created_at DESC);

-- bracket_slots
CREATE INDEX idx_bracket_slots_stage ON public.bracket_slots(stage);
CREATE INDEX idx_bracket_slots_match_id ON public.bracket_slots(match_id);
CREATE INDEX idx_bracket_slots_next_slot ON public.bracket_slots(next_slot_id);

-- legionnaires
CREATE INDEX idx_legionnaires_league ON public.legionnaires(league);

-- ads
CREATE INDEX idx_ads_type ON public.ads(type);
CREATE INDEX idx_ads_placement ON public.ads(placement);

-- ============================================
-- Seed Data
-- ============================================

INSERT INTO public.ads (id, type, name, placement) VALUES ('banner-main', 'banner', 'بنر بالای صفحه', 'top')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_info (key, value) VALUES
  ('currentSeason', '1404'),
  ('lastScraped', '')
ON CONFLICT (key) DO NOTHING;
