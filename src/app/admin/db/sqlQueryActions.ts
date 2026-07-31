"use server";
import { requireDbAccess, getCurrentUserPermissions } from "@/lib/dal";
import { runAdminQuery } from "@/lib/dbInspect";

export interface SqlQueryState {
  error?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  // Bei write/delete ohne RETURNING: Kommando + betroffene Zeilenzahl statt
  // einer Ergebnistabelle.
  command?: string;
  rowCount?: number;
}

// Führt eine vom Nutzer frei eingegebene Query aus (SqlQueryPanel.tsx). Die
// erlaubte Aktion (lesen/schreiben/löschen) hängt an den DB-Rechten des
// aufrufenden Users: sql_read → SELECT/WITH, sql_write → INSERT/UPDATE,
// sql_delete → DELETE. Die Rechte werden hier serverseitig frisch aufgelöst und
// als caps an runAdminQuery durchgereicht, das die Klassifikation gegen die
// caps erzwingt (Defense in Depth zusätzlich zum requireDbAccess-Gate).
export async function runAdminSqlQueryAction(
  _state: SqlQueryState,
  formData: FormData,
): Promise<SqlQueryState> {
  await requireDbAccess();
  const perms = await getCurrentUserPermissions();

  const query = String(formData.get("query") ?? "").trim();
  if (!query) return { error: "Bitte eine Query eingeben." };

  try {
    const result = await runAdminQuery(query, {
      canRead: perms.has("sql_read"),
      canWrite: perms.has("sql_write"),
      canDelete: perms.has("sql_delete"),
    });
    return {
      columns: result.columns,
      rows: result.rows,
      command: result.command,
      rowCount: result.rowCount,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Query fehlgeschlagen.",
    };
  }
}
