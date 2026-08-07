"use server";
import { requireDbAccess, getCurrentUserPermissions } from "@/lib/dal";
import {
  VIEWABLE_TABLES,
  CONTENT_TABLES,
  isViewableTable,
  listTableRows,
  countTableRows,
  viewableColumns,
  getTableColumns,
  quoteIdent,
  type ListTableRowsOptions,
} from "@/lib/dbInspect";
import type { TableName } from "@/lib/dbBackup";
import sql from "@/lib/db";

export interface TableInfo {
  name: string;
  isContent: boolean;
}

export async function getVisibleTablesAction(): Promise<TableInfo[]> {
  await requireDbAccess();
  const perms = await getCurrentUserPermissions();
  const canViewSystem = perms.has("db_view_system_tables");

  return VIEWABLE_TABLES.filter(
    (t) => canViewSystem || (CONTENT_TABLES as readonly string[]).includes(t),
  ).map((t) => ({
    name: t,
    isContent: (CONTENT_TABLES as readonly string[]).includes(t),
  }));
}

export interface TablePageResult {
  columns: readonly string[];
  rows: Record<string, unknown>[];
  total: number;
  error?: string;
}

const PAGE_SIZE = 30;

export async function loadTablePageAction(
  table: string,
  page: number,
  options?: ListTableRowsOptions,
): Promise<TablePageResult> {
  await requireDbAccess();
  const perms = await getCurrentUserPermissions();

  if (!isViewableTable(table)) {
    return { columns: [], rows: [], total: 0, error: "Unbekannte Tabelle." };
  }

  const canViewSystem = perms.has("db_view_system_tables");
  if (
    !canViewSystem &&
    !(CONTENT_TABLES as readonly string[]).includes(table)
  ) {
    return { columns: [], rows: [], total: 0, error: "Keine Berechtigung." };
  }

  const offset = Math.max(0, (page - 1) * PAGE_SIZE);
  const [rows, total] = await Promise.all([
    listTableRows(table as TableName, PAGE_SIZE, offset, options),
    countTableRows(table as TableName, options?.filters),
  ]);
  const columns = viewableColumns(table as TableName);

  return { columns, rows, total };
}

export interface InsertRowResult {
  error?: string;
  id?: number;
}

const STATEMENT_TIMEOUT_MS = 5000;

export async function insertDbRowAction(input: {
  table: string;
  values: Record<string, string | null>;
}): Promise<InsertRowResult> {
  await requireDbAccess();
  const perms = await getCurrentUserPermissions();
  if (!perms.has("sql_write")) {
    return { error: "Dir fehlt das Recht „SQL schreiben“." };
  }

  const columns = await getTableColumns(input.table);
  if (columns.length === 0) return { error: "Unbekannte Tabelle." };
  const columnSet = new Set(columns);

  const insertColumns = Object.keys(input.values).filter(
    (c) => columnSet.has(c) && input.values[c] !== null && input.values[c] !== "",
  );
  if (insertColumns.length === 0) {
    return { error: "Keine gültigen Spalten angegeben." };
  }

  const colsSql = insertColumns.map((c) => quoteIdent(c)).join(", ");
  const valsSql = insertColumns.map((_, i) => `$${i + 1}`).join(", ");
  const params = insertColumns.map((c) => input.values[c]);

  const hasId = columns.includes("id");
  const query = `INSERT INTO ${quoteIdent(input.table)} (${colsSql}) VALUES (${valsSql})${hasId ? " RETURNING id" : ""}`;

  try {
    const result = await sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
      return tx.unsafe<Record<string, unknown>[]>(query, params);
    });
    return { id: hasId ? (result[0]?.id as number) : undefined };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Einfügen fehlgeschlagen.",
    };
  }
}
