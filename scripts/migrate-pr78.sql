-- Migration für PR #78 (claude/input-fields-session-storage-teim80 → master)
--
-- WICHTIG: Gegen die Datenbank ausführen, BEVOR der Stand ausgeliefert wird —
-- die Deploy-Preview hängt an derselben Datenbank wie die Produktion. Fehlt
-- die Migration, scheitert jedes Schreiben ins Fehler-Log (der Aufruf ist in
-- try/catch gekapselt, es gibt also keine 500er — aber das Protokoll bliebe
-- still leer, und genau darauf verlässt man sich im Fehlerfall).
--
-- Dieser PR gibt jedem Eintrag im Fehler-Log seine Herkunft mit: Welche
-- App-Version, welcher Netlify-Kontext ('production', 'deploy-preview #78',
-- 'branch-deploy (x)') und welcher Commit den Fehler geworfen haben
-- (zusammengestellt in src/lib/deployInfo.ts, geschrieben in
-- src/lib/errorLog.ts).
--
-- Anlass: Netlify hält jeden früheren Deploy unter seinem Permalink und jede
-- Deploy-Preview dauerhaft erreichbar, und diese alten Lambdas sprechen mit
-- derselben Live-Datenbank. Deren Fehler landen ununterscheidbar neben den
-- echten im selben error_logs — so entstanden nach PR #71 die Einträge
-- „column "visibility" does not exist" auf „/": aus Builds, die noch auf
-- die dort entfernte Spalte filterten.
--
-- Rein additiv und nullable (Altbestand hat die Angaben nicht), damit auch
-- ein noch laufender älterer Build weiter schreiben kann.
--
-- Identisch zum entsprechenden Abschnitt in scripts/schema.sql.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr78.sql

ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS app_version    TEXT;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS deploy_context TEXT;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS commit_ref     TEXT;
