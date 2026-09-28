-- Migration für PR #100: Sessions Missions zuordnen und Missionschroniken
-- automatisch aus Zusammenfassungsblöcken aufbauen.
--
-- Vor dem Deploy auf der Railway-Datenbank ausführen:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr100.sql
--
-- Idempotent: Spalten und Indizes werden nur ergänzt, fehlende Sessionnummern
-- werden einmalig vergeben und vorhandene Missions-Synopsen nur übernommen,
-- wenn die Mission noch keine Synopsis-Blöcke hat.

BEGIN;

ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS mission_id INT REFERENCES missions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mission_session_number INTEGER;

ALTER TABLE planned_sessions
  ADD COLUMN IF NOT EXISTS mission_id INTEGER REFERENCES missions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mission_session_number INTEGER;

CREATE TABLE IF NOT EXISTS mission_synopsis_blocks (
  id          SERIAL PRIMARY KEY,
  mission_id  INT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  session_id  INT REFERENCES game_sessions(id) ON DELETE CASCADE,
  block_order INT NOT NULL DEFAULT 0,
  ingame_date DATE NOT NULL,
  end_date    DATE,
  body_md     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= ingame_date)
);

CREATE INDEX IF NOT EXISTS idx_mission_synopsis_blocks_chronology
  ON mission_synopsis_blocks (mission_id, ingame_date DESC, end_date DESC, id);
CREATE INDEX IF NOT EXISTS idx_mission_synopsis_blocks_session
  ON mission_synopsis_blocks (session_id);

-- Alte, manuell gepflegte Missions-Synopsen als ersten Chronikblock bewahren.
INSERT INTO mission_synopsis_blocks
  (mission_id, session_id, block_order, ingame_date, body_md)
SELECT m.id, NULL, 0, COALESCE(m.started_at, m.created_at::date), m.source_md
FROM missions AS m
WHERE NULLIF(BTRIM(m.source_md), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM mission_synopsis_blocks AS b
    WHERE b.mission_id = m.id
  );

-- Bereits gespielte Sessions erhalten je Mission eine fortlaufende Nummer.
-- Explizit vorhandene Nummern und benutzerdefinierte Titel bleiben unangetastet.
WITH existing_numbers AS (
  SELECT mission_id, MAX(mission_session_number) AS max_number
  FROM game_sessions
  WHERE mission_id IS NOT NULL
    AND mission_session_number IS NOT NULL
  GROUP BY mission_id
), numbered AS (
  SELECT
    gs.id,
    gs.mission_id,
    COALESCE(en.max_number, 0) + ROW_NUMBER() OVER (
      PARTITION BY gs.mission_id
      ORDER BY gs.session_date, gs.id
    ) AS session_number
  FROM game_sessions AS gs
  LEFT JOIN existing_numbers AS en ON en.mission_id = gs.mission_id
  WHERE gs.mission_id IS NOT NULL
    AND gs.mission_session_number IS NULL
)
UPDATE game_sessions AS gs
SET mission_session_number = numbered.session_number,
    title = CASE
      WHEN NULLIF(BTRIM(gs.title), '') IS NULL
        THEN m.title || ' ' || numbered.session_number
      ELSE gs.title
    END
FROM numbered
JOIN missions AS m ON m.id = numbered.mission_id
WHERE gs.id = numbered.id;

-- Geplante Termine, die bereits aus einer gespielten Session entstanden sind,
-- übernehmen deren Missionszuordnung und Nummer, sofern die Felder noch leer
-- sind. Ein vorhandener Terminname bleibt erhalten.
UPDATE planned_sessions AS ps
SET mission_id = COALESCE(ps.mission_id, gs.mission_id),
    mission_session_number = COALESCE(
      ps.mission_session_number,
      CASE
        WHEN gs.mission_session_number IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM planned_sessions AS other
            WHERE other.mission_id = gs.mission_id
              AND other.mission_session_number = gs.mission_session_number
              AND other.id <> ps.id
          )
          THEN gs.mission_session_number
        ELSE NULL
      END
    ),
    title = CASE
      WHEN NULLIF(BTRIM(ps.title), '') IS NULL
        THEN m.title || ' ' || COALESCE(gs.mission_session_number, 1)
      ELSE ps.title
    END
FROM game_sessions AS gs
JOIN missions AS m ON m.id = gs.mission_id
WHERE ps.game_session_id = gs.id
  AND (ps.mission_id IS NULL OR ps.mission_session_number IS NULL
       OR NULLIF(BTRIM(ps.title), '') IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS idx_game_sessions_mission_number
  ON game_sessions (mission_id, mission_session_number)
  WHERE mission_id IS NOT NULL AND mission_session_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_planned_sessions_mission_number
  ON planned_sessions (mission_id, mission_session_number)
  WHERE mission_id IS NOT NULL AND mission_session_number IS NOT NULL;

COMMIT;
