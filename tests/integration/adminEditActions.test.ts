import { describe, it, expect, vi, beforeEach } from "vitest";
import sql from "@/lib/db";
import { createSession } from "@/lib/session";
import { listRecentAdminActions } from "@/lib/auditLog";
import { insertUser, insertCharacter } from "./helpers";
import {
  updateUserDetailsAction,
  setUserActiveAction,
  deleteUserFromEditAction,
  type EditUserState,
} from "@/app/admin/[id]/edit/actions";

// Gleiches Muster wie tests/integration/visibility.test.ts: next/headers'
// cookies() wird per In-Memory-Store simuliert, damit createSession()/
// requireAdmin() im echten Zusammenspiel getestet werden. headers() wird
// zusätzlich gemockt, da getClientIp() (src/lib/http.ts) darüber die
// x-nf-client-connection-ip liest — außerhalb eines echten Next-Requests
// gibt es sonst keinen Header-Kontext.
const cookieStore = vi.hoisted(() => new Map<string, string>());
const TEST_IP = "203.0.113.99";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined,
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  })),
  headers: vi.fn(async () => new Headers({ "x-nf-client-connection-ip": TEST_IP })),
}));

beforeEach(() => {
  cookieStore.clear();
});

async function loginAsAdmin(overrides: Parameters<typeof insertUser>[0] = {}) {
  const admin = await insertUser({ role: "admin", ...overrides });
  await createSession({
    id: admin.id,
    email: admin.email,
    role: "admin",
    session_version: 0,
  });
  return admin;
}

// next/navigation's redirect() throws an Error with a NEXT_REDIRECT digest
// instead of actually navigating — see node_modules/next/dist/client/
// components/redirect.js. Resolves to the redirect target path, or rejects
// if the action returned normally / threw something else.
async function redirectedTo(promise: Promise<EditUserState>): Promise<string> {
  let result: EditUserState;
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

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("updateUserDetailsAction", () => {
  it("updates name/email, logs update_profile with the ip, and does not log update_role when the role is unchanged", async () => {
    const admin = await loginAsAdmin();
    const target = await insertUser({ name: "Old Name", email: "old@example.test", role: "player" });

    const url = await redirectedTo(
      updateUserDetailsAction(
        {},
        formData({
          userId: String(target.id),
          name: "New Name",
          email: "new@example.test",
          role: "player",
        }),
      ),
    );
    expect(url).toBe(`/admin/${target.id}/edit`);

    const [row] = await sql<{ name: string; email: string }[]>`
      SELECT name, email FROM users WHERE id = ${target.id}
    `;
    expect(row).toEqual({ name: "New Name", email: "new@example.test" });

    const entries = await listRecentAdminActions();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      actorId: admin.id,
      action: "update_profile",
      targetUserId: target.id,
      ip: TEST_IP,
    });
  });

  it("changes the role, logs update_role with old → new, and does not log update_profile when name/email are unchanged", async () => {
    const admin = await loginAsAdmin();
    const target = await insertUser({ name: "Same Name", email: "same@example.test", role: "player" });

    await redirectedTo(
      updateUserDetailsAction(
        {},
        formData({
          userId: String(target.id),
          name: target.name,
          email: target.email,
          role: "gm",
        }),
      ),
    );

    const [row] = await sql<{ role: string }[]>`SELECT role FROM users WHERE id = ${target.id}`;
    expect(row.role).toBe("gm");

    const entries = await listRecentAdminActions();
    expect(entries).toHaveLength(1);
    expect(entries[0].actorId).toBe(admin.id);
    expect(entries[0].action).toBe("update_role");
    expect(entries[0].details).toContain("player → gm");
  });

  it("logs nothing when neither the profile nor the role actually changed", async () => {
    await loginAsAdmin();
    const target = await insertUser({ name: "Unchanged", email: "unchanged@example.test", role: "player" });

    await redirectedTo(
      updateUserDetailsAction(
        {},
        formData({
          userId: String(target.id),
          name: target.name,
          email: target.email,
          role: target.role,
        }),
      ),
    );

    expect(await listRecentAdminActions()).toHaveLength(0);
  });

  it("unassigns the user's character when demoted to guest", async () => {
    await loginAsAdmin();
    const target = await insertUser({ role: "player" });
    const character = await insertCharacter({ playerId: target.id });

    await redirectedTo(
      updateUserDetailsAction(
        {},
        formData({
          userId: String(target.id),
          name: target.name,
          email: target.email,
          role: "guest",
        }),
      ),
    );

    const [row] = await sql<{ player_id: number | null }[]>`
      SELECT player_id FROM characters WHERE id = ${character.id}
    `;
    expect(row.player_id).toBeNull();
  });

  it("blocks an admin from demoting themselves away from the admin role", async () => {
    const admin = await loginAsAdmin();

    const result = await updateUserDetailsAction(
      {},
      formData({
        userId: String(admin.id),
        name: admin.name,
        email: admin.email,
        role: "player",
      }),
    );

    expect(result.error).toBeTruthy();
    const [row] = await sql<{ role: string }[]>`SELECT role FROM users WHERE id = ${admin.id}`;
    expect(row.role).toBe("admin");
    expect(await listRecentAdminActions()).toHaveLength(0);
  });

  it("returns an error for a non-existent user without throwing", async () => {
    await loginAsAdmin();

    const result = await updateUserDetailsAction(
      {},
      formData({ userId: "999999", name: "X", email: "x@example.test", role: "player" }),
    );

    expect(result.error).toBeTruthy();
  });
});

