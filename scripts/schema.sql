CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'player'
               CHECK (role IN ('gm', 'player', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS characters (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'retired', 'deceased')),
  player_id   INT REFERENCES users(id) ON DELETE SET NULL,
  portrait    TEXT,
  species     TEXT,
  rank        TEXT,
  bio         TEXT,
  joined_at   DATE,
  left_at     DATE,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS missions (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
  summary     TEXT,
  started_at  DATE,
  ended_at    DATE,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_logs (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  mission_id  INT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  author_id   INT REFERENCES characters(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  log_date    DATE,
  session_nr  INT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archive_entries (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL
                CHECK (category IN (
                  'person', 'location', 'item', 'faction',
                  'theory', 'event', 'species', 'other'
                )),
  content     TEXT NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archive_links (
  source_id   INT NOT NULL REFERENCES archive_entries(id) ON DELETE CASCADE,
  target_id   INT NOT NULL REFERENCES archive_entries(id) ON DELETE CASCADE,
  label       TEXT,
  PRIMARY KEY (source_id, target_id),
  CHECK (source_id != target_id)
);

-- Indizes (IF NOT EXISTS ab PostgreSQL 9.5)
CREATE INDEX IF NOT EXISTS idx_characters_status    ON characters(status);
CREATE INDEX IF NOT EXISTS idx_characters_player    ON characters(player_id);
CREATE INDEX IF NOT EXISTS idx_missions_status      ON missions(status);
CREATE INDEX IF NOT EXISTS idx_mission_logs_mission ON mission_logs(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_logs_author  ON mission_logs(author_id);
CREATE INDEX IF NOT EXISTS idx_archive_category     ON archive_entries(category);
CREATE INDEX IF NOT EXISTS idx_archive_tags         ON archive_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_archive_links_source ON archive_links(source_id);
CREATE INDEX IF NOT EXISTS idx_archive_links_target ON archive_links(target_id);