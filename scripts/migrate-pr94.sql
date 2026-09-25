-- Migration für PR #94: reversible Umwandlung inaktiver/verstorbener
-- Charaktere in NPC-Archiv-Einträge.
--
-- Die Zuordnung speichert den Ursprungsstatus und den erzeugten NPC-Eintrag,
-- damit ein Owner die Umwandlung rückgängig machen kann. Die Tabelle wird
-- außerdem in src/lib/dbTables.ts als Backup-Tabelle geführt.
--
-- Vor dem Deploy ausführen:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr94.sql
--
-- Idempotent: ein erneuter Lauf ändert ein bereits aktuelles Schema nicht.

BEGIN;

CREATE TABLE IF NOT EXISTS character_npc_conversions (
  character_id     INT PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  archive_entry_id INT NOT NULL UNIQUE REFERENCES archive_entries(id) ON DELETE CASCADE,
  original_status  TEXT NOT NULL CHECK (original_status IN ('retired', 'deceased')),
  converted_by     INT REFERENCES users(id) ON DELETE SET NULL,
  converted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
