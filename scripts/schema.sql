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
  metadata    JSONB NOT NULL DEFAULT '{}',
  source_md   TEXT,
  frontmatter JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS missions (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
  started_at  DATE,
  ended_at    DATE,
  metadata    JSONB NOT NULL DEFAULT '{}',
  source_md   TEXT,
  frontmatter JSONB NOT NULL DEFAULT '{}',
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
  source_md   TEXT,
  frontmatter JSONB NOT NULL DEFAULT '{}',
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
                  'theory', 'event', 'species', 'other', 'npc', 'dialogue'
                )),
  content     TEXT NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  metadata    JSONB NOT NULL DEFAULT '{}',
  source_md   TEXT,
  frontmatter JSONB NOT NULL DEFAULT '{}',
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

-- Additive Migrationen für bestehende DBs (CREATE TABLE IF NOT EXISTS oben
-- legt neue Spalten bei schon vorhandenen Tabellen nicht an).
-- source_md = roher Markdown-Body, frontmatter = geparstes Frontmatter (JSONB).
ALTER TABLE characters      ADD COLUMN IF NOT EXISTS source_md   TEXT;
ALTER TABLE characters      ADD COLUMN IF NOT EXISTS frontmatter JSONB NOT NULL DEFAULT '{}';
ALTER TABLE missions        ADD COLUMN IF NOT EXISTS source_md   TEXT;
ALTER TABLE missions        ADD COLUMN IF NOT EXISTS frontmatter JSONB NOT NULL DEFAULT '{}';
ALTER TABLE mission_logs    ADD COLUMN IF NOT EXISTS source_md   TEXT;
ALTER TABLE mission_logs    ADD COLUMN IF NOT EXISTS frontmatter JSONB NOT NULL DEFAULT '{}';
ALTER TABLE archive_entries ADD COLUMN IF NOT EXISTS source_md   TEXT;
ALTER TABLE archive_entries ADD COLUMN IF NOT EXISTS frontmatter JSONB NOT NULL DEFAULT '{}';

-- Automatisch aus den Mission-Logs generierte Synopsis (siehe
-- scripts/generate-synopsis.ts). Ersetzt das frühere, manuell gepflegte
-- summary-Feld — die Synopsis ist jetzt die einzige Zusammenfassung.
ALTER TABLE missions ADD COLUMN IF NOT EXISTS synopsis TEXT;
ALTER TABLE missions DROP COLUMN IF EXISTS summary;

-- Kategorie-CHECK erweitern (npc, dialogue). Bei bestehenden DBs greift das
-- inline-CHECK von CREATE TABLE oben nicht — daher Constraint neu setzen.
ALTER TABLE archive_entries DROP CONSTRAINT IF EXISTS archive_entries_category_check;
ALTER TABLE archive_entries ADD CONSTRAINT archive_entries_category_check
  CHECK (category IN (
    'person', 'location', 'item', 'faction',
    'theory', 'event', 'species', 'npc', 'dialogue', 'other'
  ));

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