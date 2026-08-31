-- Migration für PR #62 (claude/dialogues-characters-design-5n5o63 → master)
-- Gegen die Produktions-DB ausführen, nachdem der PR gemergt wurde. Identisch
-- zum entsprechenden Abschnitt in scripts/schema.sql.
--
-- Dieser PR führt das AP-Konto (Advancement Points) je Charakter ein: jede
-- Vergabe durch die Spielleitung und jede Ausgabe beim Steigern wird als
-- eigene Buchung festgehalten, der Kontostand ist ihre Summe.
--
-- Die Charakterwerte selbst (Attribute, Disziplinen, Talente, …) liegen
-- weiterhin in characters.metadata.stats (jsonb) und brauchen keine Migration.
--
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS, ein zweiter Lauf ändert nichts.

-- ---------------------------------------------------------------------------
-- character_ap_entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS character_ap_entries (
  id           SERIAL PRIMARY KEY,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  amount       INT NOT NULL CHECK (amount <> 0),
  reason       TEXT NOT NULL
                 CHECK (reason IN ('session', 'logbook', 'mission', 'manual', 'advancement')),
  note         TEXT,
  created_by   INT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_character_ap_entries_character
  ON character_ap_entries(character_id);
