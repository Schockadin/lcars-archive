-- Version 2.0: persönliche Bildbibliothek. Vor dem Ausrollen der Anwendung
-- einmalig gegen die produktive und die Preview-Datenbank ausführen.
-- Wiederholbar; bestehende Inhaltsbilder bleiben in content_images und können
-- von ihren Uploadenden über „Meine Dateien“ übernommen werden.
CREATE TABLE IF NOT EXISTS user_images (
  id SERIAL PRIMARY KEY,
  owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  r2_key TEXT UNIQUE NOT NULL,
  file_name TEXT NOT NULL,
  content_mime TEXT NOT NULL,
  size_bytes INT NOT NULL,
  source_image_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_images_owner ON user_images(owner_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_images_owner_source ON user_images(owner_id, source_image_key) WHERE source_image_key IS NOT NULL;

-- Persönliche Dokumente können auch ohne Charakter gespeichert werden.
ALTER TABLE character_documents
  ADD COLUMN IF NOT EXISTS owner_user_id INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE character_documents ALTER COLUMN character_id DROP NOT NULL;
UPDATE character_documents AS document
SET owner_user_id = COALESCE(character.player_id, document.uploaded_by)
FROM characters AS character
WHERE document.character_id = character.id AND document.owner_user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_character_documents_owner
  ON character_documents(owner_user_id, created_at DESC);
