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

-- ---------------------------------------------------------------------------
-- 6) Versionshistorie der Inhaltstexte (identisch zu schema.sql).
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- content_revisions
-- ---------------------------------------------------------------------------
-- Versionshistorie der Inhaltstexte (Charaktere, Missionen, Logbücher,
-- Datenbank-Einträge). Vor jedem Überschreiben legt recordRevision() den
-- BISHERIGEN Stand hier ab — eine Zeile ist damit „so sah es vor dieser
-- Bearbeitung aus", genau das, was man zum Zurückholen braucht.
--
-- Nur Titel + Quelltext: das gerenderte HTML entsteht beim Wiederherstellen
-- neu, und Stammdaten (Status, Tags, Sichtbarkeit) haben eigene Formulare.
-- Verknüpfung wie content_notes ohne Fremdschlüssel auf die vier
-- Inhaltstabellen; Aufräumen übernimmt purgeContent.ts. Je Inhalt werden die
-- jüngsten REVISION_KEEP Fassungen aufgehoben (siehe contentRevisions.ts).
CREATE TABLE IF NOT EXISTS content_revisions (
  id           SERIAL PRIMARY KEY,
  content_type TEXT NOT NULL
                 CHECK (content_type IN ('character', 'mission', 'mission_log', 'archive')),
  content_id   INT  NOT NULL,
  title        TEXT,
  source_md    TEXT NOT NULL,
  -- Wer die ersetzende Bearbeitung ausgelöst hat. ON DELETE SET NULL: die
  -- Fassung bleibt erhalten, auch wenn das Konto später gelöscht wird.
  editor_id    INT  REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_revisions_target
  ON content_revisions(content_type, content_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 7) Schwerpunkt-Katalog (identisch zu schema.sql). Nach der Migration
--    einmal `npm run db:seed-focuses` laufen lassen, damit die Liste aus
--    dem Regeltext drinsteht — ohne sie ist die Auswahl leer.
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- focuses
-- ---------------------------------------------------------------------------
-- Schwerpunkt-Katalog (Focuses), gepflegt unter /gm/focuses. Aufgebaut wie
-- talents: Startdaten aus dem Regeltext (scripts/seed/focuses.json), von der
-- Spielleitung ergänzbar (is_custom).
--
-- UNIQUE über (name, discipline) statt nur über den Namen: der Regeltext
-- führt sechs Schwerpunkte in ZWEI Disziplinen („Astrophysics" bei Conn und
-- Science, „Survival" bei Conn und Security, …). Auf dem Bogen steht davon
-- nur der Name — dort sind es dieselben, und alles, was „schon eingetragen"
-- prüft, vergleicht deshalb über den Namen (siehe focusKey in
-- focusCatalog.ts).
CREATE TABLE IF NOT EXISTS focuses (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  discipline  TEXT NOT NULL
                CHECK (discipline IN ('command', 'conn', 'engineering',
                                      'security', 'science', 'medicine')),
  description TEXT,
  is_custom   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, discipline)
);
CREATE INDEX IF NOT EXISTS idx_focuses_discipline ON focuses(discipline);

-- ---------------------------------------------------------------------------
-- 8) Eigene Regeln der Runde für den Spickzettel (identisch zu schema.sql).
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- campaign_rules
-- ---------------------------------------------------------------------------
-- Eigene Regeln der Runde (Hausregeln), gepflegt unter /gm/rules. Sie
-- erscheinen auf jedem Spickzettel (Blatt 2 des Charakterbogens) hinter den
-- Kernregeln aus dem Regelwerk.
--
-- Anders als Talente und Schwerpunkte hängen sie an keinem Charakter: sie
-- gelten für die ganze Kampagne. Deshalb auch keine Kategorie — nur Name,
-- Text und eine Reihenfolge, in der die Spielleitung sie sortiert
-- (sort_order, bei Gleichstand nach Name).
CREATE TABLE IF NOT EXISTS campaign_rules (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  body        TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_by  INT  REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 9) Chronologie: abgeleitete Ereignisse (identisch zu schema.sql).
-- ---------------------------------------------------------------------------
-- Die Tabelle timeline_events gibt es seit PR #27; sie lag brach, seit die
-- frühere Timeline-Seite entfernt wurde. Mit der Chronologie (/chronologie)
-- ist sie wieder in Gebrauch — allerdings NUR noch für die vom Sprachmodell
-- abgeleiteten Ereignisse (siehe src/lib/timelineInference.ts). Alles, was
-- sich aus den Feldern eines Inhalts oder aus einem <!-- timeline: … -->-
-- Marker ergibt, wird beim Lesen aus den Inhalten selbst gebildet und
-- NICHT gespeichert: gespeicherte Kopien liefen bei jeder Bearbeitung
-- auseinander.
--
-- Deshalb drei neue Spalten und eine gelockerte Altlast:
--   origin      — woher das Ereignis stammt (hier immer 'inferred')
--   detail      — ein bis zwei Sätze zum Ereignis, vom Modell formuliert
--   confidence  — wie sicher sich das Modell war (0…1), nur zur Anzeige
--   href        — bekommt eine Vorgabe, weil er sich jetzt aus source_type
--                 und source_slug ergibt statt beim Schreiben mitgeliefert
--                 zu werden.
ALTER TABLE timeline_events
  ADD COLUMN IF NOT EXISTS origin     TEXT NOT NULL DEFAULT 'inferred',
  ADD COLUMN IF NOT EXISTS detail     TEXT,
  ADD COLUMN IF NOT EXISTS confidence REAL,
  ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE timeline_events ALTER COLUMN href SET DEFAULT '';

-- Ein Inhalt soll dasselbe Ereignis nicht doppelt bekommen, wenn die
-- Spielleitung die Ableitung zweimal laufen lässt.
CREATE UNIQUE INDEX IF NOT EXISTS idx_timeline_events_unique
  ON timeline_events(source_type, source_slug, event_date, title);
