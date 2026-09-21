-- Migration für PR #86 (claude/timeline-event-button-editors-ne7aq7 → master)
--
-- WICHTIG: Gegen die Datenbank ausführen, BEVOR der Stand ausgeliefert wird —
-- die Deploy-Preview hängt an derselben Datenbank wie die Produktion. Fehlt
-- die Spalte, scheitert jeder Aufruf des Dashboards und des Profils mit
-- „column "dashboard_prefs" does not exist" (sie steht in USER_COLUMNS und
-- wird damit bei jedem Laden eines Users mitgelesen).
--
-- Dieser PR macht das Dashboard konfigurierbar: Unter /user lässt sich je
-- Sektion einstellen, ob sie auf der Startseite erscheint, und die eigenen
-- Charaktere lassen sich einzeln zeigen oder ausblenden
-- (src/lib/dashboardSections.ts, src/app/user/DashboardSettingsForm.tsx).
--
-- Reine Struktur-Anlage, kein datenveränderndes UPDATE: '{}' bedeutet „alles
-- wie vorgegeben". Bestandskonten sehen damit genau die Vorgaben — News,
-- Spielabende, offene Gespräche, die beiden Anlege-Knöpfe und die eigenen
-- Charaktere an; Erste Schritte, To Dos, Versionen und Lesezeichen aus.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr86.sql
--
-- Idempotent (IF NOT EXISTS) — ein zweiter Lauf ändert nichts.

ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_prefs JSONB NOT NULL
  DEFAULT '{}';
