import "server-only";
import sql from "@/lib/db";
import type { User } from "@/types/db";

const USER_COLUMNS = sql`
  id, email, name, role, created_at, last_login_at, previous_login_at
`;

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
// last_login_at auf NOW() gesetzt wird — das Dashboard kennt so immer die
// Grenze des *vorletzten* Logins (Grundlage für "neu seit deinem letzten
// Besuch", siehe getRecentActivitySince in src/lib/timeline.ts). Bewusst
// eine eigene DB-Spalte statt Cookie-Payload, damit ein Profil-Update
// (updateUser) diesen Zeitpunkt nicht versehentlich zurücksetzen kann.
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
      u.id, u.email, u.name, u.role, u.created_at,
      u.last_login_at, u.previous_login_at,
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
      CASE u.role WHEN 'gm' THEN 1 WHEN 'player' THEN 2 WHEN 'viewer' THEN 3 END,
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

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    const rows = await sql<User[]>`
      INSERT INTO users (email, name, role)
      VALUES (${input.email}, ${input.name}, ${input.role})
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