describe("setUserActiveAction", () => {
  it("deactivates a user and logs deactivate_user with the ip", async () => {
    const admin = await loginAsAdmin();
    const target = await insertUser({ role: "player" });

    const url = await redirectedTo(
      setUserActiveAction({}, formData({ userId: String(target.id), active: "false" })),
    );
    expect(url).toBe(`/admin/${target.id}/edit`);

    const [row] = await sql<{ is_active: boolean }[]>`SELECT is_active FROM users WHERE id = ${target.id}`;
    expect(row.is_active).toBe(false);

    const entries = await listRecentAdminActions();
    expect(entries[0]).toMatchObject({
      actorId: admin.id,
      action: "deactivate_user",
      targetUserId: target.id,
      ip: TEST_IP,
    });
  });

  it("reactivates a user and logs reactivate_user", async () => {
    await loginAsAdmin();
    const target = await insertUser({ role: "player" });
    await sql`UPDATE users SET is_active = false WHERE id = ${target.id}`;

    await redirectedTo(
      setUserActiveAction({}, formData({ userId: String(target.id), active: "true" })),
    );

    const [row] = await sql<{ is_active: boolean }[]>`SELECT is_active FROM users WHERE id = ${target.id}`;
    expect(row.is_active).toBe(true);
    expect((await listRecentAdminActions())[0].action).toBe("reactivate_user");
  });

  it("blocks an admin from deactivating themselves", async () => {
    const admin = await loginAsAdmin();

    const result = await setUserActiveAction(
      {},
      formData({ userId: String(admin.id), active: "false" }),
    );

    expect(result.error).toBeTruthy();
    const [row] = await sql<{ is_active: boolean }[]>`SELECT is_active FROM users WHERE id = ${admin.id}`;
    expect(row.is_active).toBe(true);
  });
});

describe("deleteUserFromEditAction", () => {
  it("logs delete_user with a name/email snapshot before deleting, then removes the user", async () => {
    const admin = await loginAsAdmin();
    const target = await insertUser({ name: "Doomed Dana", email: "dana@example.test", role: "player" });

    const url = await redirectedTo(
      deleteUserFromEditAction({}, formData({ userId: String(target.id) })),
    );
    expect(url).toBe("/admin/users");

    const remaining = await sql`SELECT id FROM users WHERE id = ${target.id}`;
    expect(remaining).toHaveLength(0);

    const entries = await listRecentAdminActions();
    expect(entries[0]).toMatchObject({
      actorId: admin.id,
      action: "delete_user",
      // target_user_id ist nach dem Löschen bereits ON DELETE SET NULL,
      // details behält trotzdem den Klartext-Schnappschuss.
      targetUserId: null,
      details: "Doomed Dana <dana@example.test>",
      ip: TEST_IP,
    });
  });

  it("blocks an admin from deleting themselves", async () => {
    const admin = await loginAsAdmin();

    const result = await deleteUserFromEditAction({}, formData({ userId: String(admin.id) }));

    expect(result.error).toBeTruthy();
    const remaining = await sql`SELECT id FROM users WHERE id = ${admin.id}`;
    expect(remaining).toHaveLength(1);
  });

  it("returns an error for a non-existent user without throwing", async () => {
    await loginAsAdmin();

    const result = await deleteUserFromEditAction({}, formData({ userId: "999999" }));

    expect(result.error).toBeTruthy();
  });
});
