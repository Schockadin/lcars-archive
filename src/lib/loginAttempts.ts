import "server-only";
import postgres from "postgres";
import sql from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000; // 15 Minuten
const MAX_ATTEMPTS_PER_EMAIL = 8;
const MAX_ATTEMPTS_PER_IP = 30;
const CLEANUP_AFTER_MS = 24 * 60 * 60 * 1000; // 1 Tag

// client ist optional per Default der globale sql-Client, kann aber eine
// Transaction (tx aus sql.begin()) sein — siehe withEmailLoginLock unten:
// isLoginLocked und recordLoginAttempt müssen für denselben Login-Versuch
// auf derselben Transaktion laufen, sonst schließt der Advisory-Lock die
// TOCTOU-Lücke zwischen Prüfung und Eintrag nicht (siehe dort).
type SqlClient = postgres.ISql;

// Prüft VOR dem Passwortvergleich, ob für diese E-Mail-Adresse oder IP schon
// zu viele Fehlversuche im Zeitfenster vorliegen — verhindert Brute-Force
// unabhängig davon, ob die Adresse überhaupt einem Account gehört (email_count
// zählt immer, siehe Kommentar in scripts/schema.sql). ip bleibt optional: ist
// sie nicht ermittelbar (z.B. lokal ohne Proxy-Header), greift nur die
// E-Mail-Grenze.
export async function isLoginLocked(
  email: string,
  ip: string | null,
  client: SqlClient = sql,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const [row] = await client<{ email_count: number; ip_count: number }[]>`
    SELECT
      COUNT(*) FILTER (WHERE email = ${email})::int AS email_count,
      COUNT(*) FILTER (WHERE ip IS NOT NULL AND ip = ${ip})::int AS ip_count
    FROM login_attempts
    WHERE succeeded = false AND attempted_at > ${windowStart}
  `;
  return (
    row.email_count >= MAX_ATTEMPTS_PER_EMAIL ||
    (ip !== null && row.ip_count >= MAX_ATTEMPTS_PER_IP)
  );
}

// Alte Einträge werden hier statt in einem separaten Cron-Job aufgeräumt —
// bei der geringen Login-Frequenz dieser App reicht ein Cleanup pro
// Schreibzugriff (gleiches Prinzip wie touchLastVisit in users.ts), ohne
// eine zusätzliche Scheduled Function zu brauchen.
export async function recordLoginAttempt(
  email: string,
  ip: string | null,
  succeeded: boolean,
  client: SqlClient = sql,
): Promise<void> {
  await client`
    INSERT INTO login_attempts (email, ip, succeeded)
    VALUES (${email}, ${ip}, ${succeeded})
  `;
  const cleanupBefore = new Date(Date.now() - CLEANUP_AFTER_MS);
  await client`DELETE FROM login_attempts WHERE attempted_at < ${cleanupBefore}`;
}

// Serialisiert isLoginLocked+recordLoginAttempt für dieselbe E-Mail-Adresse
// über eine Transaktion mit pg_advisory_xact_lock(hashtext(email)) — ohne
// das könnten mehrere parallele Login-Versuche (die App läuft auf
// Serverless-Funktionsinstanzen, siehe Kommentar zu src/lib/db.ts) alle den
// Zählerstand VOR dem jeweils anderen Insert sehen und die Sperre gemeinsam
// umgehen (TOCTOU zwischen SELECT COUNT und INSERT). Bewusst
// pg_advisory_XACT_lock statt pg_advisory_lock: Ersterer wird automatisch
// bei COMMIT/ROLLBACK freigegeben und ist damit sicher unter pgBouncers
// Transaction-Mode-Pooling — ein session-gebundener Lock würde dagegen auf
// der physischen Connection kleben bleiben und potenziell eine spätere,
// fremde Anfrage blockieren. fn läuft komplett innerhalb der Transaktion;
// darf NICHT redirect() aufrufen (der Redirect-Throw würde die Transaktion
// zurückrollen) — siehe login/actions.ts, das deshalb erst außerhalb dieser
// Funktion redirected.
export async function withEmailLoginLock<T>(
  email: string,
  fn: (tx: SqlClient) => Promise<T>,
): Promise<T> {
  // postgres.js' begin<T>() gibt Promise<UnwrapPromiseArray<T>> zurück (ein
  // Array-Rückgabewert würde entpackt) — für unser generisches, nie
  // array-artiges T ist das äquivalent zu Promise<T>, TS kann das für ein
  // unconstrained T aber nicht selbst beweisen.
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${email}))`;
    return fn(tx);
  }) as Promise<T>;
}
