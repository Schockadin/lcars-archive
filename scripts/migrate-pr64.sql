-- Migration für PR #64 (claude/dialogues-characters-design-5n5o63 → master)
-- Gegen die Produktions-DB ausführen, nachdem der PR gemergt wurde. Identisch
-- zum entsprechenden Abschnitt in scripts/schema.sql (Struktur) plus der
-- einmaligen Datenmigration der Alt-Werte.
--
-- Dieser PR entkoppelt Hell/Dunkel vom UI-Modus: „hell" ist keine Variante des
-- minimalistischen UIs mehr (ui_mode='minimal-light'), sondern eine eigene
-- Achse (users.color_mode = 'dark' | 'light'). Zusätzlich lassen sich
-- Hintergrund- und Schriftfarbe frei überschreiben — das nutzt die bereits
-- vorhandene Spalte users.theme_overrides und braucht KEINE Schemaänderung.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS; die UPDATEs sind nach dem ersten Lauf
-- wirkungslos (es gibt dann keine 'minimal-light'-Zeilen mehr).

-- ---------------------------------------------------------------------------
-- 1) Neue Spalte: Hell/Dunkel-Modus (Default dunkel)
-- ---------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS color_mode TEXT NOT NULL
  DEFAULT 'dark';

-- ---------------------------------------------------------------------------
-- 2) Bestandskonten mit hellem Minimal-UI verlustfrei übertragen:
--    ui_mode='minimal-light'  ⇒  ui_mode='minimal' + color_mode='light'.
--    Reihenfolge: erst color_mode setzen (solange die Zeilen noch am alten
--    Wert erkennbar sind), dann ui_mode normalisieren.
-- ---------------------------------------------------------------------------
UPDATE users SET color_mode = 'light' WHERE ui_mode = 'minimal-light';
UPDATE users SET ui_mode = 'minimal' WHERE ui_mode = 'minimal-light';

-- ---------------------------------------------------------------------------
-- 3) Admin-kuratierte „Neue Funktionen": vom Admin unter /admin/changelog
--    gewählte Changelog-Versionen, die auf dem Dashboard gesammelt erscheinen.
--    JSONB-Array von „Major.Minor"-Strings; NULL = Default (nur jüngste).
-- ---------------------------------------------------------------------------
ALTER TABLE campaign_settings
  ADD COLUMN IF NOT EXISTS changelog_featured_versions JSONB;

-- ---------------------------------------------------------------------------
-- 4) Volltextsuche: tsvector-Spalten + GIN-Indizes (identisch zu schema.sql).
--    Idempotent (ADD COLUMN / CREATE INDEX IF NOT EXISTS). Die Spalten sind
--    GENERATED — Postgres füllt sie beim Anlegen einmalig selbst, es ist kein
--    Backfill nötig.
-- ---------------------------------------------------------------------------
ALTER TABLE characters ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('german', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('german', coalesce(source_md, bio, '')), 'B') ||
    setweight(to_tsvector('german', coalesce(species, '') || ' ' || coalesce(rank, '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_characters_fts ON characters USING GIN (search_vector);

ALTER TABLE missions ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('german', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('german', coalesce(source_md, '')), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_missions_fts ON missions USING GIN (search_vector);

ALTER TABLE mission_logs ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('german', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('german', coalesce(source_md, content, '')), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_mission_logs_fts ON mission_logs USING GIN (search_vector);

ALTER TABLE archive_entries ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('german', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('german', coalesce(source_md, content, '')), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_archive_fts ON archive_entries USING GIN (search_vector);

-- Titel-only-Vektor: die Live-Suche (Header-Dropdown) vergleicht bewusst NUR
-- Titel/Namen — mit dem vollen search_vector würde sie plötzlich auch
-- Fließtext treffen und ein anderes Verhalten zeigen als bisher. Eigene
-- Spalte statt einer Berechnung zur Laufzeit, damit auch die Live-Suche über
-- einen Index läuft.
ALTER TABLE characters ADD COLUMN IF NOT EXISTS title_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('german', coalesce(name, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_characters_title_fts ON characters USING GIN (title_vector);

ALTER TABLE missions ADD COLUMN IF NOT EXISTS title_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('german', coalesce(title, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_missions_title_fts ON missions USING GIN (title_vector);

ALTER TABLE mission_logs ADD COLUMN IF NOT EXISTS title_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('german', coalesce(title, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_mission_logs_title_fts ON mission_logs USING GIN (title_vector);

ALTER TABLE archive_entries ADD COLUMN IF NOT EXISTS title_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('german', coalesce(title, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_archive_title_fts ON archive_entries USING GIN (title_vector);
