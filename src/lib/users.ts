import "server-only";
import sql from "@/lib/db";
import { slugifyBase } from "@/lib/slug";
import type { User } from "@/types/db";

const USER_COLUMNS = sql`
  id, email, name, slug, role, is_active, created_at, last_login_at, previous_login_at,
  email_notifications_enabled, push_notifications_enabled
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

export async function getUserById(id: number): Promise<User | null> {
  const rows = await sql<User[]>`
    SELECT ${USER_COLUMNS}
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

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

export interface UserWithCharacters extends User {
  characters: { id: number; slug: string; name: string }[];
}

export async function listAllUsers(): Promise<UserWithCharacters[]> {
  const rows = await sql<UserWithCharacters[]>`
    SELECT
      u.id, u.email, u.name, u.slug, u.role, u.is_active, u.created_at,
      u.last_login_at, u.previous_login_at,
      u.email_notifications_enabled, u.push_notifications_enabled,
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

export async function updateUserRole(
  id: number,
  role: User["role"],
): Promise<User> {
  const rows = await sql<User[]>`
    UPDATE users
    SET role = ${role}
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

function isUniqueViolation(err: unknown): boolean {
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
        push_notifications_enabled = ${data.pushEnabled}
    WHERE id = ${id}
  `;
}

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
}

export async function getUserCredentialsByEmail(
  email: string,
): Promise<UserCredentials | null> {
  const rows = await sql<UserCredentials[]>`
    SELECT id, email, name, role, is_active, password_hash, requires_activation
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
      u.last_login_at, u.previous_login_at,
      u.email_notifications_enabled, u.push_notifications_enabled,
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

// Für den Fan-out einer Sicherheits-Benachrichtigung (/forgot-password) an
// alle Admins — nur aktive Admin-Konten, ein deaktivierter Admin soll keine
// Mails mehr bekommen.
export async function listAdminEmails(): Promise<AdminContact[]> {
  return sql<AdminContact[]>`
    SELECT email, name FROM users WHERE role = 'admin' AND is_active = true
  `;
}

export async function getPasswordHash(userId: number): Promise<string | null> {
  const rows = await sql<{ password_hash: string | null }[]>`
    SELECT password_hash FROM users WHERE id = ${userId}
  `;
  return rows[0]?.password_hash ?? null;
}

// Setzt das Passwort und beendet damit gleichzeitig eine offene
// Aktivierung (requires_activation) — ab hier entscheidet nur noch
// password_hash über den Login-Weg.
export async function setPassword(
  userId: number,
  passwordHash: string,
): Promise<void> {
  await sql`
    UPDATE users
    SET password_hash = ${passwordHash}, requires_activation = false
    WHERE id = ${userId}
  `;
}
