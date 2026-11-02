-- Activatable campaign rule modules and editable module definitions.
-- Apply with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr117.sql
CREATE TABLE IF NOT EXISTS campaign_rule_modules (
  id          TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  definition  JSONB NOT NULL,
  updated_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
