import { describe, it, expect, vi, beforeEach } from "vitest";
import sql from "@/lib/db";
import { createSession } from "@/lib/session";
import { getActiveUser } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import { updatePasswordAction } from "@/app/user/passwordActions";
import { insertUser, formData } from "./helpers";

// Gleiches Muster wie tests/integration/login.test.ts.
const cookieStore = vi.hoisted(() => new Map<string, string>());

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
  headers: vi.fn(async () => new Headers({ "x-nf-client-connection-ip": "203.0.113.52" })),
}));

beforeEach(() => {
  cookieStore.clear();
});

const ALT = "das alte lange passwort";
const NEU = "das neue lange passwort";

async function angemeldet() {
  const user = await insertUser({
    role: "player",
    passwordHash: await hashPassword(ALT),
  });
  await createSession({
    id: user.id,
    email: user.email,
    role: "player",
    session_version: 0,
  });
  return user;
}

describe("updatePasswordAction", () => {
  it("hält die eigene Sitzung nach dem Wechsel am Leben", async () => {
    const user = await angemeldet();

    const result = await updatePasswordAction(
      {},
      formData({ currentPassword: ALT, newPassword: NEU, confirmPassword: NEU }),
    );

    expect(result).toEqual({ success: true });
    // Kern des Befunds: setPassword erhöht session_version. Ohne frisch
    // ausgestelltes Cookie trüge die laufende Sitzung den alten Wert und
    // wäre ab dem nächsten Klick abgemeldet.
    const current = await getActiveUser();
    expect(current?.id).toBe(user.id);
  });

  it("meldet andere Geräte ab (session_version steigt)", async () => {
    const user = await angemeldet();

    await updatePasswordAction(
      {},
      formData({ currentPassword: ALT, newPassword: NEU, confirmPassword: NEU }),
    );

    const [row] = await sql<{ session_version: number }[]>`
      SELECT session_version FROM users WHERE id = ${user.id}
    `;
    expect(row.session_version).toBe(1);
  });

  it("lehnt ein falsches aktuelles Passwort ab", async () => {
    await angemeldet();

    const result = await updatePasswordAction(
      {},
      formData({
        currentPassword: "falsch falsch falsch",
        newPassword: NEU,
        confirmPassword: NEU,
      }),
    );

    expect(result.error).toMatch(/aktuelles passwort/i);
  });
});
