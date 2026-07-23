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

// Spalten mit fest begrenztem Wertebereich (DB-CHECK-Constraints bzw. — bei
// content_deletions.target_type — die in der Praxis tatsächlich verwendeten
// Werte, siehe scripts/schema.sql) — der Filter für diese Spalten wird im
// UI als <select> statt Freitext angeboten (siehe admin/db/page.tsx).
const ENUM_COLUMNS: Partial<Record<TableName, Record<string, readonly string[]>>> = {
  characters: {
    status: ["active", "retired", "deceased"],
    visibility: ["private", "gm", "public"],
  },
  missions: {
    status: ["active", "completed", "failed", "abandoned"],
  },
  mission_logs: {
    visibility: ["private", "gm", "public"],
  },
  archive_entries: {
    category: [
      "person", "location", "item", "faction", "theory", "event",
      "species", "npc", "dialogue", "other",
    ],
    visibility: ["private", "gm", "public"],
    dialogue_open: ["true", "false"],
  },
  timeline_events: {
    source_type: ["character", "mission", "mission_log", "archive_entry"],
  },
  content_follows: {
    target_type: ["mission", "archive_entry", "character", "user"],
  },
  content_deletions: {
    target_type: ["mission", "mission_log", "archive_entry"],
    visibility: ["private", "gm", "public"],
  },
};

export function enumOptionsFor(
  table: TableName,
  column: string,
): readonly string[] | null {
  return ENUM_COLUMNS[table]?.[column] ?? null;
}

// Fremdschlüssel-Spalten werden in der Anzeige (siehe resolveReferences
// unten) durch den Slug der referenzierten Zeile ersetzt, die SQL-Sortierung
// läuft aber immer über den rohen numerischen Wert (Sortierung passiert VOR
// der Auflösung). Sortieren nach einer FK-Spalte würde deshalb nach interner
// id statt nach dem angezeigten Slug ordnen — für den Admin nicht
// nachvollziehbar. admin/db/page.tsx nutzt das, um für diese Spalten keinen
// Sortier-Link anzubieten (reine Anzeige-Spalte im Header statt Link).
export function isForeignKeyColumn(table: TableName, column: string): boolean {
  return column in (FK_COLUMNS[table] ?? {});
}

// Echte Boolean-Spalten unter den ENUM_COLUMNS oben — Postgres' ::text-Cast
// eines boolean liefert "t"/"f", nicht "true"/"false", ein ILIKE-Substring-
// Filter (wie für alle anderen Spalten unten) würde deshalb nie treffen.
// Der Filter vergleicht hier stattdessen exakt gegen den echten Boolean-Wert.
const BOOLEAN_COLUMNS: Partial<Record<TableName, readonly string[]>> = {
  archive_entries: ["dialogue_open"],
};

// Fremdschlüssel-Spalten (siehe REFERENCES-Constraints in schema.sql) —
// ihr numerischer Wert wird in der Anzeige durch den Slug der referenzierten
// Zeile ersetzt (siehe resolveReferences unten), reine Lesbarkeits-Hilfe,
// keine Verlinkung. "users" ist zwar selbst keine VIEWABLE_TABLE, aber als
// Ziel einer Fremdschlüssel-Auflösung trotzdem erlaubt (nur die id→slug-
// Zuordnung wird gelesen, keine weiteren User-Spalten).
type ReferenceTarget = "users" | "characters" | "missions" | "archive_entries";
const FK_COLUMNS: Partial<Record<TableName, Record<string, ReferenceTarget>>> = {
  characters: { player_id: "users" },
  missions: { owner_user_id: "users" },
  mission_logs: {
    mission_id: "missions",
    author_id: "characters",
    owner_user_id: "users",
  },
  archive_entries: { owner_user_id: "users" },
  archive_links: { source_id: "archive_entries", target_id: "archive_entries" },
  dialogue_messages: {
    archive_entry_id: "archive_entries",
    character_id: "characters",
    author_user_id: "users",
  },
  content_follows: { user_id: "users" },
  push_subscriptions: { user_id: "users" },
  content_deletions: { owner_user_id: "users", deleted_by: "users" },
  dialogue_reservations: {
    archive_entry_id: "archive_entries",
    held_by_user_id: "users",
  },
  dialogue_reservation_notify_requests: {
    archive_entry_id: "archive_entries",
    user_id: "users",
  },
};

