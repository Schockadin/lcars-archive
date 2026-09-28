ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS mission_session_number INTEGER;

ALTER TABLE planned_sessions
  ADD COLUMN IF NOT EXISTS mission_id INTEGER REFERENCES missions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mission_session_number INTEGER;

WITH numbered AS (
  SELECT gs.id, ROW_NUMBER() OVER (
    PARTITION BY gs.mission_id ORDER BY gs.session_date, gs.id
  )::INTEGER AS mission_session_number,
  m.title AS mission_title
  FROM game_sessions gs
  JOIN missions m ON m.id = gs.mission_id
  WHERE gs.mission_id IS NOT NULL
)
UPDATE game_sessions gs
SET mission_session_number = numbered.mission_session_number,
    title = numbered.mission_title || ' ' || numbered.mission_session_number
FROM numbered
WHERE gs.id = numbered.id;

UPDATE planned_sessions ps
SET mission_id = gs.mission_id,
    mission_session_number = gs.mission_session_number,
    title = m.title || ' ' || gs.mission_session_number
FROM game_sessions gs
JOIN missions m ON m.id = gs.mission_id
WHERE ps.game_session_id = gs.id
  AND gs.mission_session_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_game_sessions_mission_number
  ON game_sessions (mission_id, mission_session_number)
  WHERE mission_id IS NOT NULL AND mission_session_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_planned_sessions_mission_number
  ON planned_sessions (mission_id, mission_session_number)
  WHERE mission_id IS NOT NULL AND mission_session_number IS NOT NULL;
