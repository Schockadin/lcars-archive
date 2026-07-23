import "server-only";
import sql from "@/lib/db";

// Ersetzt das frühere Vault-Backup (siehe git-history src/lib/vaultExport.ts)
// als Weg, den kompletten Inhalt der Anwendung zu sichern — anders als das
// Vault-Backup (nur Charaktere/Missionen/Mission-Logs/Archiv-Einträge als
// Markdown) ist das hier ein vollständiger, wieder einspielbarer Dump so gut
// wie aller Tabellen (Beziehungsdaten wie Follows, Dialog-Nachrichten,
// Timeline, …) als eine JSON-Datei. Bewusst OHNE users: Useraccounts laufen
// über ihr eigenes, paralleles Backup (UserBackupPanel.tsx/lib/userBackup.ts,
// Upsert per E-Mail statt vollem Replace) — ein DB-Backup-Restore hier lässt
// die users-Tabelle unangetastet, referenzierte user_id/player_id-Werte in
// den restaurierten Zeilen müssen also zu noch vorhandenen Usern passen.
// Tabellen in Eltern-vor-Kind-Reihenfolge (FK-Constraints) — beim Restore
// relevant für Lesbarkeit, nicht für Korrektheit (TRUNCATE...CASCADE unten
// ignoriert die Reihenfolge ohnehin).
// Exportiert (statt modul-intern) — src/lib/dbInspect.ts nutzt dieselbe
// Whitelist für den read-only Tabellen-Viewer im Admin-Bereich.
export const TABLE_COLUMNS = {
  characters: [
    "id", "slug", "name", "status", "player_id", "portrait", "species",
    "rank", "bio", "metadata", "source_md", "frontmatter", "created_at",
    "updated_at", "visibility", "deleted_at", "is_draft",
  ],
  missions: [
    "id", "slug", "title", "status", "started_at", "ended_at", "metadata",
    "source_md", "frontmatter", "created_at", "updated_at", "owner_user_id",
    "deleted_at", "is_draft",
  ],
  mission_participants: ["mission_id", "character_id"],
  mission_logs: [
    "id", "slug", "mission_id", "author_id", "title", "content", "log_date",
    "session_nr", "metadata", "source_md", "frontmatter", "created_at",
    "updated_at", "owner_user_id", "visibility", "deleted_at", "is_draft",
  ],
  archive_entries: [
    "id", "slug", "title", "category", "content", "tags", "metadata",
    "source_md", "frontmatter", "created_at", "updated_at", "dialogue_open",
    "owner_user_id", "visibility", "deleted_at", "is_draft",
  ],
  archive_links: ["source_id", "target_id", "label"],
  dialogue_messages: [
    "id", "archive_entry_id", "character_id", "author_user_id", "content",
    "source_md", "created_at", "edited_at", "deleted_at",
  ],
  timeline_events: [
    "id", "event_date", "title", "category", "source_type", "source_slug",
    "href", "created_at",
  ],
  password_setup_tokens: [
    "id", "user_id", "token_hash", "expires_at", "used_at", "created_at",
  ],
  content_follows: [
    "id", "user_id", "target_type", "target_slug", "bookmarked_at",
    "subscribed_at", "created_at",
  ],
  push_subscriptions: [
    "id", "user_id", "endpoint", "p256dh", "auth", "created_at",
  ],
  content_deletions: [
    "id", "target_type", "title", "visibility", "owner_user_id",
    "deleted_by", "deleted_at",
  ],
  dialogue_reservations: [
    "archive_entry_id", "held_by_user_id", "expires_at", "created_at",
  ],
  dialogue_reservation_notify_requests: [
    "archive_entry_id", "user_id", "created_at",
  ],
} as const satisfies Record<string, readonly string[]>;

const TABLES = Object.keys(TABLE_COLUMNS) as (keyof typeof TABLE_COLUMNS)[];
export type TableName = (typeof TABLES)[number];

// Tabellen mit SERIAL-id-Spalte — deren Sequence muss nach dem Restore auf
// MAX(id)+1 gesetzt werden, sonst kollidiert der nächste per App erzeugte
// Datensatz mit einer wiederhergestellten id (archive_links/
// mission_participants haben keine id, nutzen ein zusammengesetztes PK).
const NO_SERIAL_ID: readonly TableName[] = [
  "archive_links",
  "mission_participants",
  "dialogue_reservations",
  "dialogue_reservation_notify_requests",
];
const SERIAL_TABLES = TABLES.filter(
  (t) => !(NO_SERIAL_ID as string[]).includes(t),
);

// JSONB-Spalten je Tabelle — beim Insert explizit mit sql.json() markiert
// (gleiches Prinzip wie an jeder anderen Insert-Stelle in dieser Codebase,
// siehe z.B. src/lib/characters.ts/archive.ts/missions.ts), sonst kann
// postgres.js ein JS-Objekt/Array nicht zuverlässig vom Zieltyp her erraten.
const JSONB_COLUMNS: Partial<Record<TableName, readonly string[]>> = {
  characters: ["metadata", "frontmatter"],
  missions: ["metadata", "frontmatter"],
  mission_logs: ["metadata", "frontmatter"],
  archive_entries: ["metadata", "frontmatter"],
};

