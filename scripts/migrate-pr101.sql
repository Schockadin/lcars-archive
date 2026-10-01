-- Migration für PR #101: Voreinstellungen zum Planen neuer Sessions.
--
-- Vor dem Deploy auf der Railway-Datenbank ausführen:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr101.sql
--
-- Keine Transaktionsanweisungen: Transaktionshandling bleibt beim Runner bzw.
-- bei der Person, die die Migration ausführt.

ALTER TABLE campaign_settings
  ADD COLUMN IF NOT EXISTS session_default_weekday SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_default_week_parity TEXT NOT NULL DEFAULT 'odd',
  ADD COLUMN IF NOT EXISTS session_default_time TEXT NOT NULL DEFAULT '16:00',
  ADD COLUMN IF NOT EXISTS session_default_location TEXT NOT NULL DEFAULT 'David';

