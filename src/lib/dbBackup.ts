import "server-only";
import sql from "@/lib/db";
import {
  BACKUP_TABLES,
  DB_TABLE_COLUMNS,
  type BackupTableName,
} from "./dbTables";

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
// WELCHE Tabellen gesichert werden und mit welchen Spalten, steht in
// src/lib/dbTables.ts (BACKUP_TABLES) — derselben Liste, aus der sich auch der
// Tabellen-Browser unter /admin/db speist. Dort steht auch, warum die
// Backup-Auswahl enger ist als die Tabellen der Datenbank.
const TABLES = BACKUP_TABLES;
type TableName = BackupTableName;

// Spalten-Whitelist für den Import (siehe importDatabaseBackup): nur diese
// Namen landen je als Identifier in einem INSERT.
export const TABLE_COLUMNS = Object.fromEntries(
  TABLES.map((table) => [table, DB_TABLE_COLUMNS[table]]),
) as { [T in TableName]: (typeof DB_TABLE_COLUMNS)[T] };

// Tabellen mit SERIAL-id-Spalte — deren Sequence muss nach dem Restore auf
// MAX(id)+1 gesetzt werden, sonst kollidiert der nächste per App erzeugte
// Datensatz mit einer wiederhergestellten id (archive_links/
// mission_participants haben keine id, nutzen ein zusammengesetztes PK).
// campaign_settings steht hier nicht zufällig: Ihre id ist BOOLEAN PRIMARY KEY
// DEFAULT TRUE (Ein-Zeilen-Tabelle, siehe schema.sql). MAX(id) darauf gibt es
// in Postgres nicht — der setval-Block unten würde daran scheitern.
const NO_SERIAL_ID: readonly TableName[] = [
  "archive_links",
  "mission_participants",
  "dialogue_reservations",
  "dialogue_reservation_notify_requests",
  "dialogue_npc_speakers",
  "timeline_event_characters",
  "game_session_characters",
  "planned_session_characters",
  "planned_session_rsvps",
  "campaign_settings",
  // Schlüssel ist der Rollen-Key (TEXT), keine Sequence.
  "roles",
  // Schlüssel ist character_id (ein Datensatz je umgewandeltem Charakter,
  // siehe schema.sql) — keine eigene id-Spalte, also auch keine Sequence.
  "character_npc_conversions",
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
  campaign_settings: [
    "advancement_rules",
    "changelog_featured_versions",
    "changelog_hidden_categories",
  ],
};

// 1 = die enge Tabellenauswahl bis v1.47, 2 = alle Inhalts- und
// Kampagnentabellen (siehe BACKUP_TABLES in dbTables.ts). Beide lassen sich
// einspielen: Der Restore richtet sich nach dem, was die Datei mitbringt,
// nicht nach ihrer Nummer — die Nummer sagt nur, was man erwarten darf.
export const DB_BACKUP_VERSION = 2;

