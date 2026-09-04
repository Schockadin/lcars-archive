-- Vollständiges, idempotentes Schema der Anwendung.
--
-- Design: Jede Tabelle wird mit CREATE TABLE IF NOT EXISTS EINMALIG und
-- vollständig angelegt (alle Spalten, CHECK-Constraints und UNIQUE inline).
-- Früher wuchs diese Datei über viele „Migrationen“ hinweg (CREATE TABLE +
-- eine Kette nachgezogener `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` /
-- `DROP CONSTRAINT ... ADD CONSTRAINT` pro neuer Version) — diese wurden hier
-- in die jeweiligen CREATE-TABLE-Blöcke zusammengeführt.
--
-- Idempotenz: Diese Datei wird bei JEDEM `db:setup`-Lauf komplett erneut
-- abgespielt und ist bewusst idempotent zum aktuellen Schema:
--   - Gegen eine leere DB: legt exakt das aktuelle Schema an.
--   - Gegen eine DB, die bereits auf diesem Schema steht (Produktion): reiner
--     No-op — jedes CREATE TABLE/INDEX IF NOT EXISTS wird übersprungen, es
--     werden keine Daten angefasst und keine Tabellen umgebaut.
-- Die Spaltenreihenfolge in den CREATE-TABLE-Blöcken entspricht der Reihen-
-- folge, in der die Spalten historisch (Basis-Tabelle, dann die einzelnen
-- ADD-COLUMN-Migrationen) entstanden sind — so ist eine frisch angelegte DB
-- strukturell identisch zu einer bestehenden, über die alten Migrationen
-- gewachsenen DB.
--
-- WICHTIG — historischer Bug, der genau deshalb NICHT zurückkehren darf: In
-- einer früheren Fassung stand hier zusätzlich
-- „UPDATE users SET role = 'admin' WHERE role = 'gm';“, einmalig gedacht, um
-- beim GM/Admin-Rollen-Split bestehende 'gm'-Accounts auf 'admin' zu heben.
-- Da diese Datei bei JEDEM db:setup erneut läuft und das UPDATE keinerlei
-- Wiederholungssperre hatte, wurde jeder aktive 'gm'-Account bei jedem Lauf
-- erneut still zu 'admin' hochgestuft (Privilegien-Eskalation, ohne
-- Audit-Log-Eintrag). Diese Datei enthält deshalb bewusst KEINE
-- datenverändernden UPDATE-/Backfill-Schritte mehr — nur idempotente
-- Struktur-Anlage.

