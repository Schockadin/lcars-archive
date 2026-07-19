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

-- Frühere summary-Spalte entfernt: Zusammenfassung ist der ohnehin schon
-- geparste Mission-Body (missions.metadata.body), gepflegt direkt im Vault.
-- (Eine dazwischenliegende, per API generierte synopsis-Spalte wurde in
-- einer späteren Version wieder eingeführt und noch später wieder entfernt —
-- beide Schritte sind aus dieser Datei entfernt, da sie sich für den
-- Endzustand jeder DB gegenseitig aufheben und nur Verwirrung stifteten.)
ALTER TABLE missions DROP COLUMN IF EXISTS summary;

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

-- Login-Historie fürs Admin-Panel (/admin/[id]/edit). previous_login_at
-- wird bei jedem Login aus dem alten last_login_at übernommen, bevor
-- last_login_at auf NOW() gesetzt wird (recordLogin in src/lib/users.ts) —
-- so bleibt der Zeitpunkt des *vorletzten* Logins nachvollziehbar,
-- unabhängig von Profil-Änderungen währenddessen. Dient außerdem als
-- "warst du schon mal hier?"-Flag auf dem Dashboard (Dashboard.tsx).
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_login_at TIMESTAMPTZ;

-- last_visit_at: Zeitpunkt des letzten Seitenaufrufs (jede Seite, siehe
-- /api/session/route.ts), gedrosselt auf max. einen Write pro 15 Minuten
-- (touchLastVisit in src/lib/users.ts) — nur für Admins sichtbar
-- (/admin/[id]/edit). last_dashboard_visit_at: Zeitpunkt des letzten
-- Dashboard-Besuchs, ungedrosselt bei jedem Aufruf aktualisiert
-- (touchDashboardVisit) — Grundlage für "neu seit deinem letzten Besuch"
-- in der News-Sektion des Dashboards (ersetzt die frühere Verwendung von
-- previous_login_at dafür).
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_dashboard_visit_at TIMESTAMPTZ;

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

-- Charakter- UND User-Abos: dritter/vierter target_type neben mission/
-- archive_entry (User-Abos benachrichtigen bei jedem NEUEN oder GEÄNDERTEN
-- öffentlichen Inhalt eines abonnierten Users, target_slug = users.slug,
-- siehe notifyUserSubscribers in src/lib/follows.ts). Beide bereits hier auf
-- einmal erlaubt (nicht erst einzeln nachgezogen, sobald der jeweilige
-- Feature-Code sie braucht): db:setup spielt beim Re-Run diese ganze Datei
-- erneut gegen eine bereits befüllte DB ab — ein zu enger Constraint würde
-- an bestehenden Zeilen mit dem neueren target_type scheitern, exakt das
-- gleiche Prinzip wie bei users_role_check weiter unten.
ALTER TABLE content_follows DROP CONSTRAINT IF EXISTS content_follows_target_type_check;
ALTER TABLE content_follows ADD CONSTRAINT content_follows_target_type_check
  CHECK (target_type IN ('mission', 'archive_entry', 'character', 'user'));

-- GM-Rolle wird gesplittet: admin (volle Useraccount-Verwaltung +
-- Charakter-Zuweisung) und gm (nur noch Charakter-Zuweisung +
-- Spielleitungs-Befugnisse wie Dialog-Force-Complete). 'guest' ist hier
-- (statt erst weiter unten) schon mit erlaubt: db:setup spielt beim
-- Re-Run diese ganze Datei erneut gegen eine bereits befüllte DB ab —
-- ohne 'guest' würde dieser Constraint an bestehenden role='guest'-Zeilen
-- (siehe unten) scheitern, genau wie bei content_follows_target_type_check
-- weiter oben.
--
-- WICHTIG — Bug behoben: hier stand früher zusätzlich
-- "UPDATE users SET role = 'admin' WHERE role = 'gm';", einmalig gedacht,
-- um beim Split bestehende role='gm'-Accounts auf 'admin' zu heben (kein
-- Risiko, sich selbst auszusperren). Diese Datei wird aber bei jedem
-- db:setup erneut komplett abgespielt, und das UPDATE hatte keinerlei
-- Sperre gegen Wiederholung — jeder aktuelle 'gm'-User wurde dadurch bei
-- JEDEM db:setup-Lauf erneut still auf 'admin' hochgestuft, ganz ohne
-- Admin-Audit-Log-Eintrag (rohes SQL, kein logAdminAction) und ohne dass
-- irgendjemand das ausgelöst hätte — eine Privilegien-Eskalation, die bei
-- jedem Schema-Update erneut zuschlug. 'gm' ist eine aktiv genutzte,
-- eigenständige Rolle (siehe requireGM in src/lib/dal.ts) und darf nicht
-- bei jedem Setup-Lauf wieder zu 'admin' migriert werden.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'gm', 'player', 'viewer', 'guest'));

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
-- brauchen — auch keine Inhalte erstellen. users_role_check erlaubt 'guest'
-- bereits seit der GM-Rollen-Aufsplittung weiter oben (kein erneutes
-- DROP/ADD hier nötig).

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
-- Anlage-Benachrichtigungen (missionAction in
-- src/app/user/missions/_shared/contentAction.ts — direkt an die
-- teilnehmenden Spieler sowie an alle Charakter-/User-Abonnenten der
-- Teilnehmer) — löst KEIN automatisches Mission-Abo aus, das bleibt dem
-- Follow-Button vorbehalten.
CREATE TABLE IF NOT EXISTS mission_participants (
  mission_id   INT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (mission_id, character_id)
);
CREATE INDEX IF NOT EXISTS idx_mission_participants_character ON mission_participants(character_id);

