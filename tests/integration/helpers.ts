import { randomUUID } from "node:crypto";
import sql from "@/lib/db";

// Alle Content-/User-Tabellen in einem TRUNCATE (CASCADE als Sicherheitsnetz
// für evtl. vergessene Fremdtabellen) — läuft vor JEDEM Test (siehe setup.ts),
// setzt außerdem die SERIAL-Sequenzen zurück, damit IDs zwischen Tests
// vorhersagbar bei 1 anfangen.
export async function resetDb(): Promise<void> {
  await sql`
    TRUNCATE TABLE
      timeline_events, archive_links, dialogue_messages, archive_entries,
      mission_logs, missions, mission_participants, content_follows,
      content_deletions, push_subscriptions, password_setup_tokens,
      admin_audit_log, login_attempts, password_reset_requests,
      characters, users
    RESTART IDENTITY CASCADE
  `;
}

function suffix(): string {
  return randomUUID().slice(0, 8);
}

export async function insertUser(
  overrides: Partial<{
    email: string;
    name: string;
    slug: string;
    role: string;
    passwordHash: string | null;
    isActive: boolean;
  }> = {},
): Promise<{ id: number; slug: string; email: string; name: string; role: string }> {
  const s = suffix();
  const [row] = await sql<
    { id: number; slug: string; email: string; name: string; role: string }[]
  >`
    INSERT INTO users (email, name, slug, role, password_hash, is_active)
    VALUES (
      ${overrides.email ?? `user-${s}@example.test`},
      ${overrides.name ?? "Test User"},
      ${overrides.slug ?? `test-user-${s}`},
      ${overrides.role ?? "player"},
      ${overrides.passwordHash ?? null},
      ${overrides.isActive ?? true}
    )
    RETURNING id, slug, email, name, role
  `;
  return row;
}

export async function insertCharacter(
  overrides: Partial<{
    slug: string;
    name: string;
    playerId: number | null;
    visibility: string;
    status: string;
  }> = {},
): Promise<{ id: number; slug: string }> {
  const s = suffix();
  const [row] = await sql<{ id: number; slug: string }[]>`
    INSERT INTO characters (slug, name, player_id, visibility, status)
    VALUES (
      ${overrides.slug ?? `char-${s}`},
      ${overrides.name ?? "Test Character"},
      ${overrides.playerId ?? null},
      ${overrides.visibility ?? "public"},
      ${overrides.status ?? "active"}
    )
    RETURNING id, slug
  `;
  return row;
}

// next/navigation's redirect() throws an Error with a NEXT_REDIRECT digest
// instead of actually navigating — see node_modules/next/dist/client/
// components/redirect.js. Resolves to the redirect target path, or rejects
// if the action returned normally / threw something else.
export async function redirectedTo<T>(promise: Promise<T>): Promise<string> {
  let result: T;
  try {
    result = await promise;
  } catch (err) {
    const digest = (err as { digest?: string } | undefined)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      return digest.split(";")[2];
    }
    throw err;
  }
  throw new Error(`expected a redirect, got a normal return: ${JSON.stringify(result)}`);
}

export function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

export async function insertMission(
  overrides: Partial<{
    slug: string;
    title: string;
    ownerUserId: number | null;
  }> = {},
): Promise<{ id: number; slug: string }> {
  const s = suffix();
  const [row] = await sql<{ id: number; slug: string }[]>`
    INSERT INTO missions (slug, title, owner_user_id)
    VALUES (
      ${overrides.slug ?? `mission-${s}`},
      ${overrides.title ?? "Test Mission"},
      ${overrides.ownerUserId ?? null}
    )
    RETURNING id, slug
  `;
  return row;
}
