import "server-only";
import { cache } from "react";
import postgres from "postgres";
import sql from "@/lib/db";
import { slugifyBase } from "@/lib/slug";
import { buildRoleMap } from "@/lib/roles";
import { userPermissions } from "@/lib/permissions";
import type { User } from "@/types/db";

// Optionaler Client-Parameter für Aufrufe innerhalb einer Transaktion (z.B.
// withEmailLoginLock in loginAttempts.ts) — nötig, weil src/lib/db.ts nur
// EINE Connection pro Prozess erlaubt (max: 1): ein Aufruf über den
// globalen sql-Client während eine sql.begin()-Transaktion die einzige
// Connection hält, würde sonst auf eine nie freiwerdende Connection warten
// (Deadlock, siehe Kommentar bei getUserCredentialsByEmail unten).
type SqlClient = postgres.ISql;

const USER_COLUMNS = sql`
  id, email, name, slug, role, is_active, created_at, last_login_at, previous_login_at,
  last_visit_at, last_dashboard_visit_at,
  email_notifications_enabled, push_notifications_enabled, notify_content_types,
  news_kinds, color_theme, theme_overrides, ui_mode, additional_roles, permission_overrides,
  session_version
`;

// Probiert slugifyBase(name), "${base}-2", "${base}-3", … bis ein Slug in
// users frei ist — gleiches Muster wie generateUniqueArchiveEntrySlug in
// src/lib/archive.ts.
async function generateUniqueUserSlug(name: string): Promise<string> {
  const base = slugifyBase(name);
  let candidate = base;
  let n = 2;

  for (;;) {
    const [row] = await sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM users WHERE slug = ${candidate}) AS exists
    `;
    if (!row.exists) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

export class EmailTakenError extends Error {}

// React-cache-dedupliziert pro Anfrage: derselbe User wird innerhalb EINES
// Requests aus mehreren Richtungen geholt (getCurrentUser in lib/dal.ts,
// getViewer in lib/visibility.ts, dazu Seiten wie app/page.tsx, die die
// Session-ID direkt auflösen). Ohne cache() schickte jede dieser Stellen ihre
// eigene identische Abfrage — auf dem Dashboard waren das nachweislich zwei
// gleiche users-Queries pro Aufruf. cache() gilt nur innerhalb einer Anfrage,
// ändert also nichts an der Frische über Requests hinweg.
export const getUserById = cache(async (id: number): Promise<User | null> => {
  const rows = await sql<User[]>`
    SELECT ${USER_COLUMNS}
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
});

// Vorheriges last_login_at wird nach previous_login_at verschoben, bevor
// last_login_at auf NOW() gesetzt wird — so bleibt der Zeitpunkt des
// *vorletzten* Logins nachvollziehbar (angezeigt im Admin-Panel, siehe
// admin/[id]/edit/page.tsx). Bewusst eine eigene DB-Spalte statt
// Cookie-Payload, damit ein Profil-Update (updateUser) diesen Zeitpunkt
// nicht versehentlich zurücksetzen kann.
export async function recordLogin(userId: number): Promise<void> {
  await sql`
    UPDATE users
    SET previous_login_at = last_login_at, last_login_at = NOW()
    WHERE id = ${userId}
  `;
}

// Aktualisiert last_visit_at bei (praktisch) jedem Seitenaufruf — aufgerufen
// aus /api/session/route.ts, das der Header client-seitig auf jeder Seite
// abfragt. Ohne Drosselung wäre das ein DB-Write pro Seitenaufruf; das
// bedingte UPDATE (kein Write, wenn der Wert noch keine 15 Minuten alt ist)
// senkt das auf höchstens einen Write pro Nutzer alle 15 Minuten, ganz ohne
// In-Memory-Cache oder zusätzliches Cookie — funktioniert dadurch unverändert
// über mehrere Serverless-Instanzen hinweg. Synchron awaited (kein after()
// mehr, siehe Kommentar in /api/session/route.ts) — die geringe Antwortzeit
// eines gedrosselten No-op-UPDATE ist der sichere Trade-off gegenüber einem
// nach der Response möglicherweise abgebrochenen Background-Write.
export async function touchLastVisit(userId: number): Promise<void> {
  await sql`
    UPDATE users
    SET last_visit_at = NOW()
    WHERE id = ${userId}
      AND (last_visit_at IS NULL OR last_visit_at < NOW() - INTERVAL '15 minutes')
  `;
}

export interface UserWithCharacters extends User {
  characters: { id: number; slug: string; name: string }[];
}

