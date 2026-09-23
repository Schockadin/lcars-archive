-- Migration für die Erweiterung eigener Chronologie-Ereignisse.
--
-- Fügt einen getrennten Teaser hinzu und erlaubt Bildern, über die bestehende
-- polymorphe content_images-Tabelle an timeline_events zu hängen.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr92.sql
--
-- Idempotent: Die Spalte wird nur ergänzt, wenn sie fehlt; die benannte
-- CHECK-Constraint wird vor dem erneuten Anlegen gezielt entfernt.

BEGIN;

ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS teaser TEXT;

-- Vorhandene freie Ereignisse hatten bisher nur `detail`, das zugleich auf
-- der Karte stand. Als Teaser übernehmen, damit der Import keine bestehenden
-- Karten scheinbar leert; der bisherige Text bleibt zugleich als Volltext
-- erhalten.
UPDATE timeline_events
SET teaser = detail
WHERE origin = 'manual' AND teaser IS NULL AND detail IS NOT NULL;

ALTER TABLE content_images
  DROP CONSTRAINT IF EXISTS content_images_content_type_check;
ALTER TABLE content_images
  ADD CONSTRAINT content_images_content_type_check
  CHECK (content_type IN (
    'character', 'mission', 'mission_log', 'archive_entry', 'timeline_event'
  ));

COMMIT;
