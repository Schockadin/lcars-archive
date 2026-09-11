import { describe, it, expect, vi, beforeEach } from "vitest";
import sql from "@/lib/db";
import { createSession } from "@/lib/session";
import { getActiveSession, getActiveUser } from "@/lib/dal";
import { setUserActive, setPassword } from "@/lib/users";
import { insertUser } from "./helpers";

// Gleiches Muster wie tests/integration/visibility.test.ts: next/headers'
// cookies() per In-Memory-Store, damit createSession() und die Gates im
// echten Zusammenspiel laufen.
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
}));

beforeEach(() => {
  cookieStore.clear();
});

// getActiveSession/getActiveUser sind mit React cache() umwickelt. Das ist
// hier unkritisch: außerhalb eines React-Render-Durchlaufs (und den gibt es
// in diesen Tests nicht) reicht cache() den Aufruf unverändert an die
// Funktion durch und merkt sich nichts — jeder Testfall rechnet also frisch,
// obwohl die Funktionen kein Argument haben, über das sich Fälle sonst
// unterscheiden ließen. Gleiches gilt für das bereits gecachte getUserById,
// auf dem die bestehenden visibility-Tests aufsetzen.

describe("getActiveSession", () => {
  it("liefert null ohne Session-Cookie", async () => {
    expect(await getActiveSession()).toBeNull();
  });

  it("liefert die Session für ein aktives, unverändertes Konto", async () => {
    const user = await insertUser({ role: "player" });
    await createSession({
      id: user.id,
      email: user.email,
      role: "player",
      session_version: 0,
    });

    const session = await getActiveSession();

    expect(session?.userId).toBe(user.id);
  });

  it("liefert null, wenn das Konto deaktiviert wurde", async () => {
    const user = await insertUser({ role: "player" });
    await createSession({
      id: user.id,
      email: user.email,
      role: "player",
      session_version: 0,
    });

    await sql`UPDATE users SET is_active = false WHERE id = ${user.id}`;

    expect(await getActiveSession()).toBeNull();
  });

  it("liefert null, wenn das Cookie eine veraltete session_version trägt", async () => {
    const user = await insertUser({ role: "player" });
    await createSession({
      id: user.id,
      email: user.email,
      role: "player",
      session_version: 0,
    });

    // Passwortwechsel erhöht session_version — das eben ausgestellte Cookie
    // trägt danach den alten Wert.
    await setPassword(user.id, "salt:hash");

    expect(await getActiveSession()).toBeNull();
  });

  it("liefert null, wenn es den User nicht mehr gibt", async () => {
    await createSession({
      id: 999999,
      email: "ghost@example.test",
      role: "player",
      session_version: 0,
    });

    expect(await getActiveSession()).toBeNull();
  });
});

describe("getActiveUser", () => {
  it("liefert den User frisch aus der DB, nicht aus dem Cookie", async () => {
    const user = await insertUser({ role: "player" });
    await createSession({
      id: user.id,
      email: user.email,
      role: "player",
      session_version: 0,
    });

    await sql`UPDATE users SET role = 'admin' WHERE id = ${user.id}`;

    const current = await getActiveUser();

    expect(current?.id).toBe(user.id);
    expect(current?.role).toBe("admin");
  });

  it("liefert null für ein deaktiviertes Konto", async () => {
    const user = await insertUser({ role: "player", isActive: false });
    await createSession({
      id: user.id,
      email: user.email,
      role: "player",
      session_version: 0,
    });

    expect(await getActiveUser()).toBeNull();
  });
});

describe("setUserActive", () => {
  it("erhöht beim Deaktivieren die session_version", async () => {
    const user = await insertUser({ role: "player" });

    await setUserActive(user.id, false);

    const [row] = await sql<{ is_active: boolean; session_version: number }[]>`
      SELECT is_active, session_version FROM users WHERE id = ${user.id}
    `;
    expect(row.is_active).toBe(false);
    expect(row.session_version).toBe(1);
  });

  it("lässt die session_version beim Reaktivieren unangetastet", async () => {
    const user = await insertUser({ role: "player" });
    await setUserActive(user.id, false);

    await setUserActive(user.id, true);

    const [row] = await sql<{ is_active: boolean; session_version: number }[]>`
      SELECT is_active, session_version FROM users WHERE id = ${user.id}
    `;
    expect(row.is_active).toBe(true);
    expect(row.session_version).toBe(1);
  });
});