export async function listAllUsers(): Promise<UserWithCharacters[]> {
  const rows = await sql<UserWithCharacters[]>`
    SELECT
      u.id, u.email, u.name, u.slug, u.role, u.is_active, u.created_at,
      u.last_login_at, u.previous_login_at, u.last_visit_at, u.last_dashboard_visit_at,
      u.email_notifications_enabled, u.push_notifications_enabled, u.notify_content_types,
      u.news_kinds, u.additional_roles, u.permission_overrides,
      COALESCE(
        jsonb_agg(
          jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name)
          ORDER BY c.name
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::jsonb
      ) AS characters
    FROM users u
    LEFT JOIN characters c ON c.player_id = u.id
    GROUP BY u.id
    ORDER BY
      CASE u.role
        WHEN 'admin' THEN 0 WHEN 'gm' THEN 1 WHEN 'player' THEN 2
        WHEN 'viewer' THEN 3 WHEN 'guest' THEN 4
      END,
      u.name ASC
  `;
  return rows.map((row) => ({
    ...row,
    characters:
      typeof row.characters === "string"
        ? JSON.parse(row.characters)
        : row.characters,
  }));
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: User["role"];
}

// requires_activation = true: vom GM neu angelegte Konten müssen erst den
// Aktivierungslink benutzen (siehe scripts/schema.sql), bevor sie sich
// einloggen können — anders als Bestandskonten ohne Passwort.
export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    const slug = await generateUniqueUserSlug(input.name);
    const rows = await sql<User[]>`
      INSERT INTO users (email, name, slug, role, requires_activation)
      VALUES (${input.email}, ${input.name}, ${slug}, ${input.role}, true)
      RETURNING ${USER_COLUMNS}
    `;
    return rows[0];
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new EmailTakenError("E-Mail-Adresse wird bereits verwendet.");
    }
    throw err;
  }
}

// Granulares RBAC: setzt Primärrolle + Zusatzrollen zusammen (ein User kann
// mehrere Rollen haben, siehe src/lib/permissions.ts). additionalRoles wird
// ohne die Primärrolle gespeichert (Duplikate/Primärrolle werden beim Auflösen
// ohnehin dedupliziert).
export async function updateUserRoles(
  id: number,
  role: User["role"],
  additionalRoles: User["role"][],
): Promise<User> {
  const extra = additionalRoles.filter((r) => r !== role);
  const rows = await sql<User[]>`
    UPDATE users
    SET role = ${role}, additional_roles = ${extra}
    WHERE id = ${id}
    RETURNING ${USER_COLUMNS}
  `;
  return rows[0];
}

// Individuelle Rechte-Overrides (Permission→bool) eines Users setzen.
export async function updateUserPermissionOverrides(
  id: number,
  overrides: Record<string, boolean>,
): Promise<User> {
  const rows = await sql<User[]>`
    UPDATE users
    SET permission_overrides = ${sql.json(overrides)}
    WHERE id = ${id}
    RETURNING ${USER_COLUMNS}
  `;
  return rows[0];
}

// Deaktivieren ist ein Soft-Block (Login-Gate in src/app/login/actions.ts),
// Löschen ein hartes DELETE — schema-sicher, da characters.player_id/
// dialogue_messages.author_user_id ON DELETE SET NULL sind und
// content_follows.user_id ON DELETE CASCADE ist.
export async function setUserActive(
  id: number,
  active: boolean,
): Promise<void> {
  await sql`UPDATE users SET is_active = ${active} WHERE id = ${id}`;
}

export async function deleteUser(id: number): Promise<void> {
  await sql`DELETE FROM users WHERE id = ${id}`;
}

// Exportiert (auch für src/lib/characters.ts — charakterbezogene Unique-
// Constraints wie characters_character_color_check nutzen dieselbe Prüfung).
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

export interface UpdateUserInput {
  name: string;
  email: string;
}

export interface NotificationPreferencesInput {
  emailEnabled: boolean;
  pushEnabled: boolean;
  // Admin-Opt-in "Über alle Inhalte benachrichtigt werden" — nur bei Admins
  // in der UI editierbar (NotificationSettingsForm.tsx), für alle anderen
  // Rollen bleibt das Array leer.
  notifyContentTypes: string[];
}

// Zwei globale Schalter, gelten einheitlich für alle Benachrichtigungs-
// Ereignistypen (siehe scripts/schema.sql) — kein granulares Opt-out pro
// Ereignis.
export async function updateNotificationPreferences(
  id: number,
  data: NotificationPreferencesInput,
): Promise<void> {
  await sql`
    UPDATE users
    SET email_notifications_enabled = ${data.emailEnabled},
        push_notifications_enabled = ${data.pushEnabled},
        notify_content_types = ${data.notifyContentTypes}
    WHERE id = ${id}
  `;
}

