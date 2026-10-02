-- Migration für PR #106: isolierte, temporäre Arbeitskopien für Inhaltseditoren.
--
-- Autosaves berühren nicht die eigentlichen Inhaltszeilen. Entwürfe gehören
-- einem Benutzer und einem bestehenden Inhalt oder einem Modal-Anlegeformular,
-- laufen nach 30 Tagen ab und werden nach dem normalen Speichern entfernt.
--
-- Vor dem Deploy ausführen:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr106.sql
--
-- Idempotent: ein erneuter Lauf lässt ein aktuelles Schema unverändert.

CREATE TABLE IF NOT EXISTS editor_drafts (
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL
                 CHECK (content_type IN (
                   'archive', 'mission', 'mission_log', 'manual_event',
                   'character_document', 'dialogue', 'game_session',
                   'planned_session'
                 )),
  content_id   INT NOT NULL,
  fields       JSONB NOT NULL,
  revision     INT NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, content_type, content_id)
);
CREATE INDEX IF NOT EXISTS idx_editor_drafts_expiry
  ON editor_drafts(expires_at);
