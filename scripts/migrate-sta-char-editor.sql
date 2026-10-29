-- Offline-first STA Character Editor storage and sync API.
-- Apply once before deploying the static editor bundle/API:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-sta-char-editor.sql
-- Idempotent; existing LCARS character records are left untouched.

CREATE TABLE IF NOT EXISTS sta_editor_characters (
  character_id   UUID PRIMARY KEY,
  owner_user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility     TEXT NOT NULL CHECK (visibility IN ('private', 'campaign')),
  revision       BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0),
  data           JSONB NOT NULL,
  module_versions JSONB NOT NULL DEFAULT '{}',
  deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sta_editor_characters_owner
  ON sta_editor_characters(owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sta_editor_characters_campaign
  ON sta_editor_characters(updated_at DESC) WHERE visibility = 'campaign' AND deleted = FALSE;

CREATE TABLE IF NOT EXISTS sta_editor_modules (
  id             SERIAL PRIMARY KEY,
  module_id      TEXT NOT NULL,
  module_version TEXT NOT NULL,
  title          TEXT NOT NULL,
  scope          TEXT NOT NULL CHECK (scope IN ('private', 'campaign')),
  owner_user_id  INT REFERENCES users(id) ON DELETE CASCADE,
  is_active      BOOLEAN NOT NULL DEFAULT FALSE,
  pack           JSONB NOT NULL,
  created_by     INT REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((scope = 'campaign' AND owner_user_id IS NULL) OR
         (scope = 'private' AND owner_user_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sta_editor_modules_campaign_version
  ON sta_editor_modules(module_id, module_version) WHERE scope = 'campaign';
CREATE UNIQUE INDEX IF NOT EXISTS idx_sta_editor_modules_private_version
  ON sta_editor_modules(owner_user_id, module_id, module_version) WHERE scope = 'private';
CREATE UNIQUE INDEX IF NOT EXISTS idx_sta_editor_modules_one_active_campaign_version
  ON sta_editor_modules(module_id) WHERE scope = 'campaign' AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sta_editor_modules_campaign_lookup
  ON sta_editor_modules(module_id, is_active) WHERE scope = 'campaign';

CREATE TABLE IF NOT EXISTS sta_editor_changes (
  id             BIGSERIAL PRIMARY KEY,
  character_id   UUID NOT NULL,
  owner_user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility     TEXT NOT NULL CHECK (visibility IN ('private', 'campaign')),
  revision       BIGINT NOT NULL,
  data           JSONB NOT NULL,
  module_versions JSONB NOT NULL DEFAULT '{}',
  deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sta_editor_changes_cursor
  ON sta_editor_changes(id);
CREATE INDEX IF NOT EXISTS idx_sta_editor_changes_owner_cursor
  ON sta_editor_changes(owner_user_id, id);
CREATE INDEX IF NOT EXISTS idx_sta_editor_changes_campaign_cursor
  ON sta_editor_changes(id) WHERE visibility = 'campaign';

CREATE TABLE IF NOT EXISTS sta_editor_sync_ops (
  op_id          UUID PRIMARY KEY,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_hash   CHAR(64) NOT NULL,
  response       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sta_editor_sync_ops_created
  ON sta_editor_sync_ops(created_at);

-- Initial campaign module; versioned and editable only by publishing a new version.
INSERT INTO sta_editor_modules
  (module_id, module_version, title, scope, owner_user_id, is_active, pack)
VALUES (
  'sta2e.core', '1.0.0', 'Star Trek Adventures 2e – Grundmodul', 'campaign', NULL, TRUE,
  $$
  {
    "manifest":{"schemaVersion":1,"id":"sta2e.core","version":"1.0.0","title":"Star Trek Adventures 2e – Grundmodul","description":"Grundfelder und Regelmodus für Charaktere nach STA 2e."},
    "attributes":[{"id":"control","label":"Kontrolle"},{"id":"daring","label":"Wagemut"},{"id":"fitness","label":"Fitness"},{"id":"insight","label":"Einsicht"},{"id":"presence","label":"Präsenz"},{"id":"reason","label":"Verstand"}],
    "disciplines":[{"id":"command","label":"Kommando"},{"id":"conn","label":"Steuerung"},{"id":"engineering","label":"Technik"},{"id":"security","label":"Sicherheit"},{"id":"science","label":"Wissenschaft"},{"id":"medicine","label":"Medizin"}],
    "species":[{"id":"human","name":"Mensch"},{"id":"vulcan","name":"Vulkanier"},{"id":"andorian","name":"Andorianer"},{"id":"bajoran","name":"Bajoraner"},{"id":"betazoid","name":"Betazoid"},{"id":"denobulan","name":"Denobulaner"},{"id":"tellarite","name":"Tellarit"},{"id":"trill","name":"Trill"},{"id":"klingon","name":"Klingone"}],
    "professions":[],
    "creationRules":{"methods":["points","ap"],"defaultMethod":"points","limits":{"attributes":{"minimum":7,"maximum":12,"maximumAtMaximum":1,"maximumAtSecond":2},"disciplines":{"minimum":1,"maximum":5,"maximumAtMaximum":1,"maximumAtSecond":2}},"points":{"attributeBudget":56,"disciplineBudget":16},"freeCounts":{"values":4,"talents":4,"focuses":6},"ap":{"attributeBudget":320,"disciplineBudget":320,"apPerStep":10,"talentCost":20,"focusCost":20,"carryOverMax":10}}
  }
  $$::jsonb
)
ON CONFLICT DO NOTHING;