// Welche News-Arten der User auf dem Dashboard sehen will (Teilmenge von
// "created"/"updated"/"deleted", siehe NewsSection.tsx). Leeres Array =
// keine News.
export async function updateNewsKinds(
  id: number,
  kinds: string[],
): Promise<void> {
  await sql`
    UPDATE users SET news_kinds = ${kinds} WHERE id = ${id}
  `;
}

// Globale Präferenz (nicht pro Dialog): Fließtext oder Karten-Ansicht für
// abgeschlossene Dialoge (siehe DialogueViewToggle.tsx). Eigene schlanke
// Lese-/Schreibfunktionen statt Teil von USER_COLUMNS/dem vollen User-Objekt
// — wird gezielt nur dort gebraucht, wo ein geschlossener Dialog gerendert
// wird (archive/[slug]/page.tsx), nicht bei jedem User-Fetch.
export async function getDialogueViewPreference(
  userId: number,
): Promise<boolean> {
  const [row] = await sql<{ dialogue_flowing_text_enabled: boolean }[]>`
    SELECT dialogue_flowing_text_enabled FROM users WHERE id = ${userId}
  `;
  return row?.dialogue_flowing_text_enabled ?? true;
}

export async function updateDialogueViewPreference(
  userId: number,
  flowingTextEnabled: boolean,
): Promise<void> {
  await sql`
    UPDATE users SET dialogue_flowing_text_enabled = ${flowingTextEnabled}
    WHERE id = ${userId}
  `;
}

// Globale Präferenz (nicht pro Feld): native Browser-Rechtschreibprüfung in
// allen Markdown-Editor-Feldern (MarkdownEditor.tsx). Eigene schlanke
// Lese-/Schreibfunktionen statt Teil von USER_COLUMNS — MarkdownEditor.tsx
// holt sich den Wert per direktem Client-Fetch (getEditorSpellcheckPreferenceAction
// in app/actions/editorPreferences.ts, siehe getFollowState/FollowButtons.tsx
// für dasselbe Muster) statt durch alle sechs Aufrufstellen durchgereicht zu
// werden.
export async function getEditorSpellcheckPreference(
  userId: number,
): Promise<boolean> {
  const [row] = await sql<{ editor_spellcheck_enabled: boolean }[]>`
    SELECT editor_spellcheck_enabled FROM users WHERE id = ${userId}
  `;
  return row?.editor_spellcheck_enabled ?? true;
}

export async function updateEditorSpellcheckPreference(
  userId: number,
  enabled: boolean,
): Promise<void> {
  await sql`
    UPDATE users SET editor_spellcheck_enabled = ${enabled}
    WHERE id = ${userId}
  `;
}

// Farbtheme der Oberfläche (siehe src/lib/themes.ts). Der Wert lebt als
// color_theme im vollen User-Objekt (USER_COLUMNS) — Lesen läuft daher über
// getUserById/getCurrentUser, hier braucht es nur den Schreibpfad. Die
// Validierung/Normalisierung gegen COLOR_THEMES passiert beim Aufrufer
// (isValidThemeId/normalizeThemeId), damit ein veraltetes Theme still auf
// 'standard' fällt.
export async function updateColorThemePreference(
  userId: number,
  theme: string,
): Promise<void> {
  await sql`
    UPDATE users SET color_theme = ${theme}
    WHERE id = ${userId}
  `;
}

// Individualisierung des Themes (theme_overrides, Token→Hex). Der Aufrufer
// filtert vorher mit sanitizeThemeOverrides — hier wird nur geschrieben. Als
// JSONB serialisiert (postgres.js: sql.json).
export async function updateThemeOverrides(
  userId: number,
  overrides: Record<string, string>,
): Promise<void> {
  await sql`
    UPDATE users SET theme_overrides = ${sql.json(overrides)}
    WHERE id = ${userId}
  `;
}

// UI-Modus der Oberfläche ('lcars' | 'minimal', siehe src/lib/uiMode.ts). Wie
// color_theme lebt der Wert im vollen User-Objekt (USER_COLUMNS) — hier nur der
// Schreibpfad. Die Normalisierung (normalizeUiMode) passiert beim Aufrufer.
export async function updateUiModePreference(
  userId: number,
  mode: string,
): Promise<void> {
  await sql`
    UPDATE users SET ui_mode = ${mode}
    WHERE id = ${userId}
  `;
}