export interface DbBackup {
  version: 1;
  exportedAt: string;
  tables: Partial<Record<TableName, Record<string, unknown>[]>>;
}

// SELECT * statt einer manuell gepflegten Spaltenliste beim Export — die
// Datei soll immer den vollständigen aktuellen Spaltenstand widerspiegeln.
// TABLE_COLUMNS (das beim Import als Whitelist dient) wird dabei bewusst
// NICHT für den SELECT verwendet, nur für den Import — s.u.
export async function exportDatabaseBackup(): Promise<DbBackup> {
  const tables: DbBackup["tables"] = {};
  for (const table of TABLES) {
    tables[table] = await sql.unsafe(`SELECT * FROM "${table}" ORDER BY 1`);
  }
  return { version: 1, exportedAt: new Date().toISOString(), tables };
}

export interface RestoreDbSummary {
  tables: { name: string; rows: number }[];
}

export class InvalidBackupError extends Error {}

function assertValidBackup(value: unknown): asserts value is DbBackup {
  if (
    !value ||
    typeof value !== "object" ||
    (value as DbBackup).version !== 1 ||
    typeof (value as DbBackup).tables !== "object"
  ) {
    throw new InvalidBackupError(
      "Datei ist kein gültiges DB-Backup (falsches Format oder Version).",
    );
  }
}

// Vollständiger Restore: leert ALLE Tabellen und spielt die Datei 1:1 wieder
// ein — kein Merge mit dem aktuellen DB-Stand (anders als
// restoreUsersBackup/src/lib/userBackup.ts, das gezielt per E-Mail
// upserted). Ein Backup ist damit immer der vollständige Soll-Zustand danach,
// nie eine Teilmenge. Läuft komplett in einer Transaktion: schlägt irgendein
// Insert fehl (z.B. Datei von einem inkompatiblen Schema-Stand), wird alles
// zurückgerollt statt die DB halb geleert liegen zu lassen.
//
// Spaltennamen für die Insert-Statements kommen NIE direkt aus der
// hochgeladenen Datei, sondern immer aus TABLE_COLUMNS (feste Whitelist) —
// die Datei liefert nur die Werte. Ohne diese Whitelist könnte eine
// manipulierte Backup-Datei über einen präparierten Objekt-Key SQL in die
// Identifier-Liste einschleusen.
export async function importDatabaseBackup(
  backup: unknown,
): Promise<RestoreDbSummary> {
  assertValidBackup(backup);

  const summary: RestoreDbSummary = { tables: [] };

  await sql.begin(async (tx) => {
    // Eine einzige TRUNCATE...CASCADE-Anweisung für alle Tabellen — die
    // Reihenfolge darin ist wegen CASCADE irrelevant. Ohne RESTART IDENTITY:
    // die Sequences werden unten pro Tabelle gezielt auf MAX(id) gesetzt,
    // das deckt volle wie leere Backups (Sequence dann zurück auf 1)
    // einheitlich ab.
    await tx.unsafe(
      `TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`,
    );

    for (const table of TABLES) {
      const rows = backup.tables[table] ?? [];
      const knownColumns = TABLE_COLUMNS[table] as readonly string[];
      const jsonbCols = new Set(JSONB_COLUMNS[table] ?? []);

      for (const row of rows) {
        // Nur bekannte Spalten übernehmen (Whitelist-Schnitt statt
        // Object.keys(row) direkt) — zusätzliche/unbekannte Keys aus einer
        // neueren/älteren Backup-Datei werden stillschweigend ignoriert.
        const columns = knownColumns.filter((c) => c in row);
        const values = columns.map((col) => {
          const value = row[col];
          return jsonbCols.has(col) && value !== null
            ? tx.json(value as ReturnType<typeof JSON.parse>)
            : value;
        });
        const identifierList = columns.map((c) => `"${c}"`).join(", ");
        const placeholderList = columns
          .map((_, i) => `$${i + 1}`)
          .join(", ");
        await tx.unsafe(
          `INSERT INTO "${table}" (${identifierList}) VALUES (${placeholderList})`,
          values as never[],
        );
      }

      summary.tables.push({ name: table, rows: rows.length });
    }

    // Sequences auf den höchsten wiederhergestellten id-Wert setzen, sonst
    // kollidiert die nächste per App erzeugte Zeile mit einer gerade
    // eingespielten id. setval(..., false) heißt "der NÄCHSTE nextval()-Call
    // liefert genau diesen Wert" — MAX(id)+1 ist damit korrekt, auch für
    // eine leere Tabelle (COALESCE(...,0)+1 = 1, wie eine frische Sequence).
    for (const table of SERIAL_TABLES) {
      await tx.unsafe(`
        SELECT setval(
          pg_get_serial_sequence('"${table}"', 'id'),
          COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1,
          false
        )
      `);
    }
  });

  return summary;
}
