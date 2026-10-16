import "server-only";
import sql from "@/lib/db";
import type postgres from "postgres";
import type { DbRowAuditSnapshot } from "./dbRowAudit";
import { quoteIdent } from "./dbInspect";

type TransactionSql = postgres.TransactionSql;

export interface DbRowColumnType {
  name: string;
  dataType: string;
  generated: boolean;
  identity: boolean;
}

export async function getTableColumnInfoInTransaction(
  tx: TransactionSql,
  table: string,
): Promise<DbRowColumnType[]> {
  const rows = await tx<
    {
      column_name: string;
      data_type: string;
      is_generated: string;
      is_identity: string;
    }[]
  >`
    SELECT c.column_name, c.data_type, c.is_generated, c.is_identity
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name = ${table}
    ORDER BY c.ordinal_position
  `;
  return rows.map((row) => ({
    name: row.column_name,
    dataType: row.data_type,
    generated: row.is_generated !== "NEVER",
    identity: row.is_identity === "YES",
  }));
}

export async function lockDbRowSnapshot(
  tx: TransactionSql,
  table: string,
  pkColumn: string,
  pkValue: string,
  columns: string[],
): Promise<DbRowAuditSnapshot[]> {
  const usedNames = new Set(columns);
  const nullAliases = columns.map((_, index) => {
    let alias = `__dbrow_sql_null_${index}`;
    while (usedNames.has(alias)) alias = `_${alias}`;
    usedNames.add(alias);
    return alias;
  });
  const projection = columns
    .flatMap((column, index) => [
      `t.${quoteIdent(column)} AS ${quoteIdent(column)}`,
      `t.${quoteIdent(column)} IS NULL AS ${quoteIdent(nullAliases[index])}`,
    ])
    .join(", ");
  const rows = await tx.unsafe<Record<string, unknown>[]>(
    `SELECT ${projection}
    FROM ${quoteIdent(table)} AS t
    WHERE t.${quoteIdent(pkColumn)}::text = $1
    FOR UPDATE OF t`,
    [pkValue],
  );
  return rows.map((row) => ({
    values: Object.fromEntries(columns.map((column) => [column, row[column]])),
    sqlNulls: Object.fromEntries(
      columns.map((column, index) => [column, row[nullAliases[index]]]),
    ) as Record<string, boolean>,
  }));
}

export async function restoreDbRowSnapshot(
  tx: TransactionSql,
  table: string,
  pkColumn: string,
  pkValue: string,
  columns: string[],
  columnTypes: Map<string, string>,
  snapshot: DbRowAuditSnapshot,
): Promise<number> {
  const keyParams = columns.map((_, index) => `$${index + 3}::text`);
  const rowType = `${quoteIdent("public")}.${quoteIdent(table)}`;
  const assignments = columns
    .map((column, index) => {
      const key = keyParams[index];
      const dataType = columnTypes.get(column);
      if (!dataType) throw new Error(`Unbekannte Spalte „${column}“.`);
      let restoredValue: string;
      if (dataType === "jsonb") {
        restoredValue = `($1::jsonb -> ${key})`;
      } else if (dataType === "json") {
        restoredValue = `(($1::jsonb -> ${key})::text)::json`;
      } else {
        restoredValue = `(jsonb_populate_record(NULL::${rowType}, $1::jsonb)).${quoteIdent(column)}`;
      }
      return `${quoteIdent(column)} = CASE
        WHEN COALESCE(($2::jsonb ->> ${key})::boolean, false) THEN NULL
        ELSE ${restoredValue}
      END`;
    })
    .join(", ");
  const pkIndex = columns.length + 3;
  const params: unknown[] = [
    sql.json(snapshot.values as postgres.JSONValue),
    sql.json(snapshot.sqlNulls as postgres.JSONValue),
    ...columns,
    pkValue,
  ];
  const result = await tx.unsafe(
    `UPDATE ${quoteIdent(table)} SET ${assignments} WHERE ${quoteIdent(pkColumn)}::text = $${pkIndex}`,
    params as never[],
  );
  return result.count;
}
