import "server-only";
import sql from "@/lib/db";
import type { User } from "@/types/db";

export async function getUserById(id: number): Promise<User | null> {
  const rows = await sql<User[]>`
    SELECT id, email, name, role, created_at
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export interface UpdateUserInput {
  name: string;
  email: string;
}

export class EmailTakenError extends Error {}

export async function updateUser(
  id: number,
  data: UpdateUserInput,
): Promise<User> {
  try {
    const rows = await sql<User[]>`
      UPDATE users
      SET name = ${data.name}, email = ${data.email}
      WHERE id = ${id}
      RETURNING id, email, name, role, created_at
    `;
    return rows[0];
  } catch (err) {
    // Unique-Constraint auf email (siehe scripts/schema.sql).
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      throw new EmailTakenError("E-Mail-Adresse wird bereits verwendet.");
    }
    throw err;
  }
}
