import "server-only";
import sql from "@/lib/db";
import { TABLE_COLUMNS, type TableName } from "./dbBackup";

// Quotet einen SQL-Identifier (Tabelle/Spalte) als delimited identifier und
// verdoppelt interne Anführungszeichen (SQL-Standard). Alle Aufrufer prüfen
// den Namen zusätzlich gegen die echten Spalten/Whitelist — dies ist die
// Defense-in-Depth-Schicht für den (theoretischen) Fall eines Namens mit
// eingebettetem `"`, damit der Identifier nicht vorzeitig endet.
export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

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

export const CONTENT_TABLES: readonly TableName[] = [
  "characters",
  "missions",
  "mission_logs",
  "archive_entries",
];

export function isContentTable(table: string): boolean {
  return (CONTENT_TABLES as readonly string[]).includes(table);
}

export function isViewableTable(value: string): value is TableName {
  return (VIEWABLE_TABLES as string[]).includes(value);
}

// Einheitliche Tabellen-Schranke für ALLE Explorer-Aktionen (lesen, einfügen,
// bearbeiten, löschen): nur einsehbare Tabellen, System-Tabellen nur mit
// db_view_system_tables. Liefert die passende Fehlermeldung oder null, wenn
// der Zugriff erlaubt ist. Zentral, damit keine Aktion die Schranke vergisst
// (getTableColumns/information_schema würde sonst beliebige Basistabellen
// akzeptieren).
export function tableAccessError(
  table: string,
  canViewSystem: boolean,
): string | null {
  if (!isViewableTable(table)) return "Unbekannte Tabelle.";
  if (!canViewSystem && !isContentTable(table)) return "Keine Berechtigung.";
  return null;
}

export function viewableColumns(table: TableName): readonly string[] {
  return TABLE_COLUMNS[table];
}

export async function countTableRows(table: TableName): Promise<number> {
  const [row] = await sql.unsafe<{ count: string }[]>(
    `SELECT COUNT(*) AS count FROM ${quoteIdent(table)}`,
  );
  return Number(row.count);
}