export interface DbBackup {
  version: 1 | 2;
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
  return {
    version: DB_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

export interface RestoreDbSummary {
  tables: { name: string; rows: number }[];
  // Format der eingespielten Datei (siehe DB_BACKUP_VERSION).
  version: DbBackup["version"];
  // Gesicherte Tabellen, die in der Datei FEHLTEN — bei einer Datei im alten
  // Zuschnitt (v1) sind das die Kampagnentabellen. Wichtig zu wissen, weil
  // TRUNCATE ... CASCADE sie trotzdem leert, sofern sie an einem
  // wiederhergestellten Inhalt hängen: character_ap_entries zeigt auf
  // characters, wird mit geleert und findet in der Datei nichts zum
  // Wiederauffüllen. Das Panel weist darauf hin, statt es den Admin
  // hinterher herausfinden zu lassen.
  missingTables: string[];
}

export class InvalidBackupError extends Error {}

function assertValidBackup(value: unknown): asserts value is DbBackup {
  const version = (value as DbBackup | null)?.version;
  if (
    !value ||
    typeof value !== "object" ||
    (version !== 1 && version !== 2) ||
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
// Postgres nimmt höchstens 65535 gebundene Parameter pro Statement. Wie
// viele Zeilen in einen Block passen, hängt deshalb an der Spaltenzahl; die
// Obergrenze von 500 Zeilen hält zusätzlich den Speicherbedarf eines
// einzelnen Statements im Rahmen.
function blockSize(spalten: number): number {
  return Math.max(1, Math.min(500, Math.floor(60000 / spalten)));
}

function chunk<T>(items: T[], size: number): T[][] {
  const blocks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    blocks.push(items.slice(i, i + size));
  }
  return blocks;
}

export async function importDatabaseBackup(
  backup: unknown,
): Promise<RestoreDbSummary> {
  assertValidBackup(backup);

  const vorhandene = TABLES.filter((t) => Array.isArray(backup.tables[t]));
  const summary: RestoreDbSummary = {
    tables: [],
    version: backup.version,
    missingTables: TABLES.filter((t) => !vorhandene.includes(t)),
  };

  // Angefasst wird NUR, was die Datei mitbringt: Eine Tabelle, die darin mit
  // leerer Liste steht, ist eine Aussage („war leer") und wird geleert; eine,
  // die gar nicht vorkommt, geht den Restore nichts an. Das schützt die
  // unabhängigen Tabellen (talents, focuses, campaign_rules, roles,
  // campaign_settings …) beim Einspielen einer Datei im alten Zuschnitt.
  //
  // Vollständig schützen kann es sie nicht, und das ist keine Nachlässigkeit,
  // sondern TRUNCATE: Wer eine Tabelle leert, leert per CASCADE auch alles,
  // was per Fremdschlüssel auf sie zeigt — character_ap_entries hängt an
  // characters und ist nach einem Restore von characters leer, ob es in der
  // Datei steht oder nicht. Steht es darin (seit v2), wird es gleich wieder
  // gefüllt; fehlt es (v1), bleibt es leer. Genau diese Tabellen nennt
  // summary.missingTables, damit es niemand erst hinterher merkt.
  await sql.begin(async (tx) => {
    // Eine einzige TRUNCATE...CASCADE-Anweisung — die Reihenfolge darin ist
    // wegen CASCADE irrelevant. Ohne RESTART IDENTITY: die Sequences werden
    // unten pro Tabelle gezielt auf MAX(id) gesetzt, das deckt volle wie
    // leere Backups (Sequence dann zurück auf 1) einheitlich ab.
    //
    // CASCADE kann dabei über die Liste hinausgreifen: Was per Fremdschlüssel
    // auf eine geleerte Tabelle zeigt, wird mit geleert. Genau deshalb führt
    // BACKUP_TABLES inzwischen auch die Kindtabellen von characters &
    // Co. — sonst leert der Restore sie und füllt sie nie wieder.
    if (vorhandene.length > 0) {
      await tx.unsafe(
        `TRUNCATE ${vorhandene.map((t) => `"${t}"`).join(", ")} CASCADE`,
      );
    }

    for (const table of vorhandene) {
      const rows = backup.tables[table] ?? [];
      const knownColumns = TABLE_COLUMNS[table] as readonly string[];
      const jsonbCols = new Set(JSONB_COLUMNS[table] ?? []);

      // Zeilen nach ihrer Spaltenmenge gruppieren und blockweise einfügen
      // statt ein INSERT pro Zeile. Ein Restore war sonst eine Kette von
      // Round-Trips über den Pool, deren Länge mit dem Datenbestand wächst —
      // ausgerechnet in dem Moment, in dem es schnell gehen soll.
      //
      // Die Gruppierung ist nötig, weil sich die Spaltenmenge von Zeile zu
      // Zeile unterscheiden kann: Nur bekannte UND in der Zeile vorhandene
      // Spalten werden übernommen (Whitelist-Schnitt statt Object.keys(row)
      // direkt) — zusätzliche/unbekannte Keys aus einer neueren/älteren
      // Backup-Datei werden stillschweigend ignoriert, fehlende sollen der
      // Spalten-Vorgabe überlassen bleiben. Zeilen mit gleicher Spaltenmenge
      // passen in dasselbe Statement.
      //
      // Der Schlüssel dient nur der Gruppierung; die Spaltenliste selbst wird
      // daneben als Array gehalten, statt sie aus dem Schlüssel
      // zurückzuspalten — sonst hinge die Korrektheit daran, dass kein
      // Spaltenname je ein Komma enthält.
      const gruppen = new Map<
        string,
        { columns: string[]; zeilen: Record<string, unknown>[] }
      >();
      for (const row of rows) {
        const columns = knownColumns.filter((c) => c in row);
        // Eine Zeile ohne eine einzige bekannte Spalte trägt nichts bei, was
        // sich einfügen ließe (ein INSERT ohne Spalten ist kein gültiges SQL).
        // Sie wird übersprungen statt den ganzen Restore scheitern zu lassen;
        // vorkommen kann das nur bei einer kaputten Datei, denn jede Tabelle
        // hier führt mindestens eine id.
        if (columns.length === 0) continue;
        const key = columns.join("\u0000");
        const gruppe = gruppen.get(key) ?? { columns, zeilen: [] };
        gruppe.zeilen.push(row);
        gruppen.set(key, gruppe);
      }

      for (const { columns, zeilen: gruppenZeilen } of gruppen.values()) {
        const identifierList = columns.map((c) => `"${c}"`).join(", ");
        for (const block of chunk(gruppenZeilen, blockSize(columns.length))) {
          const values: unknown[] = [];
          const tupel = block.map((row) => {
            const platzhalter = columns.map((col) => {
              const value = row[col];
              values.push(
                jsonbCols.has(col) && value !== null
                  ? tx.json(value as ReturnType<typeof JSON.parse>)
                  : value,
              );
              return `$${values.length}`;
            });
            return `(${platzhalter.join(", ")})`;
          });

          await tx.unsafe(
            `INSERT INTO "${table}" (${identifierList}) VALUES ${tupel.join(", ")}`,
            values as never[],
          );
        }
      }

      summary.tables.push({ name: table, rows: rows.length });
    }

    // Sequences auf den höchsten wiederhergestellten id-Wert setzen, sonst
    // kollidiert die nächste per App erzeugte Zeile mit einer gerade
    // eingespielten id. setval(..., false) heißt "der NÄCHSTE nextval()-Call
    // liefert genau diesen Wert" — MAX(id)+1 ist damit korrekt, auch für
    // eine leere Tabelle (COALESCE(...,0)+1 = 1, wie eine frische Sequence).
    for (const table of SERIAL_TABLES.filter((t) => vorhandene.includes(t))) {
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
