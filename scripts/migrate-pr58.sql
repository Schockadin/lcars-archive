-- Migration für PR #58 (claude/page-guard-middleware-nchnxw → master)
-- Gegen die Produktions-DB (centerbeam) ausführen, nachdem der PR gemergt
-- wurde. Identisch zum entsprechenden Abschnitt in scripts/schema.sql.
--
-- Dieser PR vergrößert die RAG-Embedding-Vektoren von 512 auf die vollen 1536
-- Dimensionen von text-embedding-3-small (höhere Retrieval-Genauigkeit, siehe
-- src/lib/embeddings.ts: EMBEDDING_DIMENSIONS = 1536).
--
-- WICHTIG: Vektoren unterschiedlicher Dimension sind NICHT kompatibel, deshalb
-- lässt sich die Spalte nicht mit Bestandsdaten umtypisieren. Die bestehenden
-- 512er-Embeddings werden hier verworfen (TRUNCATE) und müssen anschließend
-- neu erzeugt werden:
--   Admin → RAG → „Embeddings erzeugen" (Voll-Backfill, idempotent)
--   oder per Skript:  npm run embed:all
-- Bis der Backfill gelaufen ist, liefert der Archiv-Assistent keine Treffer
-- (leerer Index) — der Backfill sollte also direkt nach dieser Migration
-- laufen.

-- ---------------------------------------------------------------------------
-- content_embeddings.embedding: vector(512) → vector(1536)
-- ---------------------------------------------------------------------------

-- 1. HNSW-Index abwerfen — er ist an die alte Dimension gebunden und würde die
--    Typänderung sonst blockieren.
DROP INDEX IF EXISTS idx_content_embeddings_vec;

-- 2. Bestandsdaten verwerfen (inkompatible Dimension, s.o.). Nach dem Backfill
--    wieder vollständig befüllt.
TRUNCATE content_embeddings;

-- 3. Spalte auf die volle Modell-Dimension umtypisieren.
ALTER TABLE content_embeddings
  ALTER COLUMN embedding TYPE vector(1536);

-- 4. Vektor-Index neu anlegen (identisch zu schema.sql).
CREATE INDEX IF NOT EXISTS idx_content_embeddings_vec
  ON content_embeddings USING hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- users.ui_mode
-- ---------------------------------------------------------------------------
-- UI-Modus der Oberfläche: 'lcars' (Default, volles LCARS-Design) oder
-- 'minimal' (schlankes, minimalistisches UI). Angemeldete Personen wählen den
-- Modus im Profil (/user). Bestandskonten erhalten per DEFAULT das unveränderte
-- LCARS-Interface. Kein CHECK (analog color_theme); unbekannte Werte fallen
-- App-seitig auf 'lcars' zurück.
ALTER TABLE users ADD COLUMN IF NOT EXISTS ui_mode TEXT NOT NULL
  DEFAULT 'lcars';