-- Admin-Opt-in "Über alle Inhalte benachrichtigt werden" (NotificationSettingsForm.tsx,
-- admin-only Checkbox-Liste) — welche der vier Inhaltstypen (character/mission/
-- mission_log/archive_entry) einen Admin per Mail/Push benachrichtigen sollen,
-- sobald IRGENDEIN User einen Inhalt dieses Typs anlegt oder bearbeitet
-- (unabhängig von visibility/Owner, siehe notifyAdminContentSubscribers in
-- src/lib/follows.ts) — anders als notifyUserSubscribers, das nur öffentliche
-- Inhalte eigener Abonnenten meldet. Leeres Array (Default) = kein Opt-in,
-- gleiches Freitext-Array-Muster wie tags auf den Inhaltstabellen oben.
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_content_types TEXT[] NOT NULL DEFAULT '{}';

-- Session-Invalidierung bei Passwortänderung: wird bei jedem setPassword()
-- (Passwort-Änderung in den Settings, Aktivierung, Passwort-Reset) um 1
-- erhöht und beim Ausstellen eines Sessions-Cookies (createSession) in
-- dessen Payload eingebettet (siehe src/lib/session.ts). Ein bereits
-- ausgestelltes Cookie mit veraltetem Wert wird von getCurrentUser()
-- (src/lib/dal.ts) verworfen — ohne das würde ein gestohlenes Cookie eine
-- Passwortänderung bis zum natürlichen Ablauf (30 Tage) überleben.
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INT NOT NULL DEFAULT 0;

-- Fehlgeschlagene UND erfolgreiche Login-Versuche (siehe
-- src/lib/loginAttempts.ts) — Grundlage für die Brute-Force-Sperre in
-- src/app/login/actions.ts. Bewusst eine DB-Tabelle statt In-Memory-Zähler:
-- die App läuft auf Serverless-Funktionsinstanzen (siehe Kommentar zu
-- src/lib/db.ts), ein In-Memory-Zähler würde pro Instanz getrennt zählen und
-- die Sperre dadurch wirkungslos machen. email wird unabhängig davon
-- gezählt, ob überhaupt ein User mit dieser Adresse existiert (siehe
-- Kommentar in login/actions.ts) — sonst ließe sich über das Ausbleiben
-- einer Sperre die Existenz einer Adresse erschließen.
CREATE TABLE IF NOT EXISTS login_attempts (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL,
  ip           TEXT,
  succeeded    BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip, attempted_at);

