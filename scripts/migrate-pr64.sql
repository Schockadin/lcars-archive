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
