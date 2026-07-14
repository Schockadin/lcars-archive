import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashPassword } from "@/lib/password";
import { insertUser, redirectedTo, formData } from "./helpers";
import { login } from "@/app/login/actions";

// Gleiches Muster wie tests/integration/adminEditActions.test.ts: next/
// headers' cookies() wird per In-Memory-Store simuliert (für createSession),
// headers() liefert eine feste x-nf-client-connection-ip (für getClientIp).
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
  headers: vi.fn(async () => new Headers({ "x-nf-client-connection-ip": "203.0.113.50" })),
}));

beforeEach(() => {
  cookieStore.clear();
});

const PASSWORD = "correct horse battery staple";

// Regressionstest für einen echten Production-Ausfall: login() lief
// komplett innerhalb von withEmailLoginLock (sql.begin(), siehe
// loginAttempts.ts), aber ein einzelner DB-Aufruf darin
// (getUserCredentialsByEmail) benutzte versehentlich den globalen
// sql-Client statt der übergebenen Transaktion (tx). src/lib/db.ts erlaubt
// nur EINE Connection pro Prozess (max: 1) — die war durch sql.begin()
// bereits belegt, der Aufruf über den globalen Client wartete deshalb
// ewig auf eine Connection, die erst nach Abschluss ebendieser Transaktion
// frei geworden wäre: ein waschechter Deadlock bei praktisch jedem
// Login-Versuch. Anders als die isolierten withEmailLoginLock-Tests in
// loginAttempts.test.ts (die den Lock-Mechanismus selbst mit synthetischen,
// stets korrekt tx-nutzenden Callbacks prüfen) ruft dieser Test die echte
// login()-Funktion Ende-zu-Ende gegen denselben max:1-Client auf, den auch
// die Produktion nutzt — ein erneut vergessenes tx an irgendeiner Stelle
// im Callback hängt sich hier auf und lässt den Test am Vitest-Timeout
// (Default 5s) scheitern, statt grün durchzulaufen.
describe("login", () => {
  it("logs in with correct credentials without hanging (deadlock regression)", async () => {
    const user = await insertUser({
      email: "pilot@example.test",
      passwordHash: await hashPassword(PASSWORD),
    });

    const url = await redirectedTo(
      login({}, formData({ email: user.email, password: PASSWORD })),
    );

    expect(url).toBe("/");
  });

  it("rejects a wrong password without hanging (same deadlock-prone code path)", async () => {
    await insertUser({
      email: "wrong-password@example.test",
      passwordHash: await hashPassword(PASSWORD),
    });

    const result = await login(
      {},
      formData({ email: "wrong-password@example.test", password: "not-the-password" }),
    );

    expect(result.error).toBe("E-Mail-Adresse oder Passwort ist falsch.");
  });

  it("rejects a non-existent email without hanging (same deadlock-prone code path)", async () => {
    const result = await login(
      {},
      formData({ email: "nobody@example.test", password: PASSWORD }),
    );

    expect(result.error).toBe("E-Mail-Adresse oder Passwort ist falsch.");
  });

  it("rejects a deactivated account without hanging", async () => {
    const user = await insertUser({
      email: "deactivated@example.test",
      passwordHash: await hashPassword(PASSWORD),
      isActive: false,
    });

    const result = await login({}, formData({ email: user.email, password: PASSWORD }));

    expect(result.error).toBe("Dieses Konto wurde deaktiviert.");
  });

  it("sends an activation link for an account with no password set yet, without hanging", async () => {
    const user = await insertUser({ email: "needs-activation@example.test" });

    const result = await login({}, formData({ email: user.email, password: "irrelevant" }));

    expect(result.error).toContain("noch kein Passwort gesetzt");
  });
});
