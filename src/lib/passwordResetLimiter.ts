import "server-only";
import sql from "@/lib/db";

const WINDOW_MS = 60 * 60 * 1000; // 1 Stunde
const MAX_REQUESTS_PER_EMAIL = 3;
const MAX_REQUESTS_PER_IP = 10;
const CLEANUP_AFTER_MS = 24 * 60 * 60 * 1000; // 1 Tag

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
): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const [row] = await sql<{ email_count: number; ip_count: number }[]>`
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
): Promise<void> {
  await sql`INSERT INTO password_reset_requests (email, ip) VALUES (${email}, ${ip})`;
  const cleanupBefore = new Date(Date.now() - CLEANUP_AFTER_MS);
  await sql`DELETE FROM password_reset_requests WHERE requested_at < ${cleanupBefore}`;
}
