-- Migration für PR #62 (claude/dialogues-characters-design-5n5o63 → master)
-- Gegen die Produktions-DB ausführen, nachdem der PR gemergt wurde. Identisch
-- zum entsprechenden Abschnitt in scripts/schema.sql.
--
-- Dieser PR führt das AP-Konto (Advancement Points) je Charakter ein: jede
-- Vergabe durch die Spielleitung und jede Ausgabe beim Steigern wird als
-- eigene Buchung festgehalten, der Kontostand ist ihre Summe.
--
-- Die Charakterwerte selbst (Attribute, Disziplinen, Talente, …) liegen
-- weiterhin in characters.metadata.stats (jsonb) und brauchen keine Migration.
--
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS, ein zweiter Lauf ändert nichts.

-- ---------------------------------------------------------------------------
-- character_ap_entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS character_ap_entries (
  id           SERIAL PRIMARY KEY,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  amount       INT NOT NULL CHECK (amount <> 0),
  reason       TEXT NOT NULL
                 CHECK (reason IN ('session', 'logbook', 'mission', 'manual', 'advancement')),
  note         TEXT,
  created_by   INT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_character_ap_entries_character
  ON character_ap_entries(character_id);

-- ---------------------------------------------------------------------------
-- Talente, Sessions und konfigurierbares AP-Regelwerk
-- ---------------------------------------------------------------------------
-- Nach dem Ausführen dieser Migration einmalig `npm run db:seed-talents`
-- laufen lassen — das spielt den Talent-Katalog aus scripts/seed/talents.json
-- ein (idempotent, vorhandene Talente bleiben unverändert).

-- ---------------------------------------------------------------------------
-- talents
-- ---------------------------------------------------------------------------
-- Talent-Katalog der Runde (src/lib/talents.ts + talentCatalog.ts). Die
-- Startdaten stammen aus dem Regeltext und liegen als scripts/seed/talents.json
-- im Repo; eingespielt werden sie mit `npm run db:seed-talents` (idempotent).
-- Die Spielleitung pflegt den Katalog danach unter /gm/talents, die
-- Charakterbögen nutzen ihn als Auswahlliste.
--
-- name ist eindeutig: die Auswahlliste speichert am Charakter den reinen
-- Namen (characters.metadata.stats.talents), zwei gleichnamige Talente wären
-- dort nicht unterscheidbar. is_custom trennt ergänzte von importierten
-- Talenten — nur ergänzte lassen sich wieder löschen.
CREATE TABLE IF NOT EXISTS talents (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL
                CHECK (category IN ('general', 'species', 'augment', 'esoteric',
                                    'command', 'conn', 'engineering', 'security',
                                    'science', 'medicine')),
  requirement TEXT,
  description TEXT NOT NULL,
  is_custom   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_talents_category ON talents(category);

-- ---------------------------------------------------------------------------
-- game_sessions
-- ---------------------------------------------------------------------------
-- Gespielte Sessions (/gm/sessions). Beim Anlegen schreibt die Spielleitung
-- allen aktiven Charakteren die Session-AP (und optionale Bonus-AP) gut — die
-- Gutschriften selbst sind normale Buchungen in character_ap_entries und
-- zeigen über deren session_id hierher zurück.
CREATE TABLE IF NOT EXISTS game_sessions (
  id           SERIAL PRIMARY KEY,
  session_date DATE NOT NULL,
  title        TEXT NOT NULL DEFAULT '',
  session_ap   INT NOT NULL DEFAULT 0 CHECK (session_ap >= 0),
  bonus_ap     INT NOT NULL DEFAULT 0 CHECK (bonus_ap >= 0),
  notes        TEXT NOT NULL DEFAULT '',
  created_by   INT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_game_sessions_date ON game_sessions(session_date DESC);

-- character_ap_entries: Rückverweis auf die Session, aus der eine Gutschrift
-- stammt (NULL bei Einzelbuchungen der Spielleitung und bei Steigerungen).
-- ON DELETE CASCADE: wird eine Session zurückgenommen, verschwinden auch ihre
-- Gutschriften — sonst bliebe AP-Guthaben aus einer nie gespielten Session.
ALTER TABLE character_ap_entries ADD COLUMN IF NOT EXISTS session_id INT
  REFERENCES game_sessions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_character_ap_entries_session
  ON character_ap_entries(session_id);

-- campaign_settings: konfigurierbares AP-Regelwerk (Kosten fürs Steigern,
-- Erschaffungsbudgets, AP je Session/Logbuch). NULL = die eingebauten
-- Standardwerte aus src/lib/advancement.ts gelten (DEFAULT_ADVANCEMENT_RULES).
ALTER TABLE campaign_settings ADD COLUMN IF NOT EXISTS advancement_rules JSONB;