// Charakter-Farbe: lebt jetzt auf characters.character_color statt hier (ein
// User mit mehreren Charakteren — „Multis" — kann so für jeden Charakter eine
// eigene Farbe wählen statt einer einzigen für alle). Siehe
// getCharacterColorPreference/getUsedCharacterColorsWithIds/
// updateCharacterColorPreference/ColorTakenError in src/lib/characters.ts.

export async function updateUser(
  id: number,
  data: UpdateUserInput,
): Promise<User> {
  try {
    const rows = await sql<User[]>`
      UPDATE users
      SET name = ${data.name}, email = ${data.email}
      WHERE id = ${id}
      RETURNING ${USER_COLUMNS}
    `;
    return rows[0];
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new EmailTakenError("E-Mail-Adresse wird bereits verwendet.");
    }
    throw err;
  }
}

// ── Passwort/Login-Interna ──────────────────────────────────────────
// Bewusst getrennt von USER_COLUMNS/User: password_hash darf nie in einer
// Prop an eine Client Component landen. Diese Funktionen werden
// ausschließlich serverseitig in Login-/Passwort-Server-Actions benutzt.

export interface UserCredentials {
  id: number;
  email: string;
  name: string;
  role: User["role"];
  is_active: boolean;
  password_hash: string | null;
  requires_activation: boolean;
  session_version: number;
  // Für createSession beim Login mitgeladen, damit die Theme-Cookies direkt aus
  // der gespeicherten Präferenz gesetzt werden (siehe src/lib/session.ts) —
  // sonst greift das gewählte Farbtheme erst nach dem nächsten Speichern.
  color_theme: string;
  theme_overrides: Record<string, string>;
  ui_mode: string;
}

// client optional per Default der globale sql-Client, kann aber eine
// Transaction (tx aus sql.begin()) sein — siehe withEmailLoginLock in
// loginAttempts.ts: login/actions.ts ruft diese Funktion innerhalb dieser
// Transaktion auf und MUSS dafür tx übergeben (siehe SqlClient-Kommentar
// oben).
export async function getUserCredentialsByEmail(
  email: string,
  client: SqlClient = sql,
): Promise<UserCredentials | null> {
  const rows = await client<UserCredentials[]>`
    SELECT id, email, name, role, is_active, password_hash, requires_activation,
           session_version, color_theme, theme_overrides, ui_mode
    FROM users
    WHERE lower(email) = ${email}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// Client-sicher: nur das Boolean, nie der Hash selbst (für den
// "Passwort jetzt festlegen"-Hinweis auf Dashboard/Settings).
export async function hasPassword(userId: number): Promise<boolean> {
  const rows = await sql<{ has_password: boolean }[]>`
    SELECT password_hash IS NOT NULL AS has_password
    FROM users
    WHERE id = ${userId}
  `;
  return rows[0]?.has_password ?? false;
}

export interface UserWithPasswordStatus extends User {
  hasPassword: boolean;
}

// Wie getUserById, nur zusätzlich mit hasPassword in einer einzigen Query
// — für die Settings-Seite, die beides in jedem Fall braucht und sich so
// einen zweiten Roundtrip spart. Wieder ohne den Hash selbst.
export async function getUserWithPasswordStatus(
  id: number,
): Promise<UserWithPasswordStatus | null> {
  const rows = await sql<(User & { has_password: boolean })[]>`
    SELECT ${USER_COLUMNS}, password_hash IS NOT NULL AS has_password
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  const { has_password, ...user } = row;
  return { ...user, hasPassword: has_password };
}

export interface UserAdminDetail extends User {
  hasPassword: boolean;
  requiresActivation: boolean;
  characters: { id: number; slug: string; name: string }[];
}

