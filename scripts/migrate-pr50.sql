-- Migration für PR #50 (fix/gm-role-escalation-and-session-cache → master)
-- Gegen die Produktions-DB (centerbeam) ausführen, nachdem der PR gemergt wurde.
-- Alle Statements sind idempotent (IF NOT EXISTS / IF EXISTS).
--
-- Reihenfolge: neue Spalten auf bestehenden Tabellen zuerst, dann neue Tabellen,
-- dann Constraints/Indizes.

-- ---------------------------------------------------------------------------
-- users: neue Spalten
-- ---------------------------------------------------------------------------

-- Nutzer-Präferenz: abgeschlossene Dialoge als Fließtext statt Karten (Default: an).
ALTER TABLE users ADD COLUMN IF NOT EXISTS dialogue_flowing_text_enabled BOOLEAN NOT NULL DEFAULT true;

-- Nutzer-Präferenz: native Browser-Rechtschreibprüfung im Markdown-Editor (Default: an).
ALTER TABLE users ADD COLUMN IF NOT EXISTS editor_spellcheck_enabled BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- characters: Soft-Delete + Entwürfe + Charakter-Farbe
-- ---------------------------------------------------------------------------

ALTER TABLE characters ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_characters_deleted_at ON characters(deleted_at);
CREATE INDEX IF NOT EXISTS idx_characters_is_draft   ON characters(is_draft);

-- Charakter-Farbe: freie Hex-Farbe (#rrggbb) oder NULL (= App leitet LCARS-Default ab).
-- PRO CHARAKTER statt pro User, damit ein User mit mehreren Charakteren
-- ("Multis") für jeden eine eigene Farbe wählen kann.
ALTER TABLE characters ADD COLUMN IF NOT EXISTS character_color TEXT;
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_character_color_check;
ALTER TABLE characters ADD CONSTRAINT characters_character_color_check
  CHECK (character_color IS NULL OR character_color ~ '^#[0-9a-fA-F]{6}$');
-- Partieller UNIQUE-Index: jede explizit gewählte Farbe ist exklusiv einem Charakter zugeordnet.
CREATE UNIQUE INDEX IF NOT EXISTS idx_characters_character_color
  ON characters(character_color) WHERE character_color IS NOT NULL;

-- ---------------------------------------------------------------------------
-- missions: Soft-Delete + Entwürfe
-- ---------------------------------------------------------------------------

ALTER TABLE missions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_missions_deleted_at ON missions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_missions_is_draft   ON missions(is_draft);

-- ---------------------------------------------------------------------------
-- mission_logs: Soft-Delete + Entwürfe
-- ---------------------------------------------------------------------------

ALTER TABLE mission_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE mission_logs ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_mission_logs_deleted_at ON mission_logs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_mission_logs_is_draft   ON mission_logs(is_draft);

-- ---------------------------------------------------------------------------
-- archive_entries: Soft-Delete + Entwürfe
-- ---------------------------------------------------------------------------

ALTER TABLE archive_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE archive_entries ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_archive_entries_deleted_at ON archive_entries(deleted_at);
CREATE INDEX IF NOT EXISTS idx_archive_entries_is_draft   ON archive_entries(is_draft);

-- ---------------------------------------------------------------------------
-- Neue Tabellen
-- ---------------------------------------------------------------------------

-- Antwort-Reservierung für Mehrparteien-Dialoge (>2 Teilnehmende).
CREATE TABLE IF NOT EXISTS dialogue_reservations (
  archive_entry_id INT PRIMARY KEY REFERENCES archive_entries(id) ON DELETE CASCADE,
  held_by_user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Einmal-Opt-in „informiere mich, wenn diese Antwort-Sperre endet".
CREATE TABLE IF NOT EXISTS dialogue_reservation_notify_requests (
  archive_entry_id INT NOT NULL REFERENCES archive_entries(id) ON DELETE CASCADE,
  user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (archive_entry_id, user_id)
);

-- Protokoll unerwarteter Serverfehler (Next.js onRequestError / logCaughtError).
CREATE TABLE IF NOT EXISTS error_logs (
  id         SERIAL PRIMARY KEY,
  digest     TEXT,
  message    TEXT NOT NULL,
  stack      TEXT,
  route_path TEXT,
  route_type TEXT,
  method     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_digest     ON error_logs(digest);

-- Bild-Uploads für Charaktere/Missionen/Missionslogs/Archiv-Einträge.
CREATE TABLE IF NOT EXISTS content_images (
  id           SERIAL PRIMARY KEY,
  content_type TEXT NOT NULL
                 CHECK (content_type IN (
                   'character', 'mission', 'mission_log', 'archive_entry'
                 )),
  content_id   INT NOT NULL,
  r2_key       TEXT UNIQUE NOT NULL,
  content_mime TEXT NOT NULL,
  size_bytes   INT NOT NULL,
  uploaded_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_images_content ON content_images(content_type, content_id);
