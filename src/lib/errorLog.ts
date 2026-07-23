// Protokoll unerwarteter Serverfehler in der DB — mirrort src/lib/auditLog.ts
// (gleiches Prinzip: einzelnes INSERT, rein lesende Übersicht admin-only
// unter /admin/error-log, kein automatisches Aufräumen). Zwei Quellen:
// (1) src/instrumentation.ts (onRequestError-Hook, nicht abgefangene
// Serverfehler aus Render/Route Handler/Server Action), (2) bestehende
// catch-Blöcke, die schon heute console.error nutzen (ergänzt um
// logCaughtError, siehe dortige Aufrufstellen).
import "server-only";
import sql from "@/lib/db";

export interface ErrorLogEntry {
  digest?: string;
  message: string;
  stack?: string;
  routePath?: string;
  routeType?: string;
  method?: string;
}

export interface ErrorLogRow {
  id: number;
  digest: string | null;
  message: string;
  stack: string | null;
  routePath: string | null;
  routeType: string | null;
  method: string | null;
  createdAt: string;
}

// Bewusst komplett in try/catch gekapselt statt den Fehler nach außen zu
// werfen — wird u.a. aus onRequestError heraus aufgerufen, das selbst schon
// mitten in einer Fehlerbehandlung läuft. Ist die DB gerade der Grund für
// den ursprünglichen Fehler, darf der Logging-Versuch selbst nicht erneut
// crashen (kein zweiter, ungefangener Fehler in der Fehlerbehandlung).
export async function logServerError(entry: ErrorLogEntry): Promise<void> {
  try {
    await sql`
      INSERT INTO error_logs (digest, message, stack, route_path, route_type, method)
      VALUES (
        ${entry.digest ?? null}, ${entry.message}, ${entry.stack ?? null},
        ${entry.routePath ?? null}, ${entry.routeType ?? null}, ${entry.method ?? null}
      )
    `;
  } catch (err) {
    console.error("Server-Fehler konnte nicht in error_logs geschrieben werden:", err);
  }
}

// Komfort-Wrapper für bestehende catch-Blöcke (siehe z.B. characters.ts,
// dialogues.ts) — normalisiert einen beliebigen catch-Wert (Error-Instanz
// oder nicht) und markiert den Eintrag als "caught" (im Gegensatz zu
// render/route/action aus onRequestError, die einen nicht abgefangenen
// Absturz bedeuten). context ist ein frei gewählter Datei:Funktion-String,
// nur zur Zuordnung in der Admin-Übersicht.
export async function logCaughtError(error: unknown, context: string): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  await logServerError({ message, stack, routePath: context, routeType: "caught" });
}

interface RawErrorLogRow {
  id: number;
  digest: string | null;
  message: string;
  stack: string | null;
  route_path: string | null;
  route_type: string | null;
  method: string | null;
  created_at: string;
}

function mapErrorLogRow(row: RawErrorLogRow): ErrorLogRow {
  return {
    id: row.id,
    digest: row.digest,
    message: row.message,
    stack: row.stack,
    routePath: row.route_path,
    routeType: row.route_type,
    method: row.method,
    createdAt: row.created_at,
  };
}

export async function getServerErrorByDigest(
  digest: string,
): Promise<ErrorLogRow | null> {
  const [row] = await sql<RawErrorLogRow[]>`
    SELECT id, digest, message, stack, route_path, route_type, method, created_at
    FROM error_logs
    WHERE digest = ${digest}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return row ? mapErrorLogRow(row) : null;
}

export async function listRecentServerErrors(limit = 200): Promise<ErrorLogRow[]> {
  const rows = await sql<RawErrorLogRow[]>`
    SELECT id, digest, message, stack, route_path, route_type, method, created_at
    FROM error_logs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(mapErrorLogRow);
}