// Ersetzt Fremdschlüssel-Werte (numerische id) durch den Slug der
// referenzierten Zeile — eine Lookup-Query pro Zieltabelle (dedupliziert
// über alle FK-Spalten der aktuellen Seite hinweg), nicht pro Zeile (N+1).
// Ein Wert ohne Treffer (z.B. eine per ON DELETE SET NULL bereits entfernte
// Referenz sollte hier nie auftreten, da dann NULL statt einer id steht —
// defensiv trotzdem mit "#<id>" statt eines stillen Datenverlusts) fällt auf
// die rohe id zurück.
async function resolveReferences(
  table: TableName,
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const fkColumns = FK_COLUMNS[table];
  if (!fkColumns || rows.length === 0) return rows;

  const idsByTarget = new Map<ReferenceTarget, Set<number>>();
  for (const [col, target] of Object.entries(fkColumns)) {
    for (const row of rows) {
      const value = row[col];
      if (typeof value === "number") {
        if (!idsByTarget.has(target)) idsByTarget.set(target, new Set());
        idsByTarget.get(target)!.add(value);
      }
    }
  }
  if (idsByTarget.size === 0) return rows;

  const slugsByTarget = new Map<ReferenceTarget, Map<number, string>>();
  for (const [target, ids] of idsByTarget) {
    const slugRows = await sql.unsafe<{ id: number; slug: string }[]>(
      `SELECT id, slug FROM "${target}" WHERE id = ANY($1)`,
      [[...ids]],
    );
    slugsByTarget.set(target, new Map(slugRows.map((r) => [r.id, r.slug])));
  }

  return rows.map((row) => {
    const resolved = { ...row };
    for (const [col, target] of Object.entries(fkColumns)) {
      const value = row[col];
      if (typeof value === "number") {
        resolved[col] = slugsByTarget.get(target)?.get(value) ?? `#${value}`;
      }
    }
    return resolved;
  });
}

