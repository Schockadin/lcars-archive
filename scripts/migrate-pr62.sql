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
                 CHECK (reason IN ('session', 'logbook', 'bonus', 'mission', 'manual', 'advancement', 'creation')),
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

-- ---------------------------------------------------------------------------
-- game_session_characters
-- ---------------------------------------------------------------------------
-- Wer bei einer Session dabei war. Eigene Tabelle statt „wer eine Buchung mit
-- dieser session_id hat": eine Session kann mit 0 AP eingetragen werden (reiner
-- Notizeintrag), und die automatische Logbuch-AP muss trotzdem wissen, wem sie
-- gutzuschreiben ist.
CREATE TABLE IF NOT EXISTS game_session_characters (
  session_id   INT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, character_id)
);
CREATE INDEX IF NOT EXISTS idx_game_session_characters_character
  ON game_session_characters(character_id);

-- character_ap_entries: Rückverweis auf die Session, aus der eine Gutschrift
-- stammt (NULL bei Einzelbuchungen der Spielleitung und bei Steigerungen).
-- ON DELETE CASCADE: wird eine Session zurückgenommen, verschwinden auch ihre
-- Gutschriften — sonst bliebe AP-Guthaben aus einer nie gespielten Session.
ALTER TABLE character_ap_entries ADD COLUMN IF NOT EXISTS session_id INT
  REFERENCES game_sessions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_character_ap_entries_session
  ON character_ap_entries(session_id);

-- character_ap_entries: neuer Buchungsgrund 'bonus' (Bonus-AP einer Session).
-- DROP/ADD des CHECK, damit auch eine bereits angelegte Tabelle ihn bekommt.
ALTER TABLE character_ap_entries DROP CONSTRAINT IF EXISTS character_ap_entries_reason_check;
ALTER TABLE character_ap_entries ADD CONSTRAINT character_ap_entries_reason_check
  CHECK (reason IN ('session', 'logbook', 'bonus', 'mission', 'manual', 'advancement', 'creation'));

-- character_ap_entries: Rückverweis auf die Mission, für deren Abschluss eine
-- Gutschrift vergeben wurde (NULL bei allen anderen Buchungen). AP für einen
-- Missionsabschluss gibt es nur über die Mission selbst (siehe
-- completeMissionWithAp) — der Verweis hält fest, wofür. ON DELETE SET NULL:
-- eine gelöschte Mission soll die Gutschrift nicht mitnehmen.
ALTER TABLE character_ap_entries ADD COLUMN IF NOT EXISTS mission_id INT
  REFERENCES missions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_character_ap_entries_mission
  ON character_ap_entries(mission_id);

-- mission_logs: optionale Zuordnung zu einer Session (/gm/sessions). Sobald
-- mindestens ein Logbuch an einer Session hängt, bekommen die dort
-- gutgeschriebenen Charaktere automatisch die Logbuch-AP (siehe
-- syncSessionLogbookAp in src/lib/gameSessions.ts). ON DELETE SET NULL: wird
-- eine Session zurückgenommen, verliert das Logbuch nur seine Zuordnung.
ALTER TABLE mission_logs ADD COLUMN IF NOT EXISTS session_id INT
  REFERENCES game_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mission_logs_session ON mission_logs(session_id);

-- campaign_settings: konfigurierbares AP-Regelwerk (Kosten fürs Steigern,
-- Erschaffungsbudgets, AP je Session/Logbuch). NULL = die eingebauten
-- Standardwerte aus src/lib/advancement.ts gelten (DEFAULT_ADVANCEMENT_RULES).
ALTER TABLE campaign_settings ADD COLUMN IF NOT EXISTS advancement_rules JSONB;

-- character_sheets: entfällt (v1.27.23). Das Hochladen von PDF-Charakterbögen
-- gibt es nicht mehr — an seine Stelle tritt die Ansicht des im Archiv
-- gepflegten Bogens (/characters/[slug]/sheet, für Owner und Spielleitung).
--
-- WICHTIG: VOR dieser Migration einmal
--   npx tsx --conditions=react-server scripts/purge-character-sheet-uploads.ts
-- laufen lassen. Das Skript löscht die zugehörigen Objekte im Asset-Bucket;
-- ohne die r2_keys dieser Tabelle wären sie danach nicht mehr auffindbar und
-- blieben dauerhaft verwaist liegen.
DROP TABLE IF EXISTS character_sheets;
