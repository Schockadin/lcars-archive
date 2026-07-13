import "server-only";
import sql from "@/lib/db";
import { TABLE_COLUMNS, type TableName } from "./dbBackup";

// Read-only Tabellen-Viewer für /admin/db — nutzt dieselbe Spalten-Whitelist
// wie der DB-Backup-Export (dbBackup.ts), aber OHNE password_setup_tokens
// (enthält token_hash, den auch ein Admin nicht einsehen soll) und ohne
// mission_participants (reine n:m-Relationstabelle ohne eigene Spalten
// außer den beiden FKs — anders als z.B. archive_links, das mit label noch
// eigene Daten trägt und deshalb sichtbar bleibt).
const HIDDEN_FROM_VIEW: readonly TableName[] = [
  "password_setup_tokens",
  "mission_participants",
];

export const VIEWABLE_TABLES = (
  Object.keys(TABLE_COLUMNS) as TableName[]
).filter((t) => !(HIDDEN_FROM_VIEW as string[]).includes(t));

export function isViewableTable(value: string): value is TableName {
  return (VIEWABLE_TABLES as string[]).includes(value);
}

export function viewableColumns(table: TableName): readonly string[] {
  return TABLE_COLUMNS[table];
}

// Baut eine WHERE-Klausel für einen Substring-Filter pro Spalte — nur für
// Spalten aus der TABLE_COLUMNS-Whitelist (nie aus rohem User-Input als
// Identifier), Filterwerte werden dagegen IMMER als gebundener $n-Parameter
// übergeben, nie in den SQL-String interpoliert (gleiches Prinzip wie beim
// Backup-Export in dbBackup.ts). ::text erlaubt eine einheitliche
// Substring-Suche über beliebige Spaltentypen (Zahlen, Booleans, Timestamps,
// JSONB, Arrays) hinweg, ohne für jeden Typ eine eigene Filter-UI zu bauen —
// für dieses admin-only Debug-Werkzeug ausreichend, kein Anspruch auf
// Index-Nutzung/Performance bei sehr großen Tabellen.
function buildFilterClause(
  table: TableName,
  filters: Record<string, string>,
  startIndex: number,
): { whereSql: string; params: string[] } {
  const validColumns = new Set<string>(TABLE_COLUMNS[table]);
  const clauses: string[] = [];
  const params: string[] = [];
  let i = startIndex;
  for (const [col, value] of Object.entries(filters)) {
    if (!validColumns.has(col) || !value.trim()) continue;
    clauses.push(`"${col}"::text ILIKE $${i}`);
    params.push(`%${value.trim()}%`);
    i++;
  }
  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

export async function countTableRows(
  table: TableName,
  filters: Record<string, string> = {},
): Promise<number> {
  const { whereSql, params } = buildFilterClause(table, filters, 1);
  const [row] = await sql.unsafe<{ count: string }[]>(
    `SELECT COUNT(*) AS count FROM "${table}" ${whereSql}`,
    params,
  );
  return Number(row.count);
}

export interface ListTableRowsOptions {
  sortColumn?: string;
  sortDir?: "asc" | "desc";
  filters?: Record<string, string>;
}

// Spaltennamen (SELECT-Liste, sortColumn) kommen wie beim Backup-Export nie
// aus User-Input, sondern immer aus der TABLE_COLUMNS-Whitelist — nur
// table/limit/offset/Filterwerte sind veränderlich, table ist über
// isViewableTable() bereits geprüft, bevor diese Funktion aufgerufen wird.
export async function listTableRows(
  table: TableName,
  limit: number,
  offset: number,
  options: ListTableRowsOptions = {},
): Promise<Record<string, unknown>[]> {
  const validColumns = TABLE_COLUMNS[table] as readonly string[];
  const columns = validColumns.map((c) => `"${c}"`).join(", ");

  const { whereSql, params } = buildFilterClause(
    table,
    options.filters ?? {},
    1,
  );

  const sortColumn =
    options.sortColumn && validColumns.includes(options.sortColumn)
      ? options.sortColumn
      : validColumns[0];
  const sortDir = options.sortDir === "desc" ? "DESC" : "ASC";

  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;

  return sql.unsafe(
    `SELECT ${columns} FROM "${table}" ${whereSql} ORDER BY "${sortColumn}" ${sortDir} LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    [...params, limit, offset],
  );
}
