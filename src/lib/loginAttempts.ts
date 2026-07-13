import "server-only";
import sql from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000; // 15 Minuten
const MAX_ATTEMPTS_PER_EMAIL = 8;
const MAX_ATTEMPTS_PER_IP = 30;
const CLEANUP_AFTER_MS = 24 * 60 * 60 * 1000; // 1 Tag

// Prüft VOR dem Passwortvergleich, ob für diese E-Mail-Adresse oder IP schon
// zu viele Fehlversuche im Zeitfenster vorliegen — verhindert Brute-Force
// unabhängig davon, ob die Adresse überhaupt einem Account gehört (email_count
// zählt immer, siehe Kommentar in scripts/schema.sql). ip bleibt optional: ist
// sie nicht ermittelbar (z.B. lokal ohne Proxy-Header), greift nur die
// E-Mail-Grenze.
export async function isLoginLocked(
  email: string,
  ip: string | null,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const [row] = await sql<{ email_count: number; ip_count: number }[]>`
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
): Promise<void> {
  await sql`
    INSERT INTO login_attempts (email, ip, succeeded)
    VALUES (${email}, ${ip}, ${succeeded})
  `;
  const cleanupBefore = new Date(Date.now() - CLEANUP_AFTER_MS);
  await sql`DELETE FROM login_attempts WHERE attempted_at < ${cleanupBefore}`;
}