// Spaltennamen (SELECT-Liste, Sortierspalte) kommen wie beim Backup-Export
// nie aus User-Input, sondern immer aus der TABLE_COLUMNS-Whitelist — nur
// table/limit/offset sind veränderlich, table ist über isViewableTable()
// bereits geprüft, bevor diese Funktion aufgerufen wird. Der Tabellen-Explorer
// bietet bewusst keine Sortier-/Filter-UI. Liefert die ROHEN Spaltenwerte
// (inkl. numerischer Fremdschlüssel-ids) — der Explorer zeigt und bearbeitet
// den echten DB-Inhalt, deshalb keine id→slug-Auflösung (die würde das
// Zurückschreiben einer FK-Spalte brechen).
export async function listTableRows(
  table: TableName,
  limit: number,
  offset: number,
): Promise<Record<string, unknown>[]> {
  const validColumns = TABLE_COLUMNS[table] as readonly string[];
  const columns = validColumns.map((c) => quoteIdent(c)).join(", ");

  // Stabile GESAMT-Ordnung für LIMIT/OFFSET: nach dem eindeutigen "id" (PK),
  // sonst nach allen Spalten (deterministisch bis auf vollständig identische
  // Zeilen, die ohnehin austauschbar sind). Die erste Spalte allein reicht
  // nicht — Join-Tabellen wie archive_links haben dort keinen eindeutigen
  // Wert, was Zeilen zwischen Seiten überspringen/doppeln würde.
  const orderBy = validColumns.includes("id") ? quoteIdent("id") : columns;

  return sql.unsafe<Record<string, unknown>[]>(
    `SELECT ${columns} FROM ${quoteIdent(table)} ORDER BY ${orderBy} LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
}

export class UnsafeQueryError extends Error {}

// Funktionen mit Seiteneffekten, die eine READ ONLY-Transaktion NICHT
// verhindert (siehe Kommentar bei runAdminQuery unten) — nextval/setval
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

// Aktion einer Query anhand ihres Leitworts. read = SELECT/WITH (wird in einer
// READ ONLY-Transaktion ausgeführt, die auch schreibende CTEs wie
// "WITH x AS (DELETE …) SELECT …" blockiert — eine solche mit WITH beginnende
// Query gilt deshalb bewusst als read und scheitert dann an der READ
// ONLY-Transaktion statt fälschlich als delete durchzugehen); write =
// INSERT/UPDATE; delete = DELETE. Alles andere (DDL, TRUNCATE, GRANT, …) ist
// nicht erlaubt. Reine String-Logik — exportiert für dbInspect.test.ts.
export type SqlQueryAction = "read" | "write" | "delete";

export function classifySqlStatement(
  query: string,
): SqlQueryAction | "forbidden" {
  const trimmed = query.trim().replace(/;\s*$/, "");
  const withoutLeadingComments = trimmed.replace(/^(\s*--[^\n]*\n)+/, "");
  const firstWord = withoutLeadingComments
    .match(/^\s*(\w+)/)?.[1]
    ?.toLowerCase();
  switch (firstWord) {
    case "select":
    case "with":
      return "read";
    case "insert":
    case "update":
      return "write";
    case "delete":
      return "delete";
    default:
      return "forbidden";
  }
}

// Erkennt eine Einzel-Tabellen-SELECT-Query und liefert den Tabellennamen —
// Grundlage für Edit/Delete im Zeilen-Overlay (nur dann eindeutig auf eine
// Tabelle+Zeile abbildbar). null bei JOINs, Subqueries im FROM oder wenn kein
// schlichter Bezeichner nach FROM steht. Reine String-Logik (der Name wird
// serverseitig zusätzlich gegen information_schema validiert, bevor er je in
// SQL landet) — exportiert für dbInspect.test.ts.
export function parseSingleSelectTable(query: string): string | null {
  const withoutComments = query.replace(/--[^\n]*(\n|$)/g, " ");
  if (/\bjoin\b/i.test(withoutComments)) return null;
  // Komma-Join (FROM a, b) ebenfalls ausschließen — die FROM-Klausel bis zum
  // nächsten Schlüsselwort isolieren und auf ein Komma prüfen. Sonst würde
  // z.B. "SELECT * FROM characters, users" fälschlich auf characters
  // abgebildet, obwohl die id-Spalte mehrdeutig ist.
  const fromClause = withoutComments.match(
    /\bfrom\b(.*?)(?:\bwhere\b|\bgroup\b|\bhaving\b|\bwindow\b|\border\b|\blimit\b|\boffset\b|$)/is,
  )?.[1];
  if (fromClause && fromClause.includes(",")) return null;
  // FROM <identifier> — optional schema-qualifiziert ("public".)"tabelle" bzw.
  // public.tabelle; nur ein einfacher Bezeichner, kein "(" (Subquery).
  const m = withoutComments.match(
    /\bfrom\s+(?:"?public"?\s*\.\s*)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i,
  );
  return m ? m[1] : null;
}

// Ist die Query ein reines "SELECT * FROM …"? Nur dann ist garantiert, dass die
// Ergebnis-Spalte "id" auch die echte Primärschlüssel-Spalte der Tabelle ist
// (nicht eine per Alias auf "id" umbenannte Fremdschlüssel-Spalte wie
// "SELECT mission_id AS id …"). Grundlage dafür, wann das Zeilen-Overlay
// Bearbeiten/Löschen anbieten darf. Reine String-Logik, exportiert für Tests.
export function isSelectStarQuery(query: string): boolean {
  const withoutComments = query.replace(/--[^\n]*(\n|$)/g, " ").trim();
  return /^select\s+\*\s+from\b/i.test(withoutComments);
}

// Ziel-Tabelle einer schreibenden Query (INSERT INTO / UPDATE / DELETE FROM) —
// verankert am Anweisungsanfang, daher keine Fehltreffer aus String-Literalen.
// Reine String-Logik, exportiert für Tests.
export function parseWriteTarget(query: string): string | null {
  const q = query.replace(/--[^\n]*(\n|$)/g, " ").trim();
  const m = q.match(
    /^(?:insert\s+into|update|delete\s+from)\s+(?:"?public"?\s*\.\s*)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i,
  );
  return m ? m[1].toLowerCase() : null;
}

// Grundform-Prüfung, unabhängig vom Recht: nicht leer, genau EINE Anweisung
// (kein eingebettetes ; außer als Abschluss), keine verbotene Funktion.
//
// Diese und die Secret-Namen-Prüfungen (assertAdminQuery) laufen BEWUSST gegen
// den ROHEN Query-Text (inkl. String-Literale/Kommentare), nicht gegen eine
// „bereinigte" Fassung. Grund: ein Präsenz-Check auf Rohtext kann nur ZU VIEL
// ablehnen, nie zu wenig — er ist damit nicht umgehbar. Jeder Versuch, Literale/
// Kommentare vorher auszublenden, verlangt einen exakt Postgres-konformen
// Tokenizer (E''-Escape-Strings, verschachtelte Blockkommentare, Dollar-Quotes,
// Quoted Identifiers …); jede Abweichung entfernt ein echtes „;"/einen echten
// Secret-Namen und macht GENAU DIESE Sicherheitsprüfung umgehbar (verkettete
// Statements → Umgehung von PROTECTED_WRITE_TABLES; aliasierte Secret-Spalte).
// Der akzeptierte Preis ist konservativ: eine legitime Query, die ein „;", einen
// Funktions- oder Secret-Namen als reinen Text INNERHALB eines Literals trägt
// (z.B. `WHERE content LIKE '%password_hash%'`), wird abgelehnt — dann bitte
// umformulieren. Sicherheit vor Bequemlichkeit.
export function assertQueryShape(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new UnsafeQueryError("Bitte eine Query eingeben.");
  }
  const withoutTrailingSemicolon = trimmed.replace(/;\s*$/, "");
  if (withoutTrailingSemicolon.includes(";")) {
    throw new UnsafeQueryError("Nur eine einzelne Anweisung ist erlaubt.");
  }
  if (FORBIDDEN_FUNCTION_CALL.test(withoutTrailingSemicolon)) {
    throw new UnsafeQueryError(
      "Diese Query enthält eine nicht erlaubte Funktion (Sequenzen, Locks, Sleep/Backend-Kontrolle, dblink/Large Objects).",
    );
  }
}

// Credential-Spalten, die im freien SQL-Panel weder explizit selektiert noch
// (über SELECT *) im Ergebnis ausgegeben werden dürfen — der Tabellen-Explorer
// blendet sie über die TABLE_COLUMNS-Whitelist ohnehin aus, das freie Panel tat
// das bisher nicht. runAdminQuery entfernt sie zusätzlich aus jedem Ergebnis
// (fängt SELECT * ab, das die Spalte nicht namentlich nennt).
export const SECRET_COLUMNS: readonly string[] = ["password_hash", "token_hash"];

// Tabellen, die im freien Panel gar nicht referenziert werden dürfen (enthalten
// ausschließlich Geheimnisse). Nur die wirklich sensiblen aus HIDDEN_FROM_VIEW
// (mission_participants ist bloß eine Relationstabelle und bleibt erlaubt).
export const SECRET_TABLES: readonly string[] = ["password_setup_tokens"];

// Auth-/Sicherheits-Tabellen, auf die im freien Panel NICHT geschrieben werden
// darf (INSERT/UPDATE/DELETE): verhindert Rechte-Eskalation (users/roles) und
// Manipulation von Rate-Limits/Audit-Trail. Lesen (ohne Secret-Spalten) bleibt
// erlaubt — die db-admin-Rolle ist bewusst orthogonal zu admin (siehe
// DEFAULT_ROLE_PRESETS), ohne diese Schranke wäre sie ein Voll-Admin-Hebel.
export const PROTECTED_WRITE_TABLES: readonly string[] = [
  "users",
  "roles",
  "password_setup_tokens",
  "password_reset_requests",
  "login_attempts",
  "admin_audit_log",
];

// Ist die Tabelle gegen Schreibzugriff (INSERT/UPDATE/DELETE) gesperrt? Zentrale
// Prüfung, damit BEIDE Schreibpfade — das freie SQL-Panel (assertAdminQuery) und
// das Zeilen-Overlay (rowEditActions) — dieselbe Schranke nutzen und keiner sie
// vergisst. Case-insensitiv, da parseWriteTarget bereits kleinschreibt, der
// Overlay-Pfad den echten (kleingeschriebenen) Tabellennamen liefert.
export function isProtectedWriteTable(table: string): boolean {
  return PROTECTED_WRITE_TABLES.includes(table.toLowerCase());
}

function identifierRegex(name: string): RegExp {
  return new RegExp(`\\b${name}\\b`, "i");
}

export interface AdminQueryCapabilities {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

// Prüft Grundform + Klassifikation gegen die Rechte des Aufrufers und liefert
// die Aktion zurück. Die eigentliche Rechte-Auflösung (welche DB-Rechte der
// User hat) passiert im Aufrufer (sqlQueryActions.ts) und wird hier als caps
// hereingereicht + erzwungen — Defense in Depth zusätzlich zum Seiten-Gate.
// Reine String-Logik (keine DB), exportiert für dbInspect.test.ts.
export function assertAdminQuery(
  query: string,
  caps: AdminQueryCapabilities,
): SqlQueryAction {
  assertQueryShape(query);
  const action = classifySqlStatement(query);
  if (action === "forbidden") {
    throw new UnsafeQueryError(
      "Nur SELECT/WITH, INSERT, UPDATE oder DELETE sind erlaubt.",
    );
  }
  if (action === "read" && !caps.canRead) {
    throw new UnsafeQueryError("Dir fehlt das Recht „SQL lesen“.");
  }
  if (action === "write" && !caps.canWrite) {
    throw new UnsafeQueryError("Dir fehlt das Recht „SQL schreiben“.");
  }
  if (action === "delete" && !caps.canDelete) {
    throw new UnsafeQueryError("Dir fehlt das Recht „SQL löschen“.");
  }

  // Geheimnis-Tabellen (nur Secrets) im freien Panel komplett sperren. Prüfung
  // gegen den ROHEN Query-Text (siehe assertQueryShape): ein Präsenz-Check auf
  // Rohtext ist nicht umgehbar; der Preis ist die konservative Ablehnung einer
  // Query, die den Namen nur als Literal-Text trägt.
  for (const table of SECRET_TABLES) {
    if (identifierRegex(table).test(query)) {
      throw new UnsafeQueryError(
        `Die Tabelle „${table}“ ist im SQL-Panel gesperrt.`,
      );
    }
  }
  // Credential-Spalten dürfen nicht explizit referenziert werden (auch nicht
  // per Alias) — Rohtext-Präsenz-Check (siehe oben); SELECT * wird zusätzlich als
  // Top-Level-Ergebnis-Spalte bereinigt (runAdminQuery).
  //
  // Grenze der Zusicherung: Ein db-admin mit „SQL lesen" hat bewusst rohen
  // Lesezugriff auf die Datenbank. Der SECRET_COLUMNS-Filter (Namens-Sperre hier
  // + Entfernen aus dem Ergebnis in runAdminQuery) schützt vor VERSEHENTLICHER
  // Anzeige (SELECT *, SELECT password_hash), ist aber KEIN harter Boundary gegen
  // absichtliche Exfiltration: eine ganze Zeile lässt sich per Composite-Cast
  // (`SELECT zeile::text FROM users zeile`) oder Row-Serialisierung
  // (`to_jsonb(zeile)`) in einen zusammengesetzten Wert unter beliebigem
  // Spaltennamen packen — das erkennt keine Query-Text-Prüfung zuverlässig. Die
  // einzige harte Schranke wäre spalten-granulares REVOKE auf DB-Rollenebene
  // (Infrastruktur außerhalb dieser Schicht).
  for (const column of SECRET_COLUMNS) {
    if (identifierRegex(column).test(query)) {
      throw new UnsafeQueryError(
        `Die Spalte „${column}“ ist im SQL-Panel gesperrt.`,
      );
    }
  }
  // Schreibzugriff auf Auth-/Sicherheits-Tabellen verhindern (Eskalations-/
  // Audit-Manipulations-Schutz). Ziel-Tabelle am Statement-Anfang geparst.
  if (action === "write" || action === "delete") {
    const target = parseWriteTarget(query);
    if (target && isProtectedWriteTable(target)) {
      throw new UnsafeQueryError(
        `Schreibzugriff auf „${target}“ ist im SQL-Panel gesperrt.`,
      );
    }
  }

  return action;
}

const FREE_QUERY_ROW_LIMIT = 500;
const FREE_QUERY_TIMEOUT_MS = 5000;

export interface FreeQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  // Bei write/delete ohne RETURNING: das SQL-Kommando (z.B. "UPDATE") und die
  // Zahl betroffener Zeilen — die Ergebnistabelle bleibt dann leer.
  command?: string;
  rowCount?: number;
}

// Freie Admin-SQL-Query für /admin/db, gegated durch die übergebenen Rechte
// (caps). Nicht auf die TABLE_COLUMNS-Whitelist beschränkt (ein db_backup-
// Export sieht ohnehin die komplette DB, siehe dbBackup.ts).
//
// - read (SELECT/WITH): läuft in einer "SET TRANSACTION READ ONLY"-Transaktion,
//   die INSERT/UPDATE/DELETE/TRUNCATE/DDL blockiert — auch versteckt in einer
//   schreibenden CTE. Ergebnis in eine Subquery mit fester LIMIT gewrappt,
//   damit ein "SELECT * FROM riesige_tabelle" ohne eigenes LIMIT nicht den
//   Request-Speicher sprengt.
// - write (INSERT/UPDATE) / delete (DELETE): laufen in einer NORMALEN
//   Transaktion und werden direkt ausgeführt. Mit RETURNING kommen Zeilen
//   zurück, sonst command + betroffene Zeilenzahl. Kein READ ONLY (das ist ja
//   gerade der Zweck) — die Absicherung ist hier die Rechte-Prüfung (caps) plus
//   die Grundform-/Funktions-Denylist (assertAdminQuery). Ein DELETE ohne WHERE
//   liegt bewusst in der Verantwortung der berechtigten Person.
//
// statement_timeout begrenzt in beiden Fällen die Laufzeit. hashtext/advisory-
// Locks etc. sind über FORBIDDEN_FUNCTION_CALL ausgeschlossen.
export async function runAdminQuery(
  query: string,
  caps: AdminQueryCapabilities,
): Promise<FreeQueryResult> {
  const action = assertAdminQuery(query, caps);
  const inner = query.trim().replace(/;\s*$/, "");

  return sql.begin(async (tx) => {
    if (action === "read") {
      await tx.unsafe("SET TRANSACTION READ ONLY");
    }
    await tx.unsafe(`SET LOCAL statement_timeout = ${FREE_QUERY_TIMEOUT_MS}`);

    const sqlText =
      action === "read"
        ? `SELECT * FROM (${inner}) AS _admin_query LIMIT ${FREE_QUERY_ROW_LIMIT}`
        : inner;
    const rows = await tx.unsafe<Record<string, unknown>[]>(sqlText);
    const rawColumns = rows.columns
      ? rows.columns.map((c) => c.name)
      : rows[0]
        ? Object.keys(rows[0])
        : [];
    // Credential-Spalten als Top-Level-Ergebnis-Spalte entfernen — fängt
    // SELECT * ab, das die Spalte nicht namentlich nennt (die Text-Sperre in
    // assertAdminQuery greift dort nicht). Fast path, wenn keine Secret-Spalte
    // dabei ist (der Normalfall): flache Kopie ohne Pro-Zeile-Arbeit. Bewusst
    // NUR die Top-Level-Spalte — verschachtelte/serialisierte Zeilen (to_jsonb,
    // ::text) sind die dokumentierte, nicht app-seitig schließbare Grenze der
    // db-admin-Rolle (siehe assertAdminQuery); ein rekursiver JSON-Scrub würde
    // zudem legitime Inhaltsdaten mit einem gleichnamigen Schlüssel verstümmeln.
    const columns = rawColumns.filter((c) => !SECRET_COLUMNS.includes(c));
    const cleanRows =
      columns.length === rawColumns.length
        ? [...rows]
        : rows.map((row) => {
            const copy = { ...row };
            for (const c of SECRET_COLUMNS) delete copy[c];
            return copy;
          });
    return {
      columns,
      rows: cleanRows,
      command: rows.command,
      rowCount: rows.count,
    };
  });
}

// Reale Spaltennamen einer öffentlichen Basis-Tabelle (in Definitionsreihen-
// folge). Leeres Array, wenn es die Tabelle nicht als BASE TABLE gibt — dient
// zugleich als Existenz-/Identifier-Whitelist für das Zeilen-Edit/-Delete
// (rowEditActions.ts): nur hier zurückgegebene Namen dürfen serverseitig als
// (gequotete) Identifier in UPDATE/DELETE landen. Tabellenname als gebundener
// Parameter, nie interpoliert.
export async function getTableColumns(table: string): Promise<string[]> {
  const rows = await sql<{ column_name: string }[]>`
    SELECT c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name = ${table}
    ORDER BY c.ordinal_position
  `;
  return rows.map((r) => r.column_name);
}
