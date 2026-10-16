"use server";
import sql from "@/lib/db";
import { publishContentChanged } from "@/lib/realtimeServer";
import { requireDbAccess, getCurrentUserPermissions } from "@/lib/dal";
import {
  getTableColumns,
  quoteIdent,
  tableAccessError,
  isProtectedWriteTable,
} from "@/lib/dbInspect";
import { getClientIp } from "@/lib/http";
import { jsonRootType, parseJsonEditValue } from "@/lib/dbJsonEdit";
import {
  lockDbRowSnapshot,
  getTableColumnInfoInTransaction,
} from "@/lib/dbRowMutations";
import type { DbRowAuditDetails } from "@/lib/dbRowAudit";

export interface RowMutationResult {
  error?: string;
  rowCount?: number;
}

const STATEMENT_TIMEOUT_MS = 5000;

// Aktualisiert eine einzelne Zeile aus dem Bearbeiten-Overlay. Der alte und
// neue Wert werden gemeinsam mit der Änderung im append-only Audit-Log
// gespeichert; dadurch ist die Änderung dort später rückgängig zu machen.
export async function updateDbRowAction(input: {
  table: string;
  pkColumn: string;
  pkValue: string;
  updates: Record<string, string | null>;
}): Promise<RowMutationResult> {
  if (
    !input ||
    typeof input.table !== "string" ||
    input.pkColumn !== "id" ||
    typeof input.pkValue !== "string" ||
    !input.updates ||
    typeof input.updates !== "object" ||
    Array.isArray(input.updates)
  ) {
    return { error: "Ungültige Zeilenänderung." };
  }

  const actor = await requireDbAccess();
  const perms = await getCurrentUserPermissions();
  if (!perms.has("sql_write")) {
    return { error: "Dir fehlt das Recht „SQL schreiben“." };
  }

  const accessError = tableAccessError(
    input.table,
    perms.has("db_view_system_tables"),
  );
  if (accessError) return { error: accessError };

  // Tabellen mit Zugangsdaten, Rollen oder Audit-Daten bleiben auch dann
  // schreibgeschützt, wenn sie im Explorer lesbar sind.
  if (isProtectedWriteTable(input.table)) {
    return { error: `Schreibzugriff auf „${input.table}“ ist gesperrt.` };
  }

  const columns = await getTableColumns(input.table);
  if (columns.length === 0) return { error: "Unbekannte Tabelle." };
  if (!columns.includes(input.pkColumn)) {
    return { error: "Unbekannte Schlüsselspalte." };
  }

  const requestedColumns = Object.keys(input.updates);
  if (
    requestedColumns.some(
      (column) =>
        typeof input.updates[column] !== "string" &&
        input.updates[column] !== null,
    )
  ) {
    return { error: "Ungültiger Zellenwert." };
  }

  // Nur echte Spalten übernehmen; den Primärschlüssel nie ändern. Generierte
  // und Identity-Spalten lassen sich nicht regulär aktualisieren.
  const requestedSet = new Set(requestedColumns);
  const setColumns = columns.filter(
    (column) => requestedSet.has(column) && column !== input.pkColumn,
  );
  if (setColumns.length === 0) {
    return { error: "Keine gültigen Spalten zum Aktualisieren." };
  }
  if (setColumns.length > 200) {
    return { error: "Zu viele Spalten für eine einzelne Änderung." };
  }

  const ip = await getClientIp();
  try {
    const result: RowMutationResult = await sql.begin(
      async (tx): Promise<RowMutationResult> => {
        await tx.unsafe(
          `SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`,
        );
        const columnInfo = await getTableColumnInfoInTransaction(
          tx,
          input.table,
        );
        const infoByName = new Map(
          columnInfo.map((column) => [column.name, column]),
        );
        const editableColumns = setColumns.filter((column) => {
          const info = infoByName.get(column);
          return info && !info.generated && !info.identity;
        });
        if (editableColumns.length === 0) {
          return { error: "Keine bearbeitbaren Spalten zum Aktualisieren." };
        }

        const beforeRows = await lockDbRowSnapshot(
          tx,
          input.table,
          input.pkColumn,
          input.pkValue,
          editableColumns,
        );
        if (beforeRows.length === 0)
          return { error: "Keine passende Zeile gefunden." };
        if (beforeRows.length !== 1) {
          return {
            error: "Die Schlüsselspalte identifiziert keine einzelne Zeile.",
          };
        }
        const before = beforeRows[0];

        const params: unknown[] = [];
        const assignments: string[] = [];
        for (const column of editableColumns) {
          const rawValue = input.updates[column];
          const dataType = infoByName.get(column)?.dataType;
          let placeholder = `$${params.length + 1}`;
          if (
            rawValue !== null &&
            (dataType === "json" || dataType === "jsonb")
          ) {
            const hasObjectSemantics =
              column === "metadata" || column === "frontmatter";
            const expectedRootType =
              !hasObjectSemantics && before.sqlNulls[column] === false
                ? jsonRootType(before.values[column])
                : undefined;
            const parsed = parseJsonEditValue(
              column,
              rawValue,
              expectedRootType,
            );
            if ("error" in parsed) return { error: parsed.error };
            params.push(JSON.stringify(parsed.value));
            placeholder += `::${dataType}`;
          } else {
            params.push(rawValue);
          }
          assignments.push(`${quoteIdent(column)} = ${placeholder}`);
        }

        const pkIndex = params.length + 1;
        params.push(input.pkValue);
        const update = await tx.unsafe(
          `UPDATE ${quoteIdent(input.table)} SET ${assignments.join(", ")} WHERE ${quoteIdent(input.pkColumn)}::text = $${pkIndex}`,
          params as never[],
        );
        if (update.count !== 1) {
          return { error: "Die Zeile wurde nicht aktualisiert." };
        }

        const [after] = await lockDbRowSnapshot(
          tx,
          input.table,
          input.pkColumn,
          input.pkValue,
          editableColumns,
        );
        if (!after)
          throw new Error("Die aktualisierte Zeile ist nicht mehr vorhanden.");

        const details: DbRowAuditDetails = {
          kind: "db_row_update",
          table: input.table,
          pkColumn: input.pkColumn,
          pkValue: input.pkValue,
          columns: editableColumns,
          before,
          after,
        };
        await tx.unsafe(
          `INSERT INTO admin_audit_log (actor_id, action, details, ip)
         VALUES ($1, 'update_db_row', $2, $3)`,
          [actor.id, JSON.stringify(details), ip],
        );
        return { rowCount: update.count };
      },
    );

    if (result.error) return result;
    if (result.rowCount) await publishContentChanged();
    return result;
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Aktualisierung fehlgeschlagen.",
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
    await publishContentChanged();
    return { rowCount };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Löschen fehlgeschlagen.",
    };
  }
}
