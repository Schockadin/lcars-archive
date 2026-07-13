"use server";
import { requireAdmin } from "@/lib/dal";
import { runReadOnlyQuery } from "@/lib/dbInspect";

export interface SqlQueryState {
  error?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
}

// Führt eine vom Admin frei eingegebene Query aus (SqlQueryPanel.tsx) — die
// eigentliche Absicherung (nur SELECT, READ ONLY-Transaktion) lebt in
// runReadOnlyQuery (src/lib/dbInspect.ts), hier nur Rollenprüfung + Mapping
// von Erfolg/Fehler auf den Formular-State.
export async function runAdminSqlQueryAction(
  _state: SqlQueryState,
  formData: FormData,
): Promise<SqlQueryState> {
  await requireAdmin();

  const query = String(formData.get("query") ?? "").trim();
  if (!query) return { error: "Bitte eine Query eingeben." };

  try {
    const result = await runReadOnlyQuery(query);
    return { columns: result.columns, rows: result.rows };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Query fehlgeschlagen.",
    };
  }
}
