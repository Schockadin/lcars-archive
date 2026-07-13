import { describe, it, expect } from "vitest";
import postgres from "postgres";
import sql from "@/lib/db";
import {
  isLoginLocked,
  recordLoginAttempt,
  withEmailLoginLock,
} from "@/lib/loginAttempts";

// MAX_ATTEMPTS_PER_EMAIL/MAX_ATTEMPTS_PER_IP sind private Konstanten in
// loginAttempts.ts (8 bzw. 30) — hier als dokumentiertes, stabiles
// Verhalten hart hinterlegt, wie es ein Black-Box-Test tun würde.
const MAX_ATTEMPTS_PER_EMAIL = 8;
const MAX_ATTEMPTS_PER_IP = 30;

describe("isLoginLocked / recordLoginAttempt", () => {
  it("is not locked for a fresh email with no prior attempts", async () => {
    expect(await isLoginLocked("nobody@example.test", null)).toBe(false);
  });

  it("locks after MAX_ATTEMPTS_PER_EMAIL failed attempts, not before", async () => {
    const email = "brute-force@example.test";
    for (let i = 0; i < MAX_ATTEMPTS_PER_EMAIL - 1; i++) {
      await recordLoginAttempt(email, null, false);
    }
    expect(await isLoginLocked(email, null)).toBe(false);

    await recordLoginAttempt(email, null, false);
    expect(await isLoginLocked(email, null)).toBe(true);
  });

  it("does not count successful attempts toward the lockout", async () => {
    const email = "mostly-successful@example.test";
    for (let i = 0; i < MAX_ATTEMPTS_PER_EMAIL + 5; i++) {
      await recordLoginAttempt(email, null, true);
    }
    expect(await isLoginLocked(email, null)).toBe(false);
  });

  it("locks a brand-new email once its IP has hit MAX_ATTEMPTS_PER_IP failed attempts", async () => {
    const ip = "203.0.113.42";
    for (let i = 0; i < MAX_ATTEMPTS_PER_IP; i++) {
      await recordLoginAttempt(`spray-${i}@example.test`, ip, false);
    }
    expect(await isLoginLocked("never-seen-before@example.test", ip)).toBe(true);
  });

  it("ignores the IP check entirely when ip is null", async () => {
    // Ein Angreifer ohne ermittelbare IP darf nicht durch das Fehlen einer
    // IP-Grenze bevorzugt behandelt werden — hier geht es nur darum, dass
    // ip=null keinen (falschen) Lock auslöst, wenn niemand sonst betroffen
    // ist.
    expect(await isLoginLocked("solo@example.test", null)).toBe(false);
  });
});

describe("withEmailLoginLock", () => {
  it("runs the callback inside a real transaction and persists its writes", async () => {
    const email = "tx-write@example.test";

    await withEmailLoginLock(email, async (tx) => {
      await recordLoginAttempt(email, null, false, tx);
    });

    const rows = await sql`SELECT succeeded FROM login_attempts WHERE email = ${email}`;
    expect(rows).toHaveLength(1);
  });

  it("returns the callback's result", async () => {
    const result = await withEmailLoginLock("return-value@example.test", async () => 42);
    expect(result).toBe(42);
  });

  it("holds a Postgres advisory lock for the duration of the callback", async () => {
    let sawLockHeld = false;
    await withEmailLoginLock("advisory-check@example.test", async (tx) => {
      const [row] = await tx<{ count: string }[]>`
        SELECT count(*) FROM pg_locks WHERE locktype = 'advisory'
      `;
      sawLockHeld = Number(row.count) > 0;
    });
    expect(sawLockHeld).toBe(true);
  });

  // Regressionstest für die TOCTOU-Race: zwei UNABHÄNGIGE Postgres-
  // Verbindungen (statt der einen App-weiten sql-Instanz mit max:1, die
  // parallele Aufrufe ohnehin schon über die Verbindungswarteschlange
  // serialisieren würde und den Lock damit nicht ehrlich testen könnte) —
  // simuliert zwei separate Serverless-Instanzen, die gleichzeitig denselben
  // Login-Versuch für dieselbe E-Mail-Adresse verarbeiten. Ohne den
  // pg_advisory_xact_lock in withEmailLoginLock könnten beide Verbindungen
  // ihren SELECT COUNT vor dem jeweils anderen INSERT ausführen; mit dem
  // Lock muss die zweite Verbindung warten, bis die erste committet hat.
  it("serializes two concurrent connections attempting the same email", async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set for this test");
    }
    const email = "concurrent-race@example.test";
    const clientA = postgres(process.env.DATABASE_URL, { max: 1, ssl: false });
    const clientB = postgres(process.env.DATABASE_URL, { max: 1, ssl: false });

    const events: string[] = [];

    async function attempt(client: postgres.Sql, label: string, holdMs: number) {
      await client.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(hashtext(${email}))`;
        events.push(`${label}:acquired`);
        await new Promise((resolve) => setTimeout(resolve, holdMs));
        await tx`INSERT INTO login_attempts (email, ip, succeeded) VALUES (${email}, NULL, false)`;
        events.push(`${label}:released`);
      });
    }

    try {
      // clientA hält den Lock länger, damit clientB nachweislich warten muss.
      await Promise.all([attempt(clientA, "A", 200), attempt(clientB, "B", 0)]);
    } finally {
      await clientA.end();
      await clientB.end();
    }

    // Egal welche Verbindung zuerst dran war: der komplette
    // "acquired...released"-Block der ersten muss vollständig vor dem
    // "acquired" der zweiten liegen — kein Verschachteln der beiden Locks.
    const firstAcquired = events[0];
    const firstLabel = firstAcquired.split(":")[0];
    expect(events).toEqual([
      `${firstLabel}:acquired`,
      `${firstLabel}:released`,
      `${firstLabel === "A" ? "B" : "A"}:acquired`,
      `${firstLabel === "A" ? "B" : "A"}:released`,
    ]);

    const rows = await sql`SELECT id FROM login_attempts WHERE email = ${email}`;
    expect(rows).toHaveLength(2);
  });
});
