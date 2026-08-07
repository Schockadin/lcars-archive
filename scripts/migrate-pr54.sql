-- Migration für PR #54 (claude/lcars-rag-system → master)
-- Gegen die Produktions-DB (centerbeam) ausführen, nachdem der PR gemergt
-- wurde. Alle Statements sind idempotent (IF NOT EXISTS / ON CONFLICT /
-- geschützte UPDATEs). Identisch zum entsprechenden Abschnitt in
-- scripts/schema.sql.
--
-- Dieser PR bringt das RAG-System („Fragen an den Kampagnen-Datenbestand"):
--   1) pgvector-Extension + neue Tabelle content_embeddings (Vektor-Index).
--   2) Neues Recht „rag.use" den bestehenden System-Rollen nachziehen.

-- ---------------------------------------------------------------------------
-- 1) pgvector + content_embeddings
-- ---------------------------------------------------------------------------
-- Vektor-Datentyp + Ähnlichkeits-Operatoren (u.a. <=> für Cosine-Distance).
-- Auf Railway (verwalteter Postgres) verfügbar, muss nur einmalig aktiviert
-- werden.
CREATE EXTENSION IF NOT EXISTS vector;

-- Ein Chunk pro Zeile mit Embedding (text-embedding-3-small, 512 Dim.) und
-- denormalisierten RBAC-Feldern (siehe scripts/schema.sql für die
-- ausführliche Begründung).
CREATE TABLE IF NOT EXISTS content_embeddings (
  id           BIGSERIAL PRIMARY KEY,
  content_type TEXT NOT NULL
                 CHECK (content_type IN (
                   'character', 'mission', 'mission_log',
                   'archive_entry', 'dialogue'
                 )),
  content_id   INT NOT NULL,
  chunk_index  INT NOT NULL,
  chunk_text   TEXT NOT NULL,
  embedding    vector(512) NOT NULL,
  visibility   TEXT NOT NULL DEFAULT 'public'
                 CHECK (visibility IN ('private', 'gm', 'public')),
  owner_id     INT,
  is_draft     BOOLEAN NOT NULL DEFAULT false,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  title        TEXT,
  slug         TEXT,
  href         TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (content_type, content_id, chunk_index)
);
-- Cosine-Distance-Suche über HNSW. Falls die installierte pgvector-Version
-- kein HNSW kann, kann dieser eine Index entfallen (die Query läuft dann als
-- seq scan, beim kleinen Korpus unkritisch).
CREATE INDEX IF NOT EXISTS idx_content_embeddings_vec
  ON content_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_rbac
  ON content_embeddings(is_active, visibility);

-- ---------------------------------------------------------------------------
-- 2) Neues Recht „rag.use" den System-Rollen nachziehen
-- ---------------------------------------------------------------------------
-- rag.use ist ein reiner String-Wert in roles.permissions — keine
-- Schema-Änderung nötig. ensureSystemRoles() (src/lib/roles.ts) seedet neue
-- Rollen nur per ON CONFLICT DO NOTHING und rührt bestehende Rechte nicht an;
-- deshalb wird das Recht hier für die bereits existierenden System-Rollen
-- idempotent nachgezogen (nur anhängen, wenn noch nicht vorhanden — gleiche
-- Schutz-Bedingung wie beim db-admin-Backfill in migrate-pr53.sql, damit ein
-- über /admin/permissions bewusst entzogenes Recht nicht wiederkehrt … außer
-- man führt diese einmalige Migration erneut aus).
UPDATE roles
  SET permissions = array_append(permissions, 'rag.use')
  WHERE key IN ('viewer', 'player', 'gm', 'admin', 'db-admin')
    AND NOT ('rag.use' = ANY(permissions));
