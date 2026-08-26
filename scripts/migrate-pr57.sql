-- Migration für PR #57 (claude/user-color-themes → master)
-- Gegen die Produktions-DB (centerbeam) ausführen, nachdem der PR gemergt
-- wurde. Alle Statements sind idempotent (IF NOT EXISTS). Identisch zum
-- entsprechenden Abschnitt in scripts/schema.sql.
--
-- Dieser PR bringt nutzer-wählbare LCARS-Farbthemes: jede angemeldete Person
-- kann in ihrem Profil (/user) ein Farbschema wählen, das gespeichert bleibt
-- und die Oberfläche einfärbt (siehe src/lib/themes.ts,
-- src/styles/lcars-themes.css).

-- ---------------------------------------------------------------------------
-- users.color_theme
-- ---------------------------------------------------------------------------
-- Gewähltes Farbtheme (freier String, App-seitig gegen COLOR_THEMES
-- validiert). Bewusst OHNE CHECK, damit neue Themes ohne weitere Migration
-- hinzukommen können; unbekannte Werte fallen in der App auf 'standard'
-- zurück. Bestandskonten erhalten per DEFAULT das unveränderte
-- DS9/VOY-Interface ('standard').
ALTER TABLE users ADD COLUMN IF NOT EXISTS color_theme TEXT NOT NULL
  DEFAULT 'standard';
