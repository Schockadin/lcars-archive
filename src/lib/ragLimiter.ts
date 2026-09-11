import "server-only";
import postgres from "postgres";
import sql from "@/lib/db";

const WINDOW_MS = 60_000; // 1 Minute
const MAX_REQUESTS_PER_USER = 8;
const CLEANUP_AFTER_MS = 24 * 60 * 60 * 1000; // 1 Tag

// Frei gewählter Namespace für den Advisory-Lock unten. Braucht keinen Bezug
// zu irgendetwas, muss nur stabil bleiben und sich von künftigen Namespaces
// unterscheiden.
const RAG_LOCK_NAMESPACE = 4711;

// client optional per Default der globale sql-Client, kann aber eine
// Transaction (tx aus sql.begin()) sein — siehe checkAndRecordRagRequest unten,
// gleiches Prinzip wie in loginAttempts.ts / passwordResetLimiter.ts.
type SqlClient = postgres.ISql;

// Begrenzt, wie viele Fragen eine Person pro Minute an den
// Datenbank-Assistenten stellen darf (/api/rag).
//
// Der Zähler lag bis zuletzt in einer Map im Modulscope der Route. Das war
// als grobe Bremse gedacht, ist auf serverless aber praktisch keine: Jede
// Funktionsinstanz bekommt ihre eigene Map, das Limit skaliert damit mit der
// Instanzzahl mit. Am anderen Ende hängt ein abrechnender Anbieter (OpenAI
// für die Embeddings, Workers AI für die Antwort) — deshalb steht der Zähler
// jetzt in der Datenbank, die sich alle Instanzen teilen. Dasselbe Muster,
// das Login und Passwort-Reset schon benutzen.
export async function isRagRateLimited(
  userId: number,
  client: SqlClient = sql,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const [row] = await client<{ recent: number }[]>`
    SELECT COUNT(*)::int AS recent
    FROM rag_requests
    WHERE user_id = ${userId} AND requested_at > ${windowStart}
  `;
  return row.recent >= MAX_REQUESTS_PER_USER;
}

// Alte Einträge werden hier statt in einem separaten Cron-Job aufgeräumt —
// gleiches Prinzip wie recordLoginAttempt in loginAttempts.ts.
export async function recordRagRequest(
  userId: number,
  client: SqlClient = sql,
): Promise<void> {
  await client`INSERT INTO rag_requests (user_id) VALUES (${userId})`;
  const cleanupBefore = new Date(Date.now() - CLEANUP_AFTER_MS);
  await client`DELETE FROM rag_requests WHERE requested_at < ${cleanupBefore}`;
}

// Serialisiert Prüfung und Eintrag für denselben User über einen
// pg_advisory_xact_lock — ohne das könnten mehrere gleichzeitig eintreffende
// Fragen alle den Zählerstand VOR dem jeweils anderen Insert sehen und das
// Limit gemeinsam überschreiten (TOCTOU zwischen SELECT COUNT und INSERT).
// Genau der Fall, den die prozess-lokale Map gar nicht erst abdecken konnte.
// XACT-Variante wie überall sonst: automatisch bei COMMIT/ROLLBACK
// freigegeben und damit sicher unter pgBouncers Transaction-Mode-Pooling
// (siehe ausführlichen Kommentar bei withEmailLoginLock in loginAttempts.ts).
//
// Liefert true, wenn die Anfrage abzulehnen ist; sonst false, und der
// Versuch ist dann bereits verbucht.
export async function checkAndRecordRagRequest(userId: number): Promise<boolean> {
  return sql.begin(async (tx) => {
    // Zwei-Argument-Form (Namespace, Objekt-ID) statt der Ein-Argument-Form,
    // die login/reset mit hashtext(email) benutzen: Postgres führt für beide
    // Formen getrennte Sperr-Räume, eine User-ID kann also nie zufällig mit
    // einem hashtext-Wert von dort zusammenfallen und zwei unabhängige
    // Vorgänge gegenseitig ausbremsen.
    await tx`SELECT pg_advisory_xact_lock(${RAG_LOCK_NAMESPACE}, ${userId})`;
    if (await isRagRateLimited(userId, tx)) return true;
    await recordRagRequest(userId, tx);
    return false;
  }) as Promise<boolean>;
}
