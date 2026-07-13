import "server-only";
import postgres from "postgres";
import sql from "@/lib/db";

const WINDOW_MS = 60 * 60 * 1000; // 1 Stunde
const MAX_REQUESTS_PER_EMAIL = 3;
const MAX_REQUESTS_PER_IP = 10;
const CLEANUP_AFTER_MS = 24 * 60 * 60 * 1000; // 1 Tag

// client optional per Default der globale sql-Client, kann aber eine
// Transaction (tx aus sql.begin()) sein — siehe withEmailResetLock unten,
// gleiches Prinzip wie withEmailLoginLock in loginAttempts.ts.
type SqlClient = postgres.ISql;

// Begrenzt, wie oft /forgot-password pro E-Mail-Adresse bzw. IP innerhalb
// des Zeitfensters tatsächlich eine Mail auslösen darf (Reset-Mail an den
// User + Fanout an alle Admins, siehe forgot-password/actions.ts) — ohne
// Limit ließe sich darüber beliebig oft eine fremde Mailbox sowie alle
// Admin-Postfächer fluten. Wird bewusst NICHT im Rückgabewert sichtbar
// gemacht (die Action antwortet immer mit { submitted: true }), sonst wäre
// die Sperre selbst wieder ein Enumeration-Kanal.
export async function isPasswordResetRateLimited(
  email: string,
  ip: string | null,
  client: SqlClient = sql,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const [row] = await client<{ email_count: number; ip_count: number }[]>`
    SELECT
      COUNT(*) FILTER (WHERE email = ${email})::int AS email_count,
      COUNT(*) FILTER (WHERE ip IS NOT NULL AND ip = ${ip})::int AS ip_count
    FROM password_reset_requests
    WHERE requested_at > ${windowStart}
  `;
  return (
    row.email_count >= MAX_REQUESTS_PER_EMAIL ||
    (ip !== null && row.ip_count >= MAX_REQUESTS_PER_IP)
  );
}

export async function recordPasswordResetRequest(
  email: string,
  ip: string | null,
  client: SqlClient = sql,
): Promise<void> {
  await client`INSERT INTO password_reset_requests (email, ip) VALUES (${email}, ${ip})`;
  const cleanupBefore = new Date(Date.now() - CLEANUP_AFTER_MS);
  await client`DELETE FROM password_reset_requests WHERE requested_at < ${cleanupBefore}`;
}

// Gleiches Prinzip wie withEmailLoginLock (loginAttempts.ts): serialisiert
// isPasswordResetRateLimited+recordPasswordResetRequest für dieselbe
// E-Mail-Adresse über einen pg_advisory_xact_lock, um dieselbe TOCTOU-Lücke
// zwischen Prüfung und Eintrag zu schließen.
export async function withEmailResetLock<T>(
  email: string,
  fn: (tx: SqlClient) => Promise<T>,
): Promise<T> {
  // Siehe gleicher Kommentar bei withEmailLoginLock (loginAttempts.ts) zum
  // Promise<T>-Cast.
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${email}))`;
    return fn(tx);
  }) as Promise<T>;
}
