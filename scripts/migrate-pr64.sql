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

-- ---------------------------------------------------------------------------
-- 5) Notizen und Kommentare an Inhalten (identisch zu schema.sql).
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- content_notes
-- ---------------------------------------------------------------------------
-- Notizen und Kommentare an Inhalten (Charaktere, Missionen, Logbücher,
-- Datenbank-Einträge). EINE Tabelle für beide Anwendungsfälle, unterschieden
-- über visibility:
--   'private' → nur der Autor sieht sie (persönliche Notiz am Eintrag)
--   'group'   → alle eingeloggten Personen sehen sie (Diskussion)
-- Eine zweite Tabelle brächte nichts: Speicherung, Rechte und Anzeige sind
-- identisch, nur der Sichtbarkeitsfilter unterscheidet sich.
--
-- Verknüpfung über (content_type, content_slug) statt per Fremdschlüssel: die
-- vier Inhaltsarten liegen in vier Tabellen, und der Slug ist der Schlüssel,
-- mit dem im Projekt ohnehin überall verlinkt wird (siehe content_follows,
-- das genauso aufgebaut ist). Aufräumen beim Löschen von Inhalten übernimmt
-- purgeContent.ts.
CREATE TABLE IF NOT EXISTS content_notes (
  id           SERIAL PRIMARY KEY,
  content_type TEXT NOT NULL
                 CHECK (content_type IN ('character', 'mission', 'mission_log', 'archive')),
  content_slug TEXT NOT NULL,
  author_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  visibility   TEXT NOT NULL DEFAULT 'private'
                 CHECK (visibility IN ('private', 'group')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_notes_target
  ON content_notes(content_type, content_slug);
CREATE INDEX IF NOT EXISTS idx_content_notes_author ON content_notes(author_id);