-- Analog zu login_attempts, aber für /forgot-password (siehe
-- src/lib/passwordResetLimiter.ts) — begrenzt, wie oft pro E-Mail-Adresse
-- bzw. IP ein Reset-Mailversand (inkl. Admin-Benachrichtigungs-Fanout, siehe
-- forgot-password/actions.ts) pro Zeitfenster ausgelöst werden kann.
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL,
  ip           TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email_time ON password_reset_requests(email, requested_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_ip_time ON password_reset_requests(ip, requested_at);

-- Protokoll sicherheitsrelevanter Admin-Actions auf Useraccounts (anlegen,
-- Rolle ändern, (de)aktivieren, löschen, Passwort-Reset auslösen — siehe
-- src/lib/auditLog.ts und das Wiring in src/app/admin/actions.ts). Rein
-- lesend über /admin/audit-log einsehbar, keine eigene UI zum Bearbeiten.
-- target_user_id bleibt bei einem gelöschten User NULL (siehe deleteUser) —
-- details enthält deshalb zusätzlich Name/E-Mail als Klartext-Schnappschuss,
-- damit ein Löschen-Eintrag auch danach noch nachvollziehbar bleibt.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id             SERIAL PRIMARY KEY,
  actor_id       INT REFERENCES users(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  target_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  details        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at);

-- Wie jede andere enum-artige TEXT-Spalte im Schema per CHECK abgesichert,
-- statt sich allein auf den TS-Union-Typ AdminAuditAction (src/lib/auditLog.ts)
-- zu verlassen. update_profile ist neu: Name-/E-Mail-Änderungen durch einen
-- Admin wurden bisher gar nicht protokolliert.
ALTER TABLE admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;
ALTER TABLE admin_audit_log ADD CONSTRAINT admin_audit_log_action_check
  CHECK (action IN (
    'create_user', 'reset_password', 'update_role', 'update_profile',
    'deactivate_user', 'reactivate_user', 'delete_user', 'force_logout'
  ));

-- Actor-IP (siehe getClientIp in src/lib/http.ts) — bisher wurde zwar
-- protokolliert, WER eine Aktion ausgeführt hat, aber nicht VON WO, obwohl
-- genau dieselbe IP-Ermittlung für das Login-Rate-Limiting bereits an jeder
-- betroffenen Action verfügbar ist. Wichtig für die forensische Aufarbeitung
-- eines vermuteten kompromittierten Admin-Accounts.
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS ip TEXT;

-- Globale User-Präferenz (nicht pro Dialog): abgeschlossene Dialoge zeigen
-- entweder den generierten Fließtext (archive_entries.content/source_md,
-- siehe regenerateDialogueContent in dialoguesCore.ts) oder die farbige
-- Karten-Ansicht wie offene Dialoge — umschaltbar direkt auf der
-- Dialog-Seite (DialogueViewToggle.tsx). DEFAULT true, da Fließtext die
-- neue primäre Darstellung ist.
ALTER TABLE users ADD COLUMN IF NOT EXISTS dialogue_flowing_text_enabled BOOLEAN NOT NULL DEFAULT true;

-- Antwort-Reservierung für Mehrparteien-Dialoge (mehr als zwei Teilnehmende,
-- siehe postDialogueMessage in dialoguesCore.ts): wer antworten will,
-- reserviert sich zuerst per Button-Klick für 2 Stunden exklusiv das
-- Antwortrecht — alle anderen Teilnehmenden sind bis dahin vom Antworten
-- ausgeschlossen. Höchstens eine aktive Reservierung pro Dialog —
-- archive_entry_id ist deshalb selbst der Primärschlüssel, kein
-- Surrogatschlüssel nötig. Sperrt die ganze Person (held_by_user_id), nicht
-- nur einen einzelnen Charakter — wer mit mehreren eigenen Charakteren in
-- diesem Dialog mitspielt, ist während der eigenen Reservierung komplett
-- gesperrt. Freigabe erfolgt passiv (kein Cronjob): jeder Lese-/
-- Schreibzugriff räumt zuerst abgelaufene Zeilen weg (siehe
-- releaseExpiredDialogueReservation), außerdem endet die Frist vorzeitig,
-- sobald die reservierende Person selbst geantwortet hat.
CREATE TABLE IF NOT EXISTS dialogue_reservations (
  archive_entry_id INT PRIMARY KEY REFERENCES archive_entries(id) ON DELETE CASCADE,
  held_by_user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Einmal-Opt-in "informiere mich (Mail/Push), wenn diese Antwort-Sperre
-- endet" (siehe requestDialogueReservationNotification/
-- releaseExpiredDialogueReservation in dialoguesCore.ts) — bewusst NICHT
-- über content_follows, das ist ein dauerhaftes Abo, während dieses Opt-in
-- ein Einmal-Ereignis pro Sperre ist und beim Auslösen (oder wenn die Sperre
-- vorher schon durch eine Antwort endet) sofort wieder gelöscht wird.
CREATE TABLE IF NOT EXISTS dialogue_reservation_notify_requests (
  archive_entry_id INT NOT NULL REFERENCES archive_entries(id) ON DELETE CASCADE,
  user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (archive_entry_id, user_id)
);

-- Protokoll unerwarteter Serverfehler (Next.js instrumentation.ts/
-- onRequestError, siehe src/lib/errorLog.ts) — sowohl automatisch nicht
-- abgefangene Abstürze (route_type 'render'/'route'/'action', kommt aus dem
-- onRequestError-Hook) als auch bereits an Ort und Stelle abgefangene,
-- unkritische Fehler (route_type 'caught', manuell per logCaughtError aus
-- bestehenden catch-Blöcken ergänzt). Rein lesend über /admin/error-log
-- einsehbar (admin-only, siehe dortiges page.tsx), kein Bearbeiten/Löschen
-- einzelner Einträge, kein automatisches Aufräumen (gleiche Konvention wie
-- admin_audit_log). digest ist der von Next.js für Server-Component-Fehler
-- generierte Korrelations-Hash (siehe error.tsx) — nullable, da nicht jeder
-- Fehlerpfad einen liefert (Client-Component-Fehler, manuell geloggte
-- Fehler). route_type bewusst freies TEXT ohne CHECK, da sowohl die von
-- Next.js selbst gelieferten Werte als auch das manuelle "caught" abgedeckt
-- werden müssen.
CREATE TABLE IF NOT EXISTS error_logs (
  id         SERIAL PRIMARY KEY,
  digest     TEXT,
  message    TEXT NOT NULL,
  stack      TEXT,
  route_path TEXT,
  route_type TEXT,
  method     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_digest ON error_logs(digest);

-- Globale User-Präferenz: native Rechtschreibprüfung des Browsers (HTML
-- spellcheck-Attribut) in allen Markdown-Editor-Feldern (MarkdownEditor.tsx)
-- an-/abschaltbar im Profil. DEFAULT true, da eine aktive Rechtschreib-
-- prüfung der bisherige (Browser-Default-)Zustand ist.
ALTER TABLE users ADD COLUMN IF NOT EXISTS editor_spellcheck_enabled BOOLEAN NOT NULL DEFAULT true;
