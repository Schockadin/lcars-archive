"use server";
import sql from "@/lib/db";
import { requireDbAccess, getCurrentUserPermissions } from "@/lib/dal";
import {
  getTableColumns,
  quoteIdent,
  tableAccessError,
  isProtectedWriteTable,
} from "@/lib/dbInspect";

export interface RowMutationResult {
  error?: string;
  rowCount?: number;
}

const STATEMENT_TIMEOUT_MS = 5000;

// Aktualisiert genau EINE Zeile einer Basis-Tabelle aus dem Zeilen-Overlay
// (RowDetailModal). Gegated durch sql_write. Sicherheit: Tabellenname,
// Schlüssel- und Wertspalten werden gegen die echten Spalten der Tabelle
// (getTableColumns → information_schema) geprüft, bevor sie als (gequotete)
// Identifier in die Query gehen; ALLE Werte laufen als gebundene $n-Parameter.
// Der Schlüsselvergleich läuft über "pk"::text = $n, damit der String-Parameter
// unabhängig vom PK-Typ passt. Werte kommen als Strings/NULL — Postgres wandelt
// sie im Assignment-Kontext in den Spaltentyp um (int/bool/date/jsonb/…).
export async function updateDbRowAction(input: {
  table: string;
  pkColumn: string;
  pkValue: string;
  updates: Record<string, string | null>;
}): Promise<RowMutationResult> {
  await requireDbAccess();
  const perms = await getCurrentUserPermissions();
  if (!perms.has("sql_write")) {
    return { error: "Dir fehlt das Recht „SQL schreiben“." };
  }

  const accessError = tableAccessError(
    input.table,
    perms.has("db_view_system_tables"),
  );
  if (accessError) return { error: accessError };

  // Gleiche Schranke wie im freien SQL-Panel (assertAdminQuery): Auth-/
  // Sicherheits-Tabellen (users/roles/audit/…) dürfen auch über das Zeilen-
  // Overlay nicht geändert werden — sonst könnte ein db-admin (sql_write ist
  // bewusst orthogonal zu admin) sich über users/roles zum Voll-Admin machen
  // oder den Audit-Trail manipulieren.
  if (isProtectedWriteTable(input.table)) {
    return { error: `Schreibzugriff auf „${input.table}“ ist gesperrt.` };
  }

  const columns = await getTableColumns(input.table);
  if (columns.length === 0) return { error: "Unbekannte Tabelle." };
  const columnSet = new Set(columns);
  if (!columnSet.has(input.pkColumn)) {
    return { error: "Unbekannte Schlüsselspalte." };
  }

  // Nur echte Spalten übernehmen; die PK-Spalte selbst nie ändern.
  const setColumns = Object.keys(input.updates).filter(
    (c) => columnSet.has(c) && c !== input.pkColumn,
  );
  if (setColumns.length === 0) {
    return { error: "Keine gültigen Spalten zum Aktualisieren." };
  }

  const setSql = setColumns
    .map((c, i) => `${quoteIdent(c)} = $${i + 1}`)
    .join(", ");
  const params: (string | null)[] = setColumns.map((c) => input.updates[c]);
  const pkIndex = setColumns.length + 1;
  params.push(input.pkValue);

  const query = `UPDATE ${quoteIdent(input.table)} SET ${setSql} WHERE ${quoteIdent(input.pkColumn)}::text = $${pkIndex}`;

  try {
    const rowCount = await sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
      const result = await tx.unsafe(query, params);
      return result.count;
    });
    if (rowCount === 0) return { error: "Keine passende Zeile gefunden." };
    return { rowCount };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Aktualisierung fehlgeschlagen.",
    };
  }
}

// Löscht genau EINE Zeile einer Basis-Tabelle aus dem Zeilen-Overlay. Gegated
// durch sql_delete. Gleiche Identifier-Validierung/Parameterisierung wie oben.
export async function deleteDbRowAction(input: {
  table: string;
  pkColumn: string;
  pkValue: string;
}): Promise<RowMutationResult> {
  await requireDbAccess();
  const perms = await getCurrentUserPermissions();
  if (!perms.has("sql_delete")) {
    return { error: "Dir fehlt das Recht „SQL löschen“." };
  }

  const accessError = tableAccessError(
    input.table,
    perms.has("db_view_system_tables"),
  );
  if (accessError) return { error: accessError };

  // Wie updateDbRowAction: Auth-/Sicherheits-Tabellen sind auch fürs Löschen
  // über das Overlay gesperrt (Eskalations-/Audit-Manipulations-Schutz).
  if (isProtectedWriteTable(input.table)) {
    return { error: `Löschen in „${input.table}“ ist gesperrt.` };
  }

  const columns = await getTableColumns(input.table);
  if (columns.length === 0) return { error: "Unbekannte Tabelle." };
  if (!columns.includes(input.pkColumn)) {
    return { error: "Unbekannte Schlüsselspalte." };
  }

  const query = `DELETE FROM ${quoteIdent(input.table)} WHERE ${quoteIdent(input.pkColumn)}::text = $1`;

  try {
    const rowCount = await sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
      const result = await tx.unsafe(query, [input.pkValue]);
      return result.count;
    });
    if (rowCount === 0) return { error: "Keine passende Zeile gefunden." };
    return { rowCount };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Löschen fehlgeschlagen.",
    };
  }
}