-- ---------------------------------------------------------------------------
-- Erweiterungen
-- ---------------------------------------------------------------------------
-- pg_trgm: Trigramm-Ähnlichkeit + GIN-Operatorklasse gin_trgm_ops. Grundlage
-- für die Suche (src/lib/search.ts), die mit ILIKE '%q%' arbeitet: ein solches
-- Muster mit führendem Platzhalter kann KEINEN B-Tree-Index nutzen (nur ein
-- seq scan), ein GIN-Trigramm-Index dagegen schon. IF NOT EXISTS hält die
-- Anlage idempotent wie den Rest dieser Datei. (Auf verwalteten Postgres-
-- Diensten wie Neon/Supabase ist pg_trgm vorhanden.)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- vector (pgvector): Vektor-Datentyp + Ähnlichkeits-Operatoren (u.a. <=> für
-- Cosine-Distance). Grundlage des RAG-Systems (src/lib/embeddings.ts,
-- src/lib/rag.ts): Inhalte werden als Embedding-Vektoren in
-- content_embeddings (siehe unten) abgelegt und per Vektorsuche abgefragt.
-- IF NOT EXISTS hält die Anlage idempotent wie den Rest dieser Datei. Auf
-- Railway (verwalteter Postgres) ist die Extension verfügbar und muss nur
-- einmalig aktiviert werden.
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
-- Rollen: admin (volle Useraccount-Verwaltung + Charakter-Zuweisung), gm
-- (Charakter-Zuweisung + Spielleitungs-Befugnisse wie Dialog-Force-Complete,
-- siehe requireGM in src/lib/dal.ts), player/viewer (eigene Inhalte), guest
-- (nur ansehen/bookmarken/abonnieren, kein Charakter → keine eigenen Inhalte).
--
-- Spalten-Rationale (folgt der historischen ADD-COLUMN-Reihenfolge):
--  - last_login_at/previous_login_at: Login-Historie fürs Admin-Panel;
--    previous_login_at wird beim Login aus dem alten last_login_at übernommen
--    (recordLogin in src/lib/users.ts) und dient als „warst du schon hier?“.
--  - last_visit_at: letzter Seitenaufruf (gedrosselt, max. 1 Write/15 Min).
--    last_dashboard_visit_at: letzter Dashboard-Besuch (ungedrosselt) —
--    Grundlage für „neu seit deinem letzten Besuch“ in der News-Sektion.
--  - password_hash (NULL = kein Passwort gesetzt) / requires_activation
--    (true = neu vom GM angelegt, muss erst Aktivierungslink nutzen; false =
--    Bestandskonto, darf sich per E-Mail einloggen, bis es selbst ein
--    Passwort setzt).
--  - is_active: Admin kann Accounts deaktivieren (Soft-Block am Login).
--  - slug: stabiler, URL-/Frontmatter-sicherer User-Identifier
--    („owner: <slug>“ im Vault-Markdown). Neue User bekommen ihn bei der
--    Anlage (generateUniqueUserSlug in src/lib/users.ts).
--  - email_/push_notifications_enabled: zwei globale Benachrichtigungs-
--    schalter (DEFAULT true erhält das bisherige Alles-an-Verhalten).
--  - notify_content_types: Admin-Opt-in „über alle Inhalte benachrichtigen“
--    (welche der vier Inhaltstypen, siehe notifyAdminContentSubscribers in
--    src/lib/follows.ts); leeres Array = kein Opt-in.
--  - session_version: bei jedem setPassword() +1, im Session-Cookie
--    eingebettet — invalidiert bei Passwortänderung ältere Cookies
--    (src/lib/dal.ts), sonst überlebte ein gestohlenes Cookie 30 Tage.
--  - dialogue_flowing_text_enabled: abgeschlossene Dialoge als generierter
--    Fließtext (true) vs. farbige Karten-Ansicht (DialogueViewToggle.tsx).
--  - editor_spellcheck_enabled: native Browser-Rechtschreibprüfung in den
--    Markdown-Editor-Feldern (im Profil abschaltbar).
--  - news_kinds: welche News-Arten der User auf dem Dashboard sehen will
--    (Teilmenge von created/updated/deleted). Default = nur 'created' ("Neu").
--  - color_theme: gewähltes LCARS-Farbtheme der Oberfläche (siehe
--    src/lib/themes.ts). Default = 'standard' (unverändertes DS9/VOY-Interface).
--  - theme_overrides: individuelle Akzent-Farben, die das gewählte Theme
--    überschreiben (JSONB Token→Hex, Default = '{}' = keine).
--  - additional_roles/permission_overrides: granulares RBAC (siehe
--    src/lib/permissions.ts). role bleibt die Primär-/Anzeigerolle;
--    additional_roles hält weitere Preset-Rollen (ein User kann mehrere haben).
--    Effektive Rechte = Vereinigung der Presets aller Rollen ⊕
--    permission_overrides (JSONB: Permission→bool, true=gewähren/false=entziehen).
CREATE TABLE IF NOT EXISTS users (
  id                            SERIAL PRIMARY KEY,
  email                         TEXT UNIQUE NOT NULL,
  name                          TEXT NOT NULL,
  -- Primär-/Anzeigerolle. KEIN CHECK auf feste Werte mehr: Rollen sind
  -- DB-gestützt (Tabelle roles, siehe unten) und über /admin/permissions frei
  -- anlegbar; gültige Schlüssel prüft die Anwendung gegen die roles-Tabelle.
  role                          TEXT NOT NULL DEFAULT 'player',
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at                 TIMESTAMPTZ,
  previous_login_at             TIMESTAMPTZ,
  last_visit_at                 TIMESTAMPTZ,
  last_dashboard_visit_at       TIMESTAMPTZ,
  password_hash                 TEXT,
  requires_activation           BOOLEAN NOT NULL DEFAULT false,
  is_active                     BOOLEAN NOT NULL DEFAULT true,
  slug                          TEXT NOT NULL,
  email_notifications_enabled   BOOLEAN NOT NULL DEFAULT true,
  push_notifications_enabled    BOOLEAN NOT NULL DEFAULT true,
  notify_content_types          TEXT[] NOT NULL DEFAULT '{}',
  session_version               INT NOT NULL DEFAULT 0,
  dialogue_flowing_text_enabled BOOLEAN NOT NULL DEFAULT true,
  editor_spellcheck_enabled     BOOLEAN NOT NULL DEFAULT true,
  news_kinds                    TEXT[] NOT NULL DEFAULT '{created}',
  -- Gewähltes Farbtheme der Oberfläche (siehe src/lib/themes.ts). Freier
  -- String, von der Anwendung gegen COLOR_THEMES validiert; unbekannte Werte
  -- fallen auf 'standard' zurück. Kein DB-CHECK, damit neue Themes ohne
  -- Migration hinzukommen können.
  color_theme                   TEXT NOT NULL DEFAULT 'standard',
  -- Individualisierung des Themes: einzelne Akzent-Tokens (primary…senary) mit
  -- eigenen Hex-Farben überschreiben, z.B. {"primary":"#ff0000"}. Wird beim
  -- Lesen gegen die gültigen Token-IDs/Hex-Werte gefiltert (sanitizeThemeOverrides).
  theme_overrides               JSONB NOT NULL DEFAULT '{}',
  -- UI-Modus der Oberfläche: 'lcars' (Default, volles LCARS-Design) oder
  -- 'minimal' (schlankes, minimalistisches UI, siehe src/lib/uiMode.ts /
  -- src/styles/minimal-ui.css). Kein DB-CHECK (analog color_theme), unbekannte
  -- Werte fallen App-seitig auf 'lcars' zurück.
  ui_mode                       TEXT NOT NULL DEFAULT 'lcars',
  -- Hell/Dunkel-Modus, unabhängig von ui_mode und color_theme: 'dark'
  -- (Default) oder 'light' (siehe src/lib/colorMode.ts /
  -- src/styles/color-mode.css). Kein DB-CHECK (analog ui_mode), unbekannte
  -- Werte fallen App-seitig auf 'dark' zurück.
  color_mode                    TEXT NOT NULL DEFAULT 'dark',
  additional_roles              TEXT[] NOT NULL DEFAULT '{}',
  permission_overrides          JSONB NOT NULL DEFAULT '{}'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_slug ON users(slug);

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------
-- DB-gestützte Rollendefinitionen (granulares RBAC, siehe src/lib/permissions.ts
-- und src/lib/roles.ts). Über /admin/permissions anleg-/bearbeitbar. key ist
-- der in users.role / users.additional_roles referenzierte Schlüssel;
-- permissions ist die Menge der von der Rolle gewährten Rechte (Funktionsbereich-
-- Schlüssel aus PERMISSIONS). is_system markiert die fünf eingebauten Rollen
-- (admin/gm/player/viewer/guest): inhaltlich bearbeitbar, aber nicht löschbar,
-- Schlüssel unveränderlich. Die System-Rollen werden von der Anwendung bei
-- Bedarf selbst nachgezogen (ensureSystemRoles), daher hier bewusst KEIN
-- Daten-Seed (schema.sql bleibt datenfrei).
CREATE TABLE IF NOT EXISTS roles (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_system   BOOLEAN NOT NULL DEFAULT false,
  sort_order  INT NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- characters
-- ---------------------------------------------------------------------------
-- source_md = roher Markdown-Body, frontmatter = geparstes Frontmatter.
-- visibility: private (nur Owner) | gm (Owner + gm/admin) | public (alle) —
-- Auswertung in src/lib/visibility.ts. deleted_at: Soft-Delete (7-Tage-
-- Papierkorb, danach purge-soft-deleted.ts). is_draft: unfertiger Entwurf,
-- für NIEMANDEN außer dem Owner sichtbar (auch nicht Admin/GM, siehe
-- canViewDraft), erlaubt leeren Text beim Speichern. character_color: vom
-- Owner gewählte Farbe für DIESEN Charakter (färbt dessen wörtliche Rede im
-- Fließtext-Modus sowie seine Nachrichten-Karten in Dialogen, siehe
-- src/lib/characterColor.ts) — freie Hex-Farbe (#rrggbb), NULL = keine
-- explizite Wahl → die App leitet deterministisch eine LCARS-Farbe aus der
-- Charakter-ID ab. PRO CHARAKTER statt pro User, damit ein User mit
-- mehreren Charakteren ("Multis") für jeden eine eigene Farbe wählen kann.
-- Partieller UNIQUE-Index (unten) macht jede belegte Farbe exklusiv (in
-- Benutzung = für andere Charaktere gesperrt).
CREATE TABLE IF NOT EXISTS characters (
  id              SERIAL PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'retired', 'deceased')),
  player_id       INT REFERENCES users(id) ON DELETE SET NULL,
  portrait        TEXT,
  species         TEXT,
  rank            TEXT,
  bio             TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  source_md       TEXT,
  frontmatter     JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visibility      TEXT NOT NULL DEFAULT 'public'
                    CHECK (visibility IN ('private', 'gm', 'public')),
  deleted_at      TIMESTAMPTZ,
  is_draft        BOOLEAN NOT NULL DEFAULT false,
  character_color TEXT
                    CHECK (character_color IS NULL OR character_color ~ '^#[0-9a-fA-F]{6}$')
);
CREATE INDEX IF NOT EXISTS idx_characters_status     ON characters(status);
CREATE INDEX IF NOT EXISTS idx_characters_player     ON characters(player_id);
CREATE INDEX IF NOT EXISTS idx_characters_deleted_at ON characters(deleted_at);
CREATE INDEX IF NOT EXISTS idx_characters_is_draft   ON characters(is_draft);
-- Namenssuche (ILIKE '%q%', src/lib/search.ts) über Trigramm-GIN.
CREATE INDEX IF NOT EXISTS idx_characters_name_trgm  ON characters USING GIN (name gin_trgm_ops);
-- Der partielle UNIQUE-Index auf character_color (macht jede belegte Farbe
-- exklusiv) steht bewusst NICHT hier, sondern erst im Migrationen-Abschnitt
-- unten: character_color ist neu genug, dass er auf einer bereits
-- bestehenden characters-Tabelle (CREATE TABLE IF NOT EXISTS oben ist dort
-- ein No-op) erst durch die dortige ALTER TABLE ... ADD COLUMN entsteht —
-- ein Index direkt hier würde auf einer solchen DB mit "column does not
-- exist" fehlschlagen, bevor die Spalte angelegt wurde.

-- ---------------------------------------------------------------------------
-- missions
-- ---------------------------------------------------------------------------
-- Missionen haben BEWUSST keine visibility-Spalte (immer public): ohne
-- Einzel-Owner-Modell wäre „private“ nicht sinnvoll definierbar. owner_user_id
-- (aus „owner: <user-slug>“-Frontmatter, resolveOwner in
-- scripts/ingest/shared.ts) dient nur der Zuordnung/Bearbeitungs-Berechtigung.
-- (Eine früher zeitweise existierende summary/synopsis-Spalte wurde wieder
-- entfernt und ist hier nicht mehr enthalten.)
CREATE TABLE IF NOT EXISTS missions (
  id            SERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
  started_at    DATE,
  ended_at      DATE,
  metadata      JSONB NOT NULL DEFAULT '{}',
  source_md     TEXT,
  frontmatter   JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  deleted_at    TIMESTAMPTZ,
  is_draft      BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_missions_status     ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_owner      ON missions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_missions_deleted_at ON missions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_missions_is_draft   ON missions(is_draft);
-- Titelsuche (ILIKE '%q%', src/lib/search.ts) über Trigramm-GIN.
CREATE INDEX IF NOT EXISTS idx_missions_title_trgm ON missions USING GIN (title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- mission_logs
-- ---------------------------------------------------------------------------
-- author_id: ON DELETE SET NULL — eine Charakter-Neuzuordnung reißt bereits
-- geschriebene Logs nicht mit. visibility/deleted_at/is_draft wie bei
-- characters.
CREATE TABLE IF NOT EXISTS mission_logs (
  id            SERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  mission_id    INT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  author_id     INT REFERENCES characters(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  log_date      DATE,
  session_nr    INT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  source_md     TEXT,
  frontmatter   JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  visibility    TEXT NOT NULL DEFAULT 'public'
                  CHECK (visibility IN ('private', 'gm', 'public')),
  deleted_at    TIMESTAMPTZ,
  is_draft      BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_mission_logs_mission    ON mission_logs(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_logs_author     ON mission_logs(author_id);
CREATE INDEX IF NOT EXISTS idx_mission_logs_owner      ON mission_logs(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_mission_logs_deleted_at ON mission_logs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_mission_logs_is_draft   ON mission_logs(is_draft);
-- Titel- UND Volltextsuche (ILIKE '%q%', src/lib/search.ts) über Trigramm-GIN.
CREATE INDEX IF NOT EXISTS idx_mission_logs_title_trgm   ON mission_logs USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mission_logs_content_trgm ON mission_logs USING GIN (content gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- archive_entries
-- ---------------------------------------------------------------------------
-- Kategorie-CHECK enthält 'npc' und 'dialogue' direkt. dialogue_open: In-App-
-- Dialoge (category='dialogue') sind offen (nur unter /dialogues/<slug>,
-- nehmen Nachrichten an) vs. abgeschlossen (im Archiv, read-only) — Vault-
-- Dialoge bleiben beim Default FALSE. owner_user_id/visibility/deleted_at/
-- is_draft wie bei den übrigen Inhaltstypen.
CREATE TABLE IF NOT EXISTS archive_entries (
  id            SERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL
                  CHECK (category IN (
                    'person', 'location', 'item', 'faction',
                    'theory', 'event', 'species', 'other', 'npc', 'dialogue'
                  )),
  content       TEXT NOT NULL,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  metadata      JSONB NOT NULL DEFAULT '{}',
  source_md     TEXT,
  frontmatter   JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dialogue_open BOOLEAN NOT NULL DEFAULT FALSE,
  owner_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  visibility    TEXT NOT NULL DEFAULT 'public'
                  CHECK (visibility IN ('private', 'gm', 'public')),
  deleted_at    TIMESTAMPTZ,
  is_draft      BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_archive_category          ON archive_entries(category);
CREATE INDEX IF NOT EXISTS idx_archive_tags              ON archive_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_archive_entries_owner     ON archive_entries(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_archive_entries_deleted_at ON archive_entries(deleted_at);
CREATE INDEX IF NOT EXISTS idx_archive_entries_is_draft  ON archive_entries(is_draft);
-- Titel- UND Volltextsuche (ILIKE '%q%', src/lib/search.ts) über Trigramm-GIN.
CREATE INDEX IF NOT EXISTS idx_archive_title_trgm        ON archive_entries USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_archive_content_trgm      ON archive_entries USING GIN (content gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- archive_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS archive_links (
  source_id   INT NOT NULL REFERENCES archive_entries(id) ON DELETE CASCADE,
  target_id   INT NOT NULL REFERENCES archive_entries(id) ON DELETE CASCADE,
  label       TEXT,
  PRIMARY KEY (source_id, target_id),
  CHECK (source_id != target_id)
);
CREATE INDEX IF NOT EXISTS idx_archive_links_source ON archive_links(source_id);
CREATE INDEX IF NOT EXISTS idx_archive_links_target ON archive_links(target_id);

-- ---------------------------------------------------------------------------
-- timeline_events
-- ---------------------------------------------------------------------------
-- Tabelle bleibt für eine mögliche künftige Timeline-/Chronik-Funktion
-- erhalten, wird derzeit aber NICHT mehr befüllt: die frühere Timeline-Seite
-- und der Ingest-Aufbau (ehem. scripts/ingest/timeline.ts) sind entfernt. Die
-- <!-- timeline: JJJJ-MM-TT | Titel | Kategorie -->-Marker in Content-Bodys
-- bleiben (erzeugen unsichtbare Sprungmarken, siehe remarkTimelineAnchors in
-- src/lib/markdown.ts) und liefern die Datengrundlage, falls die Funktion
-- später neu aufgebaut wird. idx_..._created bediente getRecentActivitySince()
-- (filtert nach created_at statt nach dem In-Story-Datum event_date).
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
CREATE INDEX IF NOT EXISTS idx_timeline_events_date    ON timeline_events(event_date);
CREATE INDEX IF NOT EXISTS idx_timeline_events_source  ON timeline_events(source_type, source_slug);
CREATE INDEX IF NOT EXISTS idx_timeline_events_created ON timeline_events(created_at);

-- ---------------------------------------------------------------------------
-- password_setup_tokens
-- ---------------------------------------------------------------------------
-- Einmal-Token für die Aktivierungs-/Passwort-setzen-Mail. token_hash statt
-- des Rohtokens (SHA-256, src/lib/passwordSetupTokens.ts) — ein DB-Leak macht
-- die Links nicht direkt nutzbar. used_at markiert verbrauchte Tokens statt
-- sie zu löschen (Nachvollziehbarkeit).
CREATE TABLE IF NOT EXISTS password_setup_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_user ON password_setup_tokens(user_id);

-- ---------------------------------------------------------------------------
-- content_follows
-- ---------------------------------------------------------------------------
-- Lesezeichen/Abos. Zielreferenz per target_type/target_slug (wie bei
-- timeline_events) statt separater Tabellen mit je eigenem FK. target_type
-- deckt alle vier abonnierbaren Typen direkt ab (mission/archive_entry/
-- character/user) — User-Abos benachrichtigen bei jedem neuen/geänderten
-- öffentlichen Inhalt eines abonnierten Users (target_slug = users.slug,
-- notifyUserSubscribers in src/lib/follows.ts).
CREATE TABLE IF NOT EXISTS content_follows (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type   TEXT NOT NULL
                  CHECK (target_type IN ('mission', 'archive_entry', 'character', 'user')),
  target_slug   TEXT NOT NULL,
  bookmarked_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_slug)
);
CREATE INDEX IF NOT EXISTS idx_content_follows_user   ON content_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_content_follows_target ON content_follows(target_type, target_slug);

-- ---------------------------------------------------------------------------
-- dialogue_messages
-- ---------------------------------------------------------------------------
-- Nachrichten eines In-App-Dialogs. Der Dialog selbst ist ein archive_entries-
-- Eintrag der Kategorie 'dialogue'. content = gerendertes (sanitisiertes)
-- HTML, source_md = rohes Markdown (wie bei missions/archive_entries).
-- character_id/author_user_id: ON DELETE SET NULL — author_user_id wird
-- zusätzlich gespeichert (nicht aus characters.player_id abgeleitet), weil
-- player_id sich ändern kann; die Autorenschaft bleibt historisch korrekt.
-- edited_at/deleted_at IS NOT NULL sind selbst die Flags (Soft-Delete: content
-- bleibt erhalten, wird aber als Platzhalter ausgeliefert, damit die
-- Thread-Reihenfolge stabil bleibt).
CREATE TABLE IF NOT EXISTS dialogue_messages (
  id                SERIAL PRIMARY KEY,
  archive_entry_id  INT NOT NULL REFERENCES archive_entries(id) ON DELETE CASCADE,
  -- Wer spricht? Entweder ein Charakter (character_id) ODER ein NPC, also ein
  -- Datenbank-Eintrag der Kategorie "npc" (npc_entry_id) — siehe
  -- src/lib/dialogueSpeaker.ts. Beide nullable und ON DELETE SET NULL: eine
  -- Nachricht bleibt lesbar, auch wenn ihr Sprecher später verschwindet.
  character_id      INT REFERENCES characters(id) ON DELETE SET NULL,
  npc_entry_id      INT REFERENCES archive_entries(id) ON DELETE SET NULL,
  author_user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  content           TEXT NOT NULL,
  source_md         TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at         TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dialogue_messages_entry  ON dialogue_messages(archive_entry_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dialogue_messages_author ON dialogue_messages(author_user_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_messages_npc    ON dialogue_messages(npc_entry_id);

-- ---------------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------------
-- Web-Push-Subscriptions, mehrere pro User (Geräte/Browser). endpoint ist
-- UNIQUE (nicht user_id+endpoint) — ein Endpoint gehört zu Browser+Origin,
-- nicht zu einem Account; bei Account-Wechsel auf demselben Gerät wird die
-- Zeile per ON CONFLICT umgehängt. ON DELETE CASCADE: eine Subscription ohne
-- Owner hat keinen historischen Wert.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- ---------------------------------------------------------------------------
-- content_deletions
-- ---------------------------------------------------------------------------
-- Löschprotokoll für die rote „gelöscht“-Kategorie im News-Feed
-- (NewsSection.tsx). Inhalte werden weich gelöscht (deleted_at auf der
-- Ursprungstabelle) — dieses Protokoll wird beim Weich-Löschen befüllt und
-- ist die eigenständige Datenquelle für einen „X wurde gelöscht“-Eintrag.
-- visibility/owner_user_id werden zum Löschzeitpunkt übernommen (visibility
-- NULL = Mission, die wie live keine eigene visibility hat und immer public
-- ist), damit getRecentDeletions dieselbe Sichtbarkeitsregel anwenden kann.
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

-- ---------------------------------------------------------------------------
-- mission_participants
-- ---------------------------------------------------------------------------
-- Teilnehmende Charaktere einer Mission (Multiselect beim Anlegen). Rein
-- informativ/für die Anlage-Benachrichtigungen (missionAction) — löst KEIN
-- automatisches Mission-Abo aus, das bleibt dem Follow-Button vorbehalten.
CREATE TABLE IF NOT EXISTS mission_participants (
  mission_id   INT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (mission_id, character_id)
);
CREATE INDEX IF NOT EXISTS idx_mission_participants_character ON mission_participants(character_id);

-- ---------------------------------------------------------------------------
-- login_attempts
-- ---------------------------------------------------------------------------
-- Fehlgeschlagene UND erfolgreiche Login-Versuche (src/lib/loginAttempts.ts) —
-- Grundlage für die Brute-Force-Sperre. Bewusst eine DB-Tabelle statt
-- In-Memory-Zähler: die App läuft auf Serverless-Instanzen, ein In-Memory-
-- Zähler würde pro Instanz getrennt zählen. email wird unabhängig davon
-- gezählt, ob die Adresse existiert (sonst ließe sich über das Ausbleiben
-- einer Sperre die Existenz einer Adresse erschließen).
CREATE TABLE IF NOT EXISTS login_attempts (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL,
  ip           TEXT,
  succeeded    BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time    ON login_attempts(ip, attempted_at);

-- ---------------------------------------------------------------------------
-- password_reset_requests
-- ---------------------------------------------------------------------------
-- Analog zu login_attempts, aber für /forgot-password
-- (src/lib/passwordResetLimiter.ts) — begrenzt, wie oft pro E-Mail bzw. IP ein
-- Reset-Mailversand (inkl. Admin-Benachrichtigungs-Fanout) ausgelöst wird.
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL,
  ip           TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email_time ON password_reset_requests(email, requested_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_ip_time    ON password_reset_requests(ip, requested_at);

-- ---------------------------------------------------------------------------
-- admin_audit_log
-- ---------------------------------------------------------------------------
-- Protokoll sicherheitsrelevanter Admin-Actions auf Useraccounts (src/lib/
-- auditLog.ts). Rein lesend über /admin/audit-log. target_user_id bleibt bei
-- einem gelöschten User NULL — details enthält deshalb zusätzlich Name/E-Mail
-- als Klartext-Schnappschuss. ip = Actor-IP (getClientIp), wichtig für die
-- forensische Aufarbeitung eines vermuteten kompromittierten Admin-Accounts.
-- action per CHECK abgesichert (wie jede enum-artige TEXT-Spalte im Schema).
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id             SERIAL PRIMARY KEY,
  actor_id       INT REFERENCES users(id) ON DELETE SET NULL,
  action         TEXT NOT NULL
                   CHECK (action IN (
                     'create_user', 'reset_password', 'update_role', 'update_profile',
                     'deactivate_user', 'reactivate_user', 'delete_user', 'force_logout',
                     'update_roles', 'update_permissions',
                     'create_role', 'edit_role', 'delete_role'
                   )),
  target_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  details        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip             TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at);

-- ---------------------------------------------------------------------------
-- dialogue_npc_speakers
-- ---------------------------------------------------------------------------
-- Wer spricht in einem Gespräch für einen NPC? NPCs sind Datenbank-Einträge
-- der Kategorie "npc" (archive_entries) — an ihnen hängt keine Person, die
-- antworten könnte. Diese Tabelle ordnet sie deshalb PRO GESPRÄCH einem
-- GM-Konto zu: für die Teilnahme-Prüfung (getDialogueParticipantCharacters)
-- zählt dieser Charakter dann wie ein eigener, aber eben nur in diesem einen
-- Gespräch. Höchstens ein Sprecher je NPC und Gespräch (zusammengesetzter
-- Primärschlüssel); ON DELETE CASCADE in alle drei Richtungen — ohne
-- Gespräch, Charakter oder Konto ist die Zuordnung gegenstandslos.
CREATE TABLE IF NOT EXISTS dialogue_npc_speakers (
  archive_entry_id INT NOT NULL REFERENCES archive_entries(id) ON DELETE CASCADE,
  npc_entry_id     INT NOT NULL REFERENCES archive_entries(id) ON DELETE CASCADE,
  user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (archive_entry_id, npc_entry_id)
);
CREATE INDEX IF NOT EXISTS idx_dialogue_npc_speakers_user ON dialogue_npc_speakers(user_id);

-- ---------------------------------------------------------------------------
-- dialogue_reservations
-- ---------------------------------------------------------------------------
-- Antwort-Reservierung für Mehrparteien-Dialoge (>2 Teilnehmende): wer
-- antworten will, reserviert sich für 2 Stunden exklusiv das Antwortrecht.
-- Höchstens eine aktive Reservierung pro Dialog — archive_entry_id ist selbst
-- der Primärschlüssel. Sperrt die ganze Person (held_by_user_id), nicht einen
-- einzelnen Charakter. Freigabe passiv (kein Cronjob): jeder Zugriff räumt
-- abgelaufene Zeilen weg (releaseExpiredDialogueReservation), außerdem endet
-- die Frist vorzeitig, sobald die reservierende Person geantwortet hat.
CREATE TABLE IF NOT EXISTS dialogue_reservations (
  archive_entry_id INT PRIMARY KEY REFERENCES archive_entries(id) ON DELETE CASCADE,
  held_by_user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- dialogue_reservation_notify_requests
-- ---------------------------------------------------------------------------
-- Einmal-Opt-in „informiere mich, wenn diese Antwort-Sperre endet“
-- (requestDialogueReservationNotification) — bewusst NICHT über
-- content_follows (das ist ein dauerhaftes Abo), sondern ein Einmal-Ereignis
-- pro Sperre, das beim Auslösen sofort wieder gelöscht wird.
CREATE TABLE IF NOT EXISTS dialogue_reservation_notify_requests (
  archive_entry_id INT NOT NULL REFERENCES archive_entries(id) ON DELETE CASCADE,
  user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (archive_entry_id, user_id)
);

-- ---------------------------------------------------------------------------
-- error_logs
-- ---------------------------------------------------------------------------
-- Protokoll unerwarteter Serverfehler (Next.js instrumentation.ts/
-- onRequestError, src/lib/errorLog.ts) — sowohl nicht abgefangene Abstürze
-- (route_type 'render'/'route'/'action') als auch manuell per logCaughtError
-- ergänzte 'caught'-Fehler. Rein lesend über /admin/error-log. digest =
-- Next.js-Korrelations-Hash (nullable, nicht jeder Pfad liefert einen).
-- route_type bewusst freies TEXT ohne CHECK (deckt Next.js-Werte UND 'caught').
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
CREATE INDEX IF NOT EXISTS idx_error_logs_digest     ON error_logs(digest);

-- ---------------------------------------------------------------------------
-- content_images
-- ---------------------------------------------------------------------------
-- Bild-Uploads für Charaktere/Missionen/Missionslogs/Archiv-Einträge (nicht
-- Dialoge). Mehrere Bilder pro Inhalt möglich (Galerie/Karussell), deshalb
-- eigene Tabelle statt einer Spalte wie characters.portrait (die bleibt als
-- „aktuell ausgewähltes Profilbild“ bestehen). r2_key verweist auf das Objekt
-- im selben R2-Bucket wie die DB-Backups (Präfix content-images/).
CREATE TABLE IF NOT EXISTS content_images (
  id           SERIAL PRIMARY KEY,
  content_type TEXT NOT NULL
                 CHECK (content_type IN (
                   'character', 'mission', 'mission_log', 'archive_entry'
                 )),
  content_id   INT NOT NULL,
  r2_key       TEXT UNIQUE NOT NULL,
  content_mime TEXT NOT NULL,
  size_bytes   INT NOT NULL,
  uploaded_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_images_content ON content_images(content_type, content_id);


-- ---------------------------------------------------------------------------
-- character_ap_entries
-- ---------------------------------------------------------------------------
-- Erfahrungspunkte-Konto (AP = Advancement Points) je Charakter als
-- Buchungsjournal statt eines einzelnen Saldo-Felds: jede Vergabe (Session,
-- Logbuch, Missions-/Story-Abschluss) und jede Ausgabe (Steigerung) ist eine
-- eigene Zeile, der Kontostand ist ihre Summe. Das hält nachvollziehbar, WOFÜR
-- AP kamen und gingen, und lässt sich einzeln korrigieren.
--
-- amount: positiv = vergeben, negativ = ausgegeben. reason klassifiziert die
-- Buchung (siehe AP_REASONS in src/lib/characterAp.ts), note trägt den
-- Klartext ("Session 42", "Kontrolle 9 → 10").
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
-- campaign_settings
-- ---------------------------------------------------------------------------
-- Kampagnen-weite Einstellungen der Spielleitung (Einzeilen-Tabelle) — hält
-- das aktuelle Ingame-Jahr, aus dem zusammen mit characters.metadata.dateOfBirth das
-- angezeigte Charakter-Alter abgeleitet wird (src/lib/campaign.ts). Der
-- BOOLEAN-Primärschlüssel mit CHECK (id) erzwingt höchstens eine Zeile.
CREATE TABLE IF NOT EXISTS campaign_settings (
  id          BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  ingame_year INT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- ---------------------------------------------------------------------------
-- news_seen
-- ---------------------------------------------------------------------------
-- Persistente News-Anzeige auf dem Dashboard (NewsSection.tsx): eine News
-- bleibt sichtbar, bis der User sie per X ausblendet ODER den zugehörigen
-- Inhalt aufruft — löste das frühere „News seit dem letzten Dashboard-Besuch"-
-- Modell (last_dashboard_visit_at als Grenze) ab. seen_at ist die Grenze pro
-- Ziel: eine News gilt als erledigt, wenn ihr Zeitstempel <= seen_at ist (eine
-- spätere Bearbeitung mit neuerem Zeitstempel taucht dadurch wieder auf).
-- target_key = Slug bei Inhalten, content_deletions.id (als Text) bei
-- Löschungen (target_type 'deletion', die nie „aufgerufen" werden können).
CREATE TABLE IF NOT EXISTS news_seen (
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_key  TEXT NOT NULL,
  seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, target_type, target_key)
);
CREATE INDEX IF NOT EXISTS idx_news_seen_user ON news_seen(user_id);

-- ---------------------------------------------------------------------------
-- content_embeddings
-- ---------------------------------------------------------------------------
-- Vektor-Index des RAG-Systems (src/lib/embeddings.ts erzeugt die Zeilen,
-- src/lib/rag.ts fragt sie ab). Jede Zeile ist EIN Chunk eines Inhalts
-- (content_type + content_id) mit seinem Embedding-Vektor (OpenAI
-- text-embedding-3-small, volle 1536 Dimensionen) und einer Kopie des
-- Chunk-Textes für den Prompt-Kontext.
--
-- RBAC-Felder (visibility/owner_id/is_draft/is_active) sind BEWUSST vom
-- Quell-Inhalt DENORMALISIERT: die Vektorsuche filtert direkt auf dieser
-- Tabelle (kein JOIN auf characters/missions/… pro Query), mit derselben
-- Logik wie canView() in src/lib/visibility.ts. Sie werden von den
-- Content-Mutationen mitgeschrieben (Sichtbarkeits-Änderung → UPDATE
-- visibility; Soft-Delete → is_active=false; siehe embeddings.ts).
--   - owner_id: die für den Typ zuständige Owner-Spalte (player_id bei
--     characters, owner_user_id bei mission_logs/archive_entries; missions
--     sind immer public und haben keinen wirksamen Owner-Bypass).
--   - is_active: false, sobald der Quell-Inhalt soft-deleted ist
--     (deleted_at IS NOT NULL) — die Suche schließt inaktive Chunks aus,
--     ohne die Zeile sofort löschen zu müssen (das erledigt der endgültige
--     Purge über deleteEmbeddings()).
--
-- href/title/slug: für die Quellen-Angaben unter der RAG-Antwort, damit die
-- Retrieval-Query keine weiteren Tabellen ansehen muss.
--
-- UNIQUE (content_type, content_id, chunk_index): Grundlage des Upserts
-- (ON CONFLICT) in upsertEmbeddings() und zugleich der Lookup-Index für
-- Update/Delete eines ganzen Inhalts (Prefix content_type, content_id).
CREATE TABLE IF NOT EXISTS content_embeddings (
  id           BIGSERIAL PRIMARY KEY,
  content_type TEXT NOT NULL
                 CHECK (content_type IN (
                   'character', 'mission', 'mission_log',
                   'archive_entry', 'dialogue'
                 )),
  content_id   INT NOT NULL,
  chunk_index  INT NOT NULL,
  chunk_text   TEXT NOT NULL,
  embedding    vector(1536) NOT NULL,
  visibility   TEXT NOT NULL DEFAULT 'public'
                 CHECK (visibility IN ('private', 'gm', 'public')),
  owner_id     INT,
  is_draft     BOOLEAN NOT NULL DEFAULT false,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  title        TEXT,
  slug         TEXT,
  href         TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (content_type, content_id, chunk_index)
);
-- Cosine-Distance-Suche (<=>) über HNSW — für den kleinen Fan-Archiv-Korpus
-- nicht zwingend (ein seq scan wäre schnell genug), aber ohne Kosten für die
-- Zukunft angelegt. Falls die installierte pgvector-Version kein HNSW kann,
-- kann dieser eine Index entfallen; die Query funktioniert (langsamer) auch
-- ohne ihn.
CREATE INDEX IF NOT EXISTS idx_content_embeddings_vec
  ON content_embeddings USING hnsw (embedding vector_cosine_ops);
-- Für den RBAC-Vorfilter der Vektorsuche (nur aktive, sichtbare Chunks).
CREATE INDEX IF NOT EXISTS idx_content_embeddings_rbac
  ON content_embeddings(is_active, visibility);

-- ---------------------------------------------------------------------------
-- Migrationen seit der letzten Schema-Konsolidierung
-- ---------------------------------------------------------------------------
-- Neue Spalten sind in den CREATE-TABLE-Blöcken oben bereits vollständig
-- enthalten (frische DBs bekommen sie direkt). Bestehende DBs werden von
-- CREATE TABLE IF NOT EXISTS aber nicht mehr angefasst — für sie ziehen die
-- folgenden, idempotenten ALTER die Änderungen nach. Bleibt bewusst additiv
-- (kein datenveränderndes UPDATE) und wird bei der nächsten Konsolidierung
-- wieder in die CREATE-TABLE-Blöcke oben eingeklappt.

-- character_color: Spalte auf characters anlegen (falls fehlt) — lebt PRO
-- CHARAKTER, nicht pro User (ein User mit mehreren Charakteren, "Multis",
-- kann so für jeden eine eigene Farbe wählen). DROP/ADD CONSTRAINT ersetzt
-- einen evtl. noch vorhandenen alten CHECK; der partielle UNIQUE-Index macht
-- belegte Farben exklusiv.
ALTER TABLE characters ADD COLUMN IF NOT EXISTS character_color TEXT;
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_character_color_check;
ALTER TABLE characters ADD CONSTRAINT characters_character_color_check
  CHECK (character_color IS NULL OR character_color ~ '^#[0-9a-fA-F]{6}$');
CREATE UNIQUE INDEX IF NOT EXISTS idx_characters_character_color
  ON characters(character_color) WHERE character_color IS NOT NULL;

-- Die frühere (nie in Produktion ausgerollte) Fassung dieser Spalte lag auf
-- users statt characters — falls eine DB (z.B. lokale Entwicklungsumgebung)
-- diese Zwischenversion bereits angelegt hat, wird sie hier zurückgebaut,
-- damit users nicht dauerhaft eine tote, ungenutzte Spalte behält.
DROP INDEX IF EXISTS idx_users_character_color;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_character_color_check;
ALTER TABLE users DROP COLUMN IF EXISTS character_color;

-- news_kinds: welche News-Arten der User sehen will (Default = nur 'created').
ALTER TABLE users ADD COLUMN IF NOT EXISTS news_kinds TEXT[] NOT NULL
  DEFAULT '{created}';

-- color_theme: gewähltes LCARS-Farbtheme (siehe src/lib/themes.ts). Default
-- 'standard' = unverändertes DS9/VOY-Interface. Bewusst ohne CHECK — neue
-- Themes kommen ohne Migration hinzu, die App validiert gegen COLOR_THEMES.
ALTER TABLE users ADD COLUMN IF NOT EXISTS color_theme TEXT NOT NULL
  DEFAULT 'standard';

-- theme_overrides: individuelle Akzent-Farben, die das gewählte Theme
-- überschreiben (JSONB Token→Hex). Default '{}' = keine Individualisierung.
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_overrides JSONB NOT NULL
  DEFAULT '{}';

-- color_mode: Hell/Dunkel-Modus, unabhängig von ui_mode/color_theme (siehe
-- src/lib/colorMode.ts). Default 'dark'. Die Datenmigration alter
-- ui_mode='minimal-light'-Konten nach ui_mode='minimal' + color_mode='light'
-- lebt bewusst nur in migrate-pr64.sql (kein datenveränderndes UPDATE hier).
ALTER TABLE users ADD COLUMN IF NOT EXISTS color_mode TEXT NOT NULL
  DEFAULT 'dark';

-- RBAC: weitere Rollen (ein User kann mehrere haben) + individuelle
-- Rechte-Overrides (siehe src/lib/permissions.ts). Reine Struktur-Anlage; die
-- verhaltenswahrende Backfill-Zuweisung der Zusatzrollen für Bestandskonten
-- lebt bewusst nur in migrate-pr51.sql (kein datenveränderndes UPDATE hier).
ALTER TABLE users ADD COLUMN IF NOT EXISTS additional_roles TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permission_overrides JSONB NOT NULL DEFAULT '{}';

-- RBAC: Rollen sind jetzt DB-gestützt (Tabelle roles) und frei anlegbar. Der
-- alte feste CHECK auf users.role wird entfernt; gültige Schlüssel prüft die
-- Anwendung gegen die roles-Tabelle. roles-Tabelle idempotent nachziehen
-- (Struktur; die System-Rollen zieht die App per ensureSystemRoles nach).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
CREATE TABLE IF NOT EXISTS roles (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_system   BOOLEAN NOT NULL DEFAULT false,
  sort_order  INT NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- admin_audit_log: neue Aktionsarten 'update_roles'/'update_permissions' sowie
-- die Rollen-Editor-Aktionen 'create_role'/'edit_role'/'delete_role' zulassen
-- (DROP/ADD des CHECK, idempotent).
ALTER TABLE admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;
ALTER TABLE admin_audit_log ADD CONSTRAINT admin_audit_log_action_check
  CHECK (action IN (
    'create_user', 'reset_password', 'update_role', 'update_profile',
    'deactivate_user', 'reactivate_user', 'delete_user', 'force_logout',
    'update_roles', 'update_permissions',
    'create_role', 'edit_role', 'delete_role'
  ));
