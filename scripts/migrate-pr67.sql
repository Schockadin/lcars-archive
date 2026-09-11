-- Migration für PR #67 (claude/code-audit-n934zq → master)
--
-- WICHTIG: Gegen die Datenbank ausführen, BEVOR der Stand ausgeliefert wird —
-- die Deploy-Preview hängt an derselben Datenbank wie die Produktion. Fehlt
-- die neue Tabelle, antwortet /api/rag mit 500, sobald jemand eine Frage
-- stellt.
--
-- Dieser PR setzt die Befunde des Code-Audits um. Schemaseitig betrifft das
-- nur einen Punkt: Das Ratelimit des Datenbank-Assistenten lag bisher in
-- einer Map im Modulscope der Route. Auf serverless hat jede Funktionsinstanz
-- ihre eigene — das Limit skalierte damit mit der Instanzzahl mit, statt zu
-- bremsen, obwohl am anderen Ende ein abrechnender Anbieter hängt. Der Zähler
-- zieht deshalb in die Datenbank, nach demselben Muster wie login_attempts
-- und password_reset_requests.
--
-- Identisch zum entsprechenden Abschnitt in scripts/schema.sql.
--
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS, mehrfaches Ausführen ist
-- wirkungslos.

CREATE TABLE IF NOT EXISTS rag_requests (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_requests_user_time ON rag_requests(user_id, requested_at);
