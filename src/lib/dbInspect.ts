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

export async function countTableRows(table: TableName): Promise<number> {
  const [row] = await sql.unsafe<{ count: string }[]>(
    `SELECT COUNT(*) AS count FROM "${table}"`,
  );
  return Number(row.count);
}

// Spaltennamen kommen wie beim Backup-Export nie aus User-Input, sondern
// immer aus der TABLE_COLUMNS-Whitelist — nur table/limit/offset sind
// veränderlich, table ist über isViewableTable() bereits geprüft, bevor
// diese Funktion aufgerufen wird.
export async function listTableRows(
  table: TableName,
  limit: number,
  offset: number,
): Promise<Record<string, unknown>[]> {
  const columns = TABLE_COLUMNS[table]
    .map((c) => `"${c}"`)
    .join(", ");
  return sql.unsafe(
    `SELECT ${columns} FROM "${table}" ORDER BY 1 LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
}
