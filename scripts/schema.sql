CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'player'
               CHECK (role IN ('gm', 'player', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS characters (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'retired', 'deceased')),
  player_id   INT REFERENCES users(id) ON DELETE SET NULL,
  portrait    TEXT,
  species     TEXT,
  rank        TEXT,
  bio         TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  source_md   TEXT,
  frontmatter JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS missions (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
  started_at  DATE,
  ended_at    DATE,
  metadata    JSONB NOT NULL DEFAULT '{}',
  source_md   TEXT,
  frontmatter JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_logs (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  mission_id  INT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  author_id   INT REFERENCES characters(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  log_date    DATE,
  session_nr  INT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  source_md   TEXT,
  frontmatter JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archive_entries (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL
                CHECK (category IN (
                  'person', 'location', 'item', 'faction',
                  'theory', 'event', 'species', 'other', 'npc', 'dialogue'
                )),
  content     TEXT NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  metadata    JSONB NOT NULL DEFAULT '{}',
  source_md   TEXT,
  frontmatter JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archive_links (
  source_id   INT NOT NULL REFERENCES archive_entries(id) ON DELETE CASCADE,
  target_id   INT NOT NULL REFERENCES archive_entries(id) ON DELETE CASCADE,
  label       TEXT,
  PRIMARY KEY (source_id, target_id),
  CHECK (source_id != target_id)
);

-- Timeline-Ereignisse: bei jedem Ingest komplett aus dem bereits importierten
-- Datenbestand neu aufgebaut (siehe scripts/ingest/timeline.ts) — kein LLM,
-- kein eigener Vault-Zugriff. Automatisch für Missionen (started_at/ended_at)
-- und Archiv-Einträge der Kategorie event/dialogue mit gesetztem log_date;
-- alles andere über den <!-- timeline: JJJJ-MM-TT | Titel | Kategorie -->
-- Marker im Markdown-Body.
CREATE TABLE IF NOT EXISTS timeline_events (
  id          SERIAL PRIMARY KEY,
  event_date  DATE NOT NULL,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'sonstiges',
  source_type TEXT NOT NULL
                CHECK (source_type IN (
                  'character', 'mission', 'mission_log', 'archive_entry'
                )),
  source_slug TEXT NOT NULL,
  href        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Additive Migrationen für bestehende DBs (CREATE TABLE IF NOT EXISTS oben
-- legt neue Spalten bei schon vorhandenen Tabellen nicht an).
-- source_md = roher Markdown-Body, frontmatter = geparstes Frontmatter (JSONB).
ALTER TABLE characters      ADD COLUMN IF NOT EXISTS source_md   TEXT;
ALTER TABLE characters      ADD COLUMN IF NOT EXISTS frontmatter JSONB NOT NULL DEFAULT '{}';
ALTER TABLE missions        ADD COLUMN IF NOT EXISTS source_md   TEXT;
ALTER TABLE missions        ADD COLUMN IF NOT EXISTS frontmatter JSONB NOT NULL DEFAULT '{}';
ALTER TABLE mission_logs    ADD COLUMN IF NOT EXISTS source_md   TEXT;
ALTER TABLE mission_logs    ADD COLUMN IF NOT EXISTS frontmatter JSONB NOT NULL DEFAULT '{}';
ALTER TABLE archive_entries ADD COLUMN IF NOT EXISTS source_md   TEXT;
ALTER TABLE archive_entries ADD COLUMN IF NOT EXISTS frontmatter JSONB NOT NULL DEFAULT '{}';

-- Automatisch aus den Mission-Logs generierte Synopsis (siehe
-- scripts/generate-synopsis.ts). Ersetzt das frühere, manuell gepflegte
-- summary-Feld — die Synopsis ist jetzt die einzige Zusammenfassung.
ALTER TABLE missions ADD COLUMN IF NOT EXISTS synopsis TEXT;
ALTER TABLE missions DROP COLUMN IF EXISTS summary;

-- Die LLM-generierte Synopsis entfällt: Zusammenfassung ist jetzt der
-- ohnehin schon geparste Mission-Body (missions.metadata.body), gepflegt
-- direkt im Vault statt per API-Aufruf generiert. synopsis ist damit
-- überflüssig.
ALTER TABLE missions DROP COLUMN IF EXISTS synopsis;

-- Kategorie-CHECK erweitern (npc, dialogue). Bei bestehenden DBs greift das
-- inline-CHECK von CREATE TABLE oben nicht — daher Constraint neu setzen.
ALTER TABLE archive_entries DROP CONSTRAINT IF EXISTS archive_entries_category_check;
ALTER TABLE archive_entries ADD CONSTRAINT archive_entries_category_check
  CHECK (category IN (
    'person', 'location', 'item', 'faction',
    'theory', 'event', 'species', 'npc', 'dialogue', 'other'
  ));

-- Indizes (IF NOT EXISTS ab PostgreSQL 9.5)
CREATE INDEX IF NOT EXISTS idx_characters_status    ON characters(status);
CREATE INDEX IF NOT EXISTS idx_characters_player    ON characters(player_id);
CREATE INDEX IF NOT EXISTS idx_missions_status      ON missions(status);
CREATE INDEX IF NOT EXISTS idx_mission_logs_mission ON mission_logs(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_logs_author  ON mission_logs(author_id);
CREATE INDEX IF NOT EXISTS idx_archive_category     ON archive_entries(category);
CREATE INDEX IF NOT EXISTS idx_archive_tags         ON archive_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_archive_links_source ON archive_links(source_id);
CREATE INDEX IF NOT EXISTS idx_archive_links_target ON archive_links(target_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_date   ON timeline_events(event_date);
CREATE INDEX IF NOT EXISTS idx_timeline_events_source ON timeline_events(source_type, source_slug);

-- "Letzter Besuch" für das Dashboard (neu seit deinem letzten Besuch).
-- previous_login_at wird bei jedem Login aus dem alten last_login_at
-- übernommen, bevor last_login_at auf NOW() gesetzt wird (recordLogin in
-- src/lib/users.ts) — so kennt das Dashboard immer die Grenze des
-- *vorletzten* Logins, unabhängig von Profil-Änderungen währenddessen.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_login_at TIMESTAMPTZ;

-- Unterstützt getRecentActivitySince() (src/lib/timeline.ts), das nach
-- created_at filtert statt nach dem In-Story-Datum event_date.
CREATE INDEX IF NOT EXISTS idx_timeline_events_created ON timeline_events(created_at);

-- Passwort-Login. password_hash ist NULL, solange kein Passwort gesetzt
-- wurde. requires_activation unterscheidet zwei NULL-Fälle:
--   - false (Default): Bestandskonto von vor dieser Migration — darf sich
--     weiterhin per E-Mail allein einloggen (siehe login() in
--     src/app/login/actions.ts), bis es selbst ein Passwort setzt.
--   - true: vom GM neu angelegtes Konto — darf sich erst einloggen,
--     nachdem der Aktivierungslink (password_setup_tokens) benutzt wurde.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_activation BOOLEAN NOT NULL DEFAULT false;

-- Einmal-Token für die Aktivierungs-/Passwort-setzen-Mail. token_hash statt
-- des Rohtokens gespeichert (SHA-256, siehe src/lib/passwordSetupTokens.ts)
-- — ein DB-Leak macht die Links damit nicht direkt nutzbar. used_at markiert
-- verbrauchte Tokens statt sie zu löschen (Nachvollziehbarkeit).
CREATE TABLE IF NOT EXISTS password_setup_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_user ON password_setup_tokens(user_id);

-- Lesezeichen/Abos für Missionen und Archiv-Einträge. Zielreferenz per
-- target_type/target_slug (wie bei timeline_events) statt zweier separater
-- Tabellen mit je eigenem FK — eine Zeile ohne beides gesetzt wird von
-- src/lib/follows.ts gelöscht statt mit NULL/NULL liegen zu bleiben.
CREATE TABLE IF NOT EXISTS content_follows (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type   TEXT NOT NULL CHECK (target_type IN ('mission', 'archive_entry')),
  target_slug   TEXT NOT NULL,
  bookmarked_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_slug)
);
CREATE INDEX IF NOT EXISTS idx_content_follows_user   ON content_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_content_follows_target ON content_follows(target_type, target_slug);

-- Nachrichten eines In-App-Dialogs. Der Dialog selbst ist ein ganz normaler
-- archive_entries-Eintrag der Kategorie 'dialogue' (gleiche metadata-Form
-- wie Vault-Dialoge: participants/location/logDate/setting) — content
-- bleibt bei In-App-Dialogen bewusst '' und source_md NULL. Nachrichten
-- werden aufsteigend gespeichert, absteigend (neueste zuerst) angezeigt.
--
-- content/source_md folgen exakt dem Muster von missions/archive_entries/
-- mission_logs: content = gerendertes (sanitisiertes) HTML, source_md =
-- rohes vom User getipptes Markdown.
--
-- character_id/author_user_id: ON DELETE SET NULL statt CASCADE (analog
-- mission_logs.author_id) — eine spätere Charakter-Neuzuordnung oder ein
-- gelöschter User reißt bereits geschriebene Nachrichten nicht mit.
-- author_user_id wird zusätzlich zu character_id gespeichert (nicht nur
-- zur Anzeigezeit aus characters.player_id abgeleitet), weil player_id
-- sich später ändern kann — die Autorenschaft bleibt historisch korrekt.
CREATE TABLE IF NOT EXISTS dialogue_messages (
  id                SERIAL PRIMARY KEY,
  archive_entry_id  INT NOT NULL REFERENCES archive_entries(id) ON DELETE CASCADE,
  character_id      INT REFERENCES characters(id) ON DELETE SET NULL,
  author_user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  content           TEXT NOT NULL,
  source_md         TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dialogue_messages_entry  ON dialogue_messages(archive_entry_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dialogue_messages_author ON dialogue_messages(author_user_id);

-- In-App-Dialoge: offen (nur unter /dialogues/<slug> sichtbar, nimmt
-- Nachrichten an) vs. abgeschlossen (im Archiv, read-only). Vault-Dialoge
-- bleiben beim Default FALSE (= abgeschlossen) — der Ingest muss nichts
-- davon wissen.
ALTER TABLE archive_entries ADD COLUMN IF NOT EXISTS dialogue_open BOOLEAN NOT NULL DEFAULT FALSE;

-- Nachträgliches Bearbeiten/Löschen eigener Dialog-Nachrichten. Löschen ist
-- ein Soft-Delete (deleted_at gesetzt) — content/source_md bleiben in der
-- DB erhalten, werden aber von getDialogueMessages() nie mehr ausgeliefert
-- (Platzhaltertext stattdessen), damit die Thread-Struktur/Reihenfolge
-- erhalten bleibt. Kein separates Boolean-Flag: edited_at/deleted_at
-- IS NOT NULL sind die Flags selbst.
ALTER TABLE dialogue_messages ADD COLUMN IF NOT EXISTS edited_at  TIMESTAMPTZ;
ALTER TABLE dialogue_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Charakter-Abos: dritter target_type neben mission/archive_entry. Nutzt
-- dieselbe content_follows-Tabelle (bookmarked_at/subscribed_at), target_slug
-- ist der Charakter-Slug.
ALTER TABLE content_follows DROP CONSTRAINT IF EXISTS content_follows_target_type_check;
ALTER TABLE content_follows ADD CONSTRAINT content_follows_target_type_check
  CHECK (target_type IN ('mission', 'archive_entry', 'character'));

-- GM-Rolle wird gesplittet: admin (volle Useraccount-Verwaltung +
-- Charakter-Zuweisung) und gm (nur noch Charakter-Zuweisung +
-- Spielleitungs-Befugnisse wie Dialog-Force-Complete). Bestehende
-- role='gm'-Accounts migrieren zu 'admin', um alle heutigen Rechte zu
-- behalten (kein Risiko, sich selbst auszusperren). Reihenfolge wichtig:
-- Constraint zuerst erweitern, dann Daten migrieren.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'gm', 'player', 'viewer'));
UPDATE users SET role = 'admin' WHERE role = 'gm';

-- Admin kann Useraccounts deaktivieren (Soft-Block am Login, siehe
-- src/app/login/actions.ts) statt sie sofort zu löschen.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Stabiler, URL-/Frontmatter-sicherer User-Identifier ("owner: <slug>" im
-- Vault-Markdown, siehe scripts/ingest/shared.ts#resolveOwner). Backfill für
-- Bestandsuser aus name (gleiche Umlaut-/Zeichen-Regeln wie slugifyBase in
-- src/lib/slug.ts), Kollisionen bekommen Suffix -2, -3, ... (analog
-- generateUniqueArchiveEntrySlug in src/lib/archive.ts). Neue User bekommen
-- ihren Slug direkt bei der Anlage (siehe generateUniqueUserSlug in
-- src/lib/users.ts).
ALTER TABLE users ADD COLUMN IF NOT EXISTS slug TEXT;

DO $$
DECLARE
  u RECORD;
  base TEXT;
  candidate TEXT;
  n INT;
BEGIN
  FOR u IN SELECT id, name FROM users WHERE slug IS NULL ORDER BY id LOOP
    base := u.name;
    base := replace(base, 'ä', 'ae');
    base := replace(base, 'ö', 'oe');
    base := replace(base, 'ü', 'ue');
    base := replace(base, 'ß', 'ss');
    base := replace(base, 'Ä', 'Ae');
    base := replace(base, 'Ö', 'Oe');
    base := replace(base, 'Ü', 'Ue');
    base := lower(base);
    base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
    base := regexp_replace(base, '^-+|-+$', '', 'g');
    IF base = '' THEN
      base := 'user';
    END IF;

    candidate := base;
    n := 2;
    WHILE EXISTS (SELECT 1 FROM users WHERE slug = candidate) LOOP
      candidate := base || '-' || n;
      n := n + 1;
    END LOOP;

    UPDATE users SET slug = candidate WHERE id = u.id;
  END LOOP;
END $$;

ALTER TABLE users ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_slug ON users(slug);

-- Owner-Zuordnung für Inhalte ohne bestehende direkte User-Referenz
-- (Charaktere haben mit player_id bereits einen Owner). Wird aus dem
-- "owner: <user-slug>"-Frontmatter beim Ingest aufgelöst (resolveOwner in
-- scripts/ingest/shared.ts); fehlt das Feld, bleibt die Spalte NULL (kein
-- Ingest-Abbruch). In-App-Dialoge setzen sie direkt beim Anlegen auf den
-- Ersteller.
ALTER TABLE missions        ADD COLUMN IF NOT EXISTS owner_user_id INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE mission_logs    ADD COLUMN IF NOT EXISTS owner_user_id INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE archive_entries ADD COLUMN IF NOT EXISTS owner_user_id INT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_missions_owner        ON missions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_mission_logs_owner     ON mission_logs(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_archive_entries_owner  ON archive_entries(owner_user_id);

-- Sichtbarkeit pro Inhalt: private (nur Owner) | gm (Owner + gm/admin) |
-- public (alle). Default 'public' — Bestandsinhalte bleiben unverändert für
-- alle sichtbar. Missionen und ownerlose Wiki-Archiv-Einträge bekommen
-- bewusst (noch) keine Spalte: ohne Owner-Konzept für Missionen wäre
-- "private" nicht sinnvoll definierbar; sie bleiben immer public. Siehe
-- src/lib/visibility.ts für die Auswertung.
ALTER TABLE characters      ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('private', 'gm', 'public'));
ALTER TABLE mission_logs    ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('private', 'gm', 'public'));
ALTER TABLE archive_entries ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('private', 'gm', 'public'));

-- Benachrichtigungs-Präferenzen (PWA/Push-Feature): zwei globale Schalter
-- pro User, gelten einheitlich für alle Benachrichtigungs-Ereignistypen
-- (neue Dialog-Nachricht, Dialog abgeschlossen, Abo-Digest) — kein
-- granulares Opt-out pro Ereignis. email_notifications_enabled
-- DEFAULT true erhält das bisherige Alles-an-Verhalten für Bestandsuser
-- (E-Mail hatte zuvor gar kein Opt-out). push_notifications_enabled
-- DEFAULT true ist bis zur ersten registrierten Subscription wirkungslos,
-- wird aber beim Registrieren eines Geräts ohnehin automatisch (wieder)
-- auf true gesetzt (siehe saveSubscription in src/lib/pushSubscriptions.ts).
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notifications_enabled  BOOLEAN NOT NULL DEFAULT true;

-- Web-Push-Subscriptions: mehrere pro User möglich (mehrere Geräte/
-- Browser). endpoint ist UNIQUE (nicht user_id+endpoint) — ein Endpoint
-- gehört technisch zu Browser+Origin, nicht zu einem Account; bei einem
-- Account-Wechsel auf demselben Gerät wird die Zeile per ON CONFLICT
-- umgehängt statt einen Duplikatsfehler zu werfen (siehe saveSubscription).
-- ON DELETE CASCADE (nicht SET NULL wie bei dialogue_messages.author_user_id):
-- eine Subscription ohne Owner hat keinen historischen Wert.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Gast-Rolle: können sich nur Inhalte ansehen sowie bookmarken/abonnieren
-- (src/app/actions/follows.ts prüft keine Rolle), aber keine Charaktere
-- zugewiesen bekommen (assignCharacterAction in src/app/admin/actions.ts)
-- und dadurch — da Mission-Logs/Dialoge immer einen eigenen Autor-Charakter
-- brauchen — auch keine Inhalte erstellen.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'gm', 'player', 'viewer', 'guest'));

-- Löschprotokoll für die rote "gelöscht"-Kategorie im News-Feed
-- (NewsSection.tsx). Missionen/Mission-Logs/Gespräche werden hart gelöscht
-- (DELETE, kein deleted_at auf der Ursprungstabelle) — ohne dieses
-- Protokoll gäbe es nach dem Löschen keine Zeile mehr, aus der ein
-- "X wurde gelöscht"-Eintrag entstehen könnte. visibility/owner_user_id
-- werden zum Löschzeitpunkt übernommen, damit getRecentDeletions dieselbe
-- Sichtbarkeitsregel (öffentlich ODER eigener Inhalt) wie bei lebenden
-- Inhalten anwenden kann — visibility NULL steht für Missionen, die (wie
-- live) keine eigene visibility-Spalte haben und immer öffentlich sind.
CREATE TABLE IF NOT EXISTS content_deletions (
  id            SERIAL PRIMARY KEY,
  target_type   TEXT NOT NULL,
  title         TEXT NOT NULL,
  visibility    TEXT,
  owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  deleted_by    INT REFERENCES users(id) ON DELETE SET NULL,
  deleted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_deletions_deleted_at ON content_deletions(deleted_at);

-- Teilnehmende Charaktere einer Mission (Multiselect beim Anlegen, siehe
-- MissionParticipantsField.tsx). Rein informativ/für die
-- Anlage-Benachrichtigung (missionAction in
-- src/app/user/[id]/missions/_shared/contentAction.ts) — löst KEIN
-- automatisches Mission-Abo aus, das bleibt dem Follow-Button vorbehalten.
CREATE TABLE IF NOT EXISTS mission_participants (
  mission_id   INT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (mission_id, character_id)
);
CREATE INDEX IF NOT EXISTS idx_mission_participants_character ON mission_participants(character_id);

-- User-Abos: vierter target_type neben mission/archive_entry/character.
-- target_slug ist der User-Slug (users.slug) — ein Abo benachrichtigt bei
-- jedem NEUEN oder GEÄNDERTEN öffentlichen Inhalt (visibility='public') des
-- abonnierten Users, siehe notifyUserSubscribers in src/lib/follows.ts.
ALTER TABLE content_follows DROP CONSTRAINT IF EXISTS content_follows_target_type_check;
ALTER TABLE content_follows ADD CONSTRAINT content_follows_target_type_check
  CHECK (target_type IN ('mission', 'archive_entry', 'character', 'user'));