// Baut eine WHERE-Klausel pro Spalte — nur für Spalten aus der
// TABLE_COLUMNS-Whitelist (nie aus rohem User-Input als Identifier),
// Filterwerte werden dagegen IMMER als gebundener $n-Parameter übergeben,
// nie in den SQL-String interpoliert (gleiches Prinzip wie beim
// Backup-Export in dbBackup.ts). Für die meisten Spalten ein
// ::text-ILIKE-Substring-Filter (einheitlich über beliebige Spaltentypen
// hinweg, ohne für jeden Typ eine eigene Filter-UI zu bauen — für dieses
// admin-only Debug-Werkzeug ausreichend, kein Anspruch auf Index-Nutzung/
// Performance bei sehr großen Tabellen), für BOOLEAN_COLUMNS ein exakter
// Vergleich gegen den echten Boolean-Wert (siehe Kommentar dort).
// exportiert nur für dbInspect.test.ts (reine String-/Wert-Logik, keine
// DB-Verbindung nötig) — kein weiterer Aufrufer außerhalb dieser Datei.
export function buildFilterClause(
  table: TableName,
  filters: Record<string, string>,
  startIndex: number,
): { whereSql: string; params: string[] } {
  const validColumns = new Set<string>(TABLE_COLUMNS[table]);
  const booleanColumns = new Set<string>(BOOLEAN_COLUMNS[table] ?? []);
  const clauses: string[] = [];
  const params: string[] = [];
  let i = startIndex;
  for (const [col, value] of Object.entries(filters)) {
    if (!validColumns.has(col) || !value.trim()) continue;
    if (booleanColumns.has(col)) {
      // Nur "true"/"false" (die einzigen Werte, die das <select> im UI
      // anbietet) werden tatsächlich als Filter angewandt — ein
      // manipulierter f_<spalte>-Query-Param mit einem anderen Wert würde
      // sonst als ungültiges ::boolean-Literal einen ungefangenen
      // Postgres-Fehler auslösen (statt die Seite einfach ungefiltert zu
      // zeigen).
      const normalized = value.trim().toLowerCase();
      if (normalized !== "true" && normalized !== "false") continue;
      clauses.push(`"${col}" = $${i}::boolean`);
      params.push(normalized);
    } else {
      clauses.push(`"${col}"::text ILIKE $${i}`);
      params.push(`%${value.trim()}%`);
    }
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

  const rows = await sql.unsafe<Record<string, unknown>[]>(
    `SELECT ${columns} FROM "${table}" ${whereSql} ORDER BY "${sortColumn}" ${sortDir} LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    [...params, limit, offset],
  );
  return resolveReferences(table, rows);
}

export class UnsafeQueryError extends Error {}

// Funktionen mit Seiteneffekten, die eine READ ONLY-Transaktion NICHT
// verhindert (siehe Kommentar bei runReadOnlyQuery unten) — nextval/setval
// verschieben eine Sequenz dauerhaft, die pg_advisory_*-Familie hält Locks
// (session-gebunden bei pg_advisory_lock, gefährlich unter pgBouncers
// Transaction-Mode-Pooling, siehe src/lib/db.ts), pg_sleep/pg_terminate_
// backend/pg_cancel_backend sind ein einfacher DoS-Hebel, dblink/lo_* können
// externe Verbindungen bzw. Large Objects schreiben. Zusätzliche
// Verteidigungsebene zur READ ONLY-Transaktion, kein Ersatz dafür — ein
// Text-Check kann z.B. eine in einen Kommentar oder String-Literal
// eingebettete Umgehung nicht zuverlässig ausschließen.
const FORBIDDEN_FUNCTION_CALL =
  /\b(nextval|setval|pg_advisory_(?:xact_)?lock(?:_shared)?|pg_try_advisory_(?:xact_)?lock(?:_shared)?|pg_advisory_unlock(?:_all|_shared)?|lo_(?:import|export|creat|create|write|put|unlink)|dblink(?:_exec)?|pg_sleep(?:_for|_until)?|pg_terminate_backend|pg_cancel_backend|set_config|pg_reload_conf)\s*\(/i;

// Nur früher, freundlicher Fehler für die offensichtlichen Fälle (mehrere
// Anweisungen, kein SELECT/WITH, bekannte Funktionen mit Seiteneffekten) —
// KEIN vollständiger Sicherheitsmechanismus für sich allein (siehe
// runReadOnlyQuery unten, das die eigentliche Durchsetzung über eine READ
// ONLY-Transaktion übernimmt). Ein einfacher Text-Check könnte z.B. eine
// schreibende CTE wie
// "WITH x AS (DELETE FROM t RETURNING *) SELECT * FROM x" nicht zuverlässig
// erkennen — die fängt erst die READ ONLY-Transaktion ab. Exportiert nur für
// dbInspect.test.ts (reine String-Logik, keine DB-Verbindung nötig).
export function assertReadOnlyQuery(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new UnsafeQueryError("Bitte eine Query eingeben.");
  }
  const withoutTrailingSemicolon = trimmed.replace(/;\s*$/, "");
  if (withoutTrailingSemicolon.includes(";")) {
    throw new UnsafeQueryError("Nur eine einzelne Anweisung ist erlaubt.");
  }
  const withoutLeadingComments = withoutTrailingSemicolon.replace(
    /^(\s*--[^\n]*\n)+/,
    "",
  );
  const firstWord = withoutLeadingComments
    .match(/^\s*(\w+)/)?.[1]
    ?.toLowerCase();
  if (firstWord !== "select" && firstWord !== "with") {
    throw new UnsafeQueryError("Nur SELECT-Anweisungen sind erlaubt.");
  }
  if (FORBIDDEN_FUNCTION_CALL.test(withoutTrailingSemicolon)) {
    throw new UnsafeQueryError(
      "Diese Query enthält eine nicht erlaubte Funktion (Sequenzen, Locks, Sleep/Backend-Kontrolle, dblink/Large Objects).",
    );
  }
}

const FREE_QUERY_ROW_LIMIT = 500;
const FREE_QUERY_TIMEOUT_MS = 5000;

export interface FreeQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

// Freie, schreibgeschützte SQL-Query für Admins (/admin/db) — anders als
// listTableRows/countTableRows oben NICHT auf die TABLE_COLUMNS-Whitelist
// beschränkt (ein Admin kann über den DB-Backup-Export ohnehin schon die
// komplette DB einsehen, siehe dbBackup.ts). Die Sicherheit kommt vor allem
// aus "SET TRANSACTION READ ONLY": das verhindert INSERT/UPDATE/DELETE/
// TRUNCATE/DDL auf normalen Tabellen, auch versteckt in einer schreibenden
// CTE (siehe assertReadOnlyQuery oben) — ABER laut Postgres-Dokumentation
// ausdrücklich NICHT Schreibzugriffe auf temporäre Tabellen, Sequenz-
// Vorschub (nextval/setval) oder Advisory-Locks. Diese Lücke wird zusätzlich
// über einen Funktions-Denylist in assertReadOnlyQuery geschlossen (siehe
// dort) — beide Mechanismen zusammen, nicht die Transaktion allein, bilden
// die tatsächliche Absicherung. Die Query wird außerdem in eine Subquery mit
// fester LIMIT gewrappt, damit auch ein "SELECT * FROM riesige_tabelle" ohne
// eigenes LIMIT nicht den ganzen Request-Speicher sprengt — ein bereits
// vorhandenes ORDER BY in der Subquery bleibt dabei zwar meist, aber nicht
// garantiert erhalten (kein Problem für dieses Debug-Werkzeug).
export async function runReadOnlyQuery(query: string): Promise<FreeQueryResult> {
  assertReadOnlyQuery(query);
  const inner = query.trim().replace(/;\s*$/, "");

  return sql.begin(async (tx) => {
    await tx.unsafe("SET TRANSACTION READ ONLY");
    await tx.unsafe(`SET LOCAL statement_timeout = ${FREE_QUERY_TIMEOUT_MS}`);
    const rows = await tx.unsafe<Record<string, unknown>[]>(
      `SELECT * FROM (${inner}) AS _admin_query LIMIT ${FREE_QUERY_ROW_LIMIT}`,
    );
    const columns = rows.columns
      ? rows.columns.map((c) => c.name)
      : rows[0]
        ? Object.keys(rows[0])
        : [];
    return { columns, rows: [...rows] };
  });
}
