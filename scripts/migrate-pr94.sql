-- Reversible Umwandlung inaktiver/verstorbener Charaktere in NPC-Archiv-Einträge.
-- Der Originaldatensatz bleibt bestehen, damit Missionen, Logs und AP intakt bleiben.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-character-npc-conversions.sql

CREATE TABLE IF NOT EXISTS character_npc_conversions (
  character_id     INT PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  archive_entry_id INT NOT NULL UNIQUE REFERENCES archive_entries(id) ON DELETE CASCADE,
  original_status  TEXT NOT NULL CHECK (original_status IN ('retired', 'deceased')),
  converted_by     INT REFERENCES users(id) ON DELETE SET NULL,
  converted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
