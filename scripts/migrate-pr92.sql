-- Migration für die Erweiterung eigener Chronologie-Ereignisse.
--
-- Fügt einen getrennten Teaser hinzu und erlaubt Bildern, über die bestehende
-- polymorphe content_images-Tabelle an timeline_events zu hängen. Ergänzt
-- außerdem zusätzliche PDF-, Markdown-, DOCX- und Textdokumente für Figuren.
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

CREATE TABLE IF NOT EXISTS character_documents (
  id             SERIAL PRIMARY KEY,
  character_id   INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  r2_key         TEXT UNIQUE NOT NULL,
  file_name      TEXT NOT NULL,
  file_kind      TEXT NOT NULL CHECK (file_kind IN ('pdf', 'md', 'docx', 'txt')),
  content_mime   TEXT NOT NULL,
  size_bytes     INT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 8388608),
  extracted_text TEXT,
  uploaded_by    INT REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_character_documents_character
  ON character_documents(character_id);

COMMIT;