// Für /admin/[id]/edit: alle Felder, die die Admin-Bearbeitungsseite
// anzeigt — inkl. Passwort-/Aktivierungsstatus (wieder nur als Boolean,
// nie der Hash selbst, siehe Kommentar oben bei UserCredentials) und
// zugewiesene Charaktere (read-only Kontext, Zuweisung selbst bleibt
// CharacterAssignmentTable auf /admin vorbehalten).
export async function getUserForAdmin(
  id: number,
): Promise<UserAdminDetail | null> {
  const rows = await sql<
    (User & {
      has_password: boolean;
      requires_activation: boolean;
      characters: { id: number; slug: string; name: string }[];
    })[]
  >`
    SELECT
      u.id, u.email, u.name, u.slug, u.role, u.is_active, u.created_at,
      u.last_login_at, u.previous_login_at, u.last_visit_at, u.last_dashboard_visit_at,
      u.email_notifications_enabled, u.push_notifications_enabled, u.notify_content_types,
      u.news_kinds, u.additional_roles, u.permission_overrides,
      u.password_hash IS NOT NULL AS has_password,
      u.requires_activation,
      COALESCE(
        jsonb_agg(
          jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name)
          ORDER BY c.name
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::jsonb
      ) AS characters
    FROM users u
    LEFT JOIN characters c ON c.player_id = u.id
    WHERE u.id = ${id}
    GROUP BY u.id
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  const { has_password, requires_activation, characters, ...user } = row;
  return {
    ...user,
    hasPassword: has_password,
    requiresActivation: requires_activation,
    characters:
      typeof characters === "string" ? JSON.parse(characters) : characters,
  };
}

export interface AdminContact {
  email: string;
  name: string;
}

// Für den Fan-out administrativer Benachrichtigungen (Sicherheitsmail bei
// /forgot-password, täglicher Log-Digest) an alle Admins — nur AKTIVE Konten.
// „Admin" heißt hier: hat das Recht admin.access — nicht mehr nur die
// Primärrolle role='admin'. So erreicht die Mail auch Konten, die admin.access
// über eine Zusatzrolle, eine eigene Rolle oder einen Rechte-Override haben
// (granulares RBAC, siehe src/lib/permissions.ts). Auflösung über die
// uncachte buildRoleMap, damit die Funktion auch in Standalone-Cron-Skripten
// (scripts/send-admin-log-digest.ts) außerhalb des Next-Requests funktioniert.
export async function listAdminEmails(): Promise<AdminContact[]> {
  const roleMap = await buildRoleMap();
  const rows = await sql<
    {
      email: string;
      name: string;
      role: string;
      additional_roles: string[];
      permission_overrides: Record<string, boolean>;
    }[]
  >`
    SELECT email, name, role, additional_roles, permission_overrides
    FROM users
    WHERE is_active = true
  `;
  return rows
    .filter((u) => userPermissions(u, roleMap).has("admin.access"))
    .map((u) => ({ email: u.email, name: u.name }));
}

export interface GmContact {
  id: number;
  name: string;
}

// Aktive Konten mit dem Recht gm.access — die Auswahlliste „wer spielt die
// NPCs?" beim Anlegen eines Gesprächs (siehe /user/dialogues/new). Wie
// listAdminEmails über die Rechte aufgelöst, nicht über die Primärrolle:
// gm.access kann auch aus einer Zusatzrolle, einer eigenen Rolle oder einem
// Rechte-Override kommen.
export async function listGmUsers(): Promise<GmContact[]> {
  const roleMap = await buildRoleMap();
  const rows = await sql<
    {
      id: number;
      name: string;
      role: string;
      additional_roles: string[];
      permission_overrides: Record<string, boolean>;
    }[]
  >`
    SELECT id, name, role, additional_roles, permission_overrides
    FROM users
    WHERE is_active = true
    ORDER BY name ASC
  `;
  return rows
    .filter((u) => userPermissions(u, roleMap).has("gm.access"))
    .map((u) => ({ id: u.id, name: u.name }));
}

export async function getPasswordHash(userId: number): Promise<string | null> {
  const rows = await sql<{ password_hash: string | null }[]>`
    SELECT password_hash FROM users WHERE id = ${userId}
  `;
  return rows[0]?.password_hash ?? null;
}

// Setzt das Passwort und beendet damit gleichzeitig eine offene
// Aktivierung (requires_activation) — ab hier entscheidet nur noch
// password_hash über den Login-Weg. session_version wird erhöht, damit
// alle bereits ausgestellten Session-Cookies (andere Geräte/Browser)
// ungültig werden — siehe SessionPayload.sessionVersion in session.ts.
export async function setPassword(
  userId: number,
  passwordHash: string,
): Promise<void> {
  await sql`
    UPDATE users
    SET password_hash = ${passwordHash}, requires_activation = false,
        session_version = session_version + 1
    WHERE id = ${userId}
  `;
}

// Self-Service-Pendant zu setPassword oben, aber ohne Passwortänderung: für
// den "Auf allen anderen Geräten abmelden"-Knopf in den Profil-Settings
// (sessionActions.ts). Gibt den neuen Wert zurück, damit der Aufrufer sofort
// ein frisches Cookie mit der aktuellen session_version für die eigene,
// gerade laufende Sitzung ausstellen kann — sonst würde der nächste Request
// dieser Sitzung sich selbst mit aussperren.
export async function invalidateOtherSessions(userId: number): Promise<number> {
  const [row] = await sql<{ session_version: number }[]>`
    UPDATE users
    SET session_version = session_version + 1
    WHERE id = ${userId}
    RETURNING session_version
  `;
  return row.session_version;
}
