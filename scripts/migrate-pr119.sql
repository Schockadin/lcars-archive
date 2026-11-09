-- Statistik-Dashboard: protokollierte Inhaltsaufrufe
--
-- Idempotent; kann auf bestehenden Installationen einmal manuell angewandt
-- werden. Neue Datenbanken erhalten dieselbe Tabelle aus schema.sql.
CREATE TABLE IF NOT EXISTS content_view_events (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type  TEXT NOT NULL CHECK (content_type IN (
                  'character', 'mission', 'mission_log', 'archive_entry'
                )),
  content_slug  TEXT NOT NULL,
  content_title TEXT NOT NULL,
  route_path    TEXT NOT NULL,
  viewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_view_events_viewed_at
  ON content_view_events(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_view_events_user_time
  ON content_view_events(user_id, viewed_at DESC);
