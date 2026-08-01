-- Migration für PR #53 (claude/project-codereview-optimizations → master)
-- Gegen die Produktions-DB (centerbeam) ausführen, nachdem der PR gemergt wurde.
-- Alle Statements sind idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING).
--
-- Dieser PR bringt DREI datenbankseitige Änderungen mit; alles andere
-- (feinere DB-Rechte als String-Werte, Dialog-Sortierung, UI/Mobile-Fixes, der
-- neue SQL-Executor, das ER-Diagramm, der Asset-Bucket, der Portrait-Upload)
-- kommt ohne Schema-Änderung aus:
--   1) pg_trgm-Extension + GIN-Trigramm-Indizes für die Suche (v1.18.3).
--   2) Seed der neuen System-Rolle „db-admin" in der roles-Tabelle (v1.18.9).
--   3) Neue Tabelle character_sheets für Charakterbögen (PDFs) (v1.18.19).

-- ---------------------------------------------------------------------------
-- 1) Suche: pg_trgm + Trigramm-GIN-Indizes
-- ---------------------------------------------------------------------------
-- Die Suche (src/lib/search.ts) arbeitet mit ILIKE '%q%'. Ein solches Muster
-- mit führendem Platzhalter kann KEINEN B-Tree-Index nutzen (nur seq scan);
-- ein GIN-Trigramm-Index (gin_trgm_ops) dagegen schon. Auf verwalteten
-- Postgres-Diensten (Neon/Supabase) ist pg_trgm vorhanden.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Hinweis: Der Aufbau eines GIN-Index sperrt Schreibzugriffe auf die jeweilige
-- Tabelle für die Dauer des Builds. Bei der geringen Datenmenge dieses
-- Archivs unkritisch. Auf sehr großen Tabellen stattdessen
-- „CREATE INDEX CONCURRENTLY …" (dann NICHT innerhalb einer Transaktion) nutzen.
CREATE INDEX IF NOT EXISTS idx_characters_name_trgm     ON characters    USING GIN (name    gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_missions_title_trgm       ON missions      USING GIN (title   gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mission_logs_title_trgm    ON mission_logs  USING GIN (title   gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mission_logs_content_trgm  ON mission_logs  USING GIN (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_archive_title_trgm         ON archive_entries USING GIN (title   gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_archive_content_trgm       ON archive_entries USING GIN (content gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 2) Neue System-Rolle „db-admin"
-- ---------------------------------------------------------------------------
-- Vier neue Rechte (sql_read, sql_write, sql_delete, db_backup) sind reine
-- String-Werte in roles.permissions bzw. users.permission_overrides — dafür ist
-- KEINE Schema-Änderung nötig. Neu ist nur die gebündelte System-Rolle.
--
-- Rechte-Set entspricht DEFAULT_ROLE_PRESETS['db-admin'] in
-- src/lib/permissions.ts (Basis content.follow/users.browse + die vier
-- DB-Rechte). ON CONFLICT DO NOTHING: eine bereits (evtl. über
-- /admin/permissions) angepasste Zeile bleibt unangetastet — gefahrlos
-- wiederholbar. (Die Anwendung seedet die Rolle beim nächsten Lauf ohnehin über
-- ensureSystemRoles(); dieser INSERT nimmt das nur vorweg.)
INSERT INTO roles (key, label, description, permissions, is_system, sort_order) VALUES
  ('db-admin', 'Datenbank-Admin', 'Datenbank-Bereich: SQL-Abfragen und Backups.',
   '{content.follow,users.browse,sql_read,sql_write,sql_delete,db_backup}', TRUE, 15)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Charakterbögen: neue Tabelle character_sheets
-- ---------------------------------------------------------------------------
-- Metadaten je hochgeladenem Charakterbogen (PDF); die Bytes liegen im
-- öffentlichen Asset-Bucket (Präfix character-sheets/, siehe
-- src/lib/characterSheets.ts). ON DELETE CASCADE: ein Bogen gehört genau einem
-- Charakter und verschwindet mit ihm (die R2-Objekte räumt purgeContent.ts vor
-- dem endgültigen Löschen ab). Identisch zu scripts/schema.sql, idempotent.
CREATE TABLE IF NOT EXISTS character_sheets (
  id           SERIAL PRIMARY KEY,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  r2_key       TEXT UNIQUE NOT NULL,
  file_name    TEXT NOT NULL,
  size_bytes   INT NOT NULL,
  uploaded_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_character_sheets_character ON character_sheets(character_id);

-- ---------------------------------------------------------------------------
-- OPTIONAL: Bestehenden Admins den Zugang zu /admin/db erhalten
-- ---------------------------------------------------------------------------
-- Ab diesem PR ist /admin/db nur noch mit mindestens einem DB-Recht zugänglich
-- (requireDbAccess) — ein reiner Admin OHNE eines der neuen DB-Rechte verliert
-- den Zugang, bis ihm die Rolle „db-admin" zugewiesen wird (bewusst getrenntes,
-- orthogonales Rechte-Modell, siehe PR-Beschreibung Punkt 8).
--
-- Wer den Bestand NICHT aussperren will, kann das folgende (auskommentierte)
-- verhaltenswahrende Backfill ausführen: es hängt allen Accounts mit
-- admin.access die Zusatzrolle „db-admin" an (idempotent). Standardmäßig
-- deaktiviert, damit das striktere Modell gilt; zum Aktivieren die Zeilen
-- einkommentieren.
--
-- UPDATE users
--   SET additional_roles = array_append(additional_roles, 'db-admin')
--   WHERE (role = 'admin' OR 'admin' = ANY(additional_roles))
--     AND NOT ('db-admin' = ANY(additional_roles));
