CREATE TABLE IF NOT EXISTS mission_synopsis_blocks (
  id           SERIAL PRIMARY KEY,
  mission_id   INT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  session_id   INT REFERENCES game_sessions(id) ON DELETE CASCADE,
  block_order  INT NOT NULL DEFAULT 0,
  ingame_date  DATE NOT NULL,
  end_date     DATE,
  body_md      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= ingame_date)
);

CREATE INDEX IF NOT EXISTS idx_mission_synopsis_blocks_chronology
  ON mission_synopsis_blocks(mission_id, ingame_date DESC, end_date DESC, id);
CREATE INDEX IF NOT EXISTS idx_mission_synopsis_blocks_session
  ON mission_synopsis_blocks(session_id);

-- Bestehende handgepflegte Synopsen bleiben als eingefrorener erster Block
-- erhalten. Künftige Änderungen kommen ausschließlich aus Session-Blöcken.
INSERT INTO mission_synopsis_blocks
  (mission_id, session_id, block_order, ingame_date, body_md)
SELECT m.id, NULL, 0, COALESCE(m.started_at, m.created_at::date), m.source_md
FROM missions m
WHERE NULLIF(BTRIM(m.source_md), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM mission_synopsis_blocks b WHERE b.mission_id = m.id
  );
