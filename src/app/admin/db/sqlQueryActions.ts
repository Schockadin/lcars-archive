"use server";
import { requireDbAccess, getCurrentUserPermissions } from "@/lib/dal";
import {
  runAdminQuery,
  classifySqlStatement,
  parseSingleSelectTable,
  isSelectStarQuery,
  getTableColumns,
} from "@/lib/dbInspect";

// Kontext, mit dem eine Ergebniszeile eindeutig einer Tabelle+Zeile zugeordnet
// werden kann — Voraussetzung für Edit/Delete im Zeilen-Overlay. Nur gesetzt
// bei einer Einzel-Tabellen-SELECT-Query, deren Tabelle eine „id"-Spalte hat
// und deren Ergebnis diese „id" enthält.
export interface RowEditContext {
  table: string;
  pkColumn: string;
}

export interface SqlQueryState {
  error?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  // Bei write/delete ohne RETURNING: Kommando + betroffene Zeilenzahl statt
  // einer Ergebnistabelle.
  command?: string;
  rowCount?: number;
  editContext?: RowEditContext;
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

    // Edit/Delete-Kontext nur für eine Einzel-Tabellen-„SELECT *"-Query mit
    // id-Spalte anbieten. Das SELECT-*-Erfordernis ist entscheidend: nur dann
    // ist die Ergebnis-Spalte „id" garantiert die echte Primärschlüssel-Spalte
    // der Tabelle — bei einer Projektion wie „SELECT mission_id AS id …" trüge
    // „id" sonst Fremdschlüssel-Werte, und Bearbeiten/Löschen träfe die falsche
    // Zeile. parseSingleSelectTable schließt zusätzlich JOINs und Komma-Joins
    // aus (mehrdeutige id-Spalte).
    let editContext: RowEditContext | undefined;
    if (
      classifySqlStatement(query) === "read" &&
      isSelectStarQuery(query) &&
      result.columns.includes("id")
    ) {
      const table = parseSingleSelectTable(query);
      if (table) {
        const cols = await getTableColumns(table);
        if (cols.includes("id")) editContext = { table, pkColumn: "id" };
      }
    }

    return {
      columns: result.columns,
      rows: result.rows,
      command: result.command,
      rowCount: result.rowCount,
      editContext,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Query fehlgeschlagen.",
    };
  }
}
