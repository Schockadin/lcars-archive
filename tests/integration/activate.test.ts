import { describe, it, expect, vi, beforeEach } from "vitest";
import sql from "@/lib/db";
import { createPasswordSetupToken } from "@/lib/passwordSetupTokens";
import { getActiveUser } from "@/lib/dal";
import { activateAccount } from "@/app/activate/actions";
import { insertUser, redirectedTo, formData } from "./helpers";

// Gleiches Muster wie tests/integration/login.test.ts: next/headers'
// cookies() per In-Memory-Store, damit createSession() im echten
// Zusammenspiel läuft und das ausgestellte Cookie anschließend geprüft
// werden kann.
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
  headers: vi.fn(async () => new Headers({ "x-nf-client-connection-ip": "203.0.113.51" })),
}));

beforeEach(() => {
  cookieStore.clear();
});

const PASSWORD = "ein hinreichend langes passwort";

describe("activateAccount", () => {
  it("setzt das Passwort und stellt eine Sitzung aus, die auch gilt", async () => {
    const user = await insertUser({ role: "player" });
    const token = await createPasswordSetupToken(user.id);

    const target = await redirectedTo(
      activateAccount(
        {},
        formData({ token, password: PASSWORD, confirmPassword: PASSWORD }),
      ),
    );

    expect(target).toBe("/");
    // Der Kern des Befunds: setPassword erhöht session_version, das Cookie
    // muss den NEUEN Wert tragen. Trüge es den alten, verwürfe jedes
    // Zugriffs-Gate die frisch ausgestellte Sitzung sofort wieder.
    const current = await getActiveUser();
    expect(current?.id).toBe(user.id);
  });

  it("weist ein deaktiviertes Konto ab, auch mit gültigem Link", async () => {
    const user = await insertUser({ role: "player" });
    const token = await createPasswordSetupToken(user.id);
    await sql`UPDATE users SET is_active = false WHERE id = ${user.id}`;

    const result = await activateAccount(
      {},
      formData({ token, password: PASSWORD, confirmPassword: PASSWORD }),
    );

    expect(result.error).toMatch(/deaktiviert/i);
    const [row] = await sql<{ password_hash: string | null }[]>`
      SELECT password_hash FROM users WHERE id = ${user.id}
    `;
    expect(row.password_hash).toBeNull();
    expect(await getActiveUser()).toBeNull();
  });

  it("lehnt einen bereits verbrauchten Link ab", async () => {
    const user = await insertUser({ role: "player" });
    const token = await createPasswordSetupToken(user.id);
    await redirectedTo(
      activateAccount(
        {},
        formData({ token, password: PASSWORD, confirmPassword: PASSWORD }),
      ),
    );

    const result = await activateAccount(
      {},
      formData({ token, password: PASSWORD, confirmPassword: PASSWORD }),
    );

    expect(result.error).toMatch(/ungültig|abgelaufen/i);
  });
});
