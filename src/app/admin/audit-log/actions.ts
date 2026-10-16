"use server";
import sql from "@/lib/db";
import {
  getCurrentUserPermissions,
  requireAdmin,
  requireDbAccess,
} from "@/lib/dal";
import { listRecentAdminActions } from "@/lib/auditLog";
import type { AdminAuditLogEntry } from "@/lib/auditLog";
import { getClientIp } from "@/lib/http";
import { publishContentChanged } from "@/lib/realtimeServer";
import { isProtectedWriteTable, tableAccessError } from "@/lib/dbInspect";
import {
  getTableColumnInfoInTransaction,
  lockDbRowSnapshot,
  restoreDbRowSnapshot,
} from "@/lib/dbRowMutations";
import {
  formatDbRowAuditDiff,
  parseDbRowAuditDetails,
  type DbRowAuditDetails,
} from "@/lib/dbRowAudit";

const STATEMENT_TIMEOUT_MS = 5000;
const AUDIT_PAGE_SIZE = 200;

export async function loadOlderAdminActionsAction(before: {
  createdAt: string;
  id: number;
}): Promise<AdminAuditLogEntry[]> {
  await requireAdmin();
  if (
    !before ||
    typeof before.createdAt !== "string" ||
    Number.isNaN(Date.parse(before.createdAt)) ||
    !Number.isSafeInteger(before.id) ||
    before.id < 1
  ) {
    return [];
  }
  return listRecentAdminActions(AUDIT_PAGE_SIZE, before);
}

export interface UndoDbRowAuditResult {
  error?: string;
  auditId?: number;
}

export interface DbRowAuditDetailsResult {
  error?: string;
  details?: string;
}

export async function getDbRowAuditDetailsAction(
  auditId: number,
): Promise<DbRowAuditDetailsResult> {
  await requireAdmin();
  if (!Number.isSafeInteger(auditId) || auditId < 1) {
    return { error: "Ungültiger Audit-Eintrag." };
  }
  const [entry] = await sql<{ action: string; details: string | null }[]>`
    SELECT action, details FROM admin_audit_log WHERE id = ${auditId}
  `;
  if (
    !entry ||
    (entry.action !== "update_db_row" && entry.action !== "undo_db_row")
  ) {
    return { error: "Für diesen Eintrag gibt es keine Zellwert-Änderungen." };
  }
  const details = parseDbRowAuditDetails(entry.details);
  if (!details)
    return { error: "Die gespeicherten Änderungswerte sind nicht lesbar." };
  return { details: formatDbRowAuditDiff(details) };
}

export async function undoDbRowAuditAction(
  auditId: number,
): Promise<UndoDbRowAuditResult> {
  if (!Number.isSafeInteger(auditId) || auditId < 1) {
    return { error: "Ungültiger Audit-Eintrag." };
  }

  const actor = await requireDbAccess();
  const perms = await getCurrentUserPermissions();
  if (!perms.has("sql_write")) {
    return { error: "Dir fehlt das Recht „SQL schreiben“." };
  }

  const ip = await getClientIp();
  try {
    const result: UndoDbRowAuditResult = await sql.begin(
      async (tx): Promise<UndoDbRowAuditResult> => {
        await tx.unsafe(
          `SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`,
        );
        const entries = await tx.unsafe<
          {
            id: number;
            action: string;
            details: string | null;
          }[]
        >(
          `SELECT id, action, details
         FROM admin_audit_log
         WHERE id = $1
         FOR UPDATE`,
          [auditId],
        );
        const entry = entries[0];
        if (!entry || entry.action !== "update_db_row") {
          return {
            error: "Dieser Audit-Eintrag lässt sich nicht zurücksetzen.",
          };
        }

        const existingUndo = await tx.unsafe<{ id: number }[]>(
          `SELECT id FROM admin_audit_log WHERE reverts_audit_id = $1 LIMIT 1`,
          [auditId],
        );
        if (existingUndo.length > 0) {
          return { error: "Diese Änderung wurde bereits rückgängig gemacht." };
        }

        const details = parseDbRowAuditDetails(entry.details);
        if (!details || details.kind !== "db_row_update") {
          return {
            error: "Der Audit-Eintrag enthält keine gültige Änderungsfassung.",
          };
        }
        if (details.pkColumn !== "id") {
          return { error: "Der gespeicherte Schlüssel ist nicht zulässig." };
        }

        const accessError = tableAccessError(
          details.table,
          perms.has("db_view_system_tables"),
        );
        if (accessError) return { error: accessError };
        if (isProtectedWriteTable(details.table)) {
          return {
            error: `Schreibzugriff auf „${details.table}“ ist gesperrt.`,
          };
        }

        const columnInfo = await getTableColumnInfoInTransaction(
          tx,
          details.table,
        );
        const infoByName = new Map(
          columnInfo.map((column) => [column.name, column]),
        );
        if (
          !infoByName.has(details.pkColumn) ||
          details.columns.some((column) => {
            const info = infoByName.get(column);
            return (
              !info ||
              info.generated ||
              info.identity ||
              column === details.pkColumn
            );
          })
        ) {
          return {
            error:
              "Die gespeicherten Spalten passen nicht mehr zum Tabellenschema.",
          };
        }
        const columnTypes = new Map(
          details.columns.map((column) => [
            column,
            infoByName.get(column)!.dataType,
          ]),
        );

        const currentRows = await lockDbRowSnapshot(
          tx,
          details.table,
          details.pkColumn,
          details.pkValue,
          details.columns,
        );
        if (currentRows.length === 0) {
          return { error: "Die ursprüngliche Zeile existiert nicht mehr." };
        }
        if (currentRows.length !== 1) {
          return {
            error:
              "Der gespeicherte Schlüssel identifiziert keine einzelne Zeile.",
          };
        }

        // Die Rücknahme ist auch später möglich: sie setzt genau die damals
        // bearbeiteten Spalten auf ihren vorherigen Stand und lässt alle anderen
        // Spalten unverändert. Änderungen an denselben Spalten seitdem werden
        // damit gezielt überschrieben; das bestätigt die UI vor dem Aufruf.
        const rowCount = await restoreDbRowSnapshot(
          tx,
          details.table,
          details.pkColumn,
          details.pkValue,
          details.columns,
          columnTypes,
          details.before,
        );
        if (rowCount !== 1) {
          return { error: "Die Zeile wurde nicht zurückgesetzt." };
        }

        const afterRows = await lockDbRowSnapshot(
          tx,
          details.table,
          details.pkColumn,
          details.pkValue,
          details.columns,
        );
        if (afterRows.length !== 1) {
          throw new Error("Die zurückgesetzte Zeile ist nicht mehr vorhanden.");
        }

        const undoDetails: DbRowAuditDetails = {
          kind: "db_row_undo",
          table: details.table,
          pkColumn: details.pkColumn,
          pkValue: details.pkValue,
          columns: details.columns,
          before: currentRows[0],
          after: afterRows[0],
          sourceAuditId: auditId,
        };
        const inserted = await tx.unsafe<{ id: number }[]>(
          `INSERT INTO admin_audit_log
           (actor_id, action, details, ip, reverts_audit_id)
         VALUES ($1, 'undo_db_row', $2, $3, $4)
         RETURNING id`,
          [actor.id, JSON.stringify(undoDetails), ip, auditId],
        );
        if (!inserted[0]?.id)
          throw new Error("Audit-Eintrag wurde nicht angelegt.");
        return { auditId: inserted[0].id };
      },
    );

    if (result.error) return result;
    await publishContentChanged();
    return result;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Rücknahme fehlgeschlagen.",
    };
  }
}
