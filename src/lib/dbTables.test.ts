import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BACKUP_EXCLUDED_TABLES,
  BACKUP_TABLES,
  CONTENT_TABLES,
  DB_TABLES,
  DB_TABLE_COLUMNS,
  HIDDEN_FROM_VIEW,
  OMITTED_COLUMNS,
  VIEWABLE_TABLES,
  isViewableTable,
} from "@/lib/dbTables";

// Der Abgleich, der die Liste aktuell hält: scripts/schema.sql ist die
// Wahrheit über die Datenbank, src/lib/dbTables.ts die Liste, aus der sich der
// Tabellen-Browser unter /admin/db und das DB-Backup speisen. Wer eine Tabelle
// oder Spalte anlegt, ohne sie dort einzutragen, bekommt hier einen roten
// Test statt eine Lücke, die erst Monate später auffällt.
//
// Bewusst ein kleiner eigener Parser statt einer Abfrage gegen eine laufende
// Datenbank: Dieser Test soll überall laufen, auch ohne Postgres.
interface SchemaTable {
  columns: string[];
  // Von Postgres selbst gefüllte Spalten (tsvector-Suchindizes). Sie lassen
  // sich nicht einfügen und gehören deshalb in keine der beiden Listen.
  generated: Set<string>;
}

function parseSchema(sql: string): Map<string, SchemaTable> {
  const tables = new Map<string, SchemaTable>();
  const table = (name: string): SchemaTable => {
    const found = tables.get(name) ?? { columns: [], generated: new Set() };
    tables.set(name, found);
    return found;
  };
  // Kommentare weg, dann Anweisung für Anweisung: das Schema enthält kein
  // Semikolon in einem String-Literal, der Split ist damit eindeutig.
  const statements = sql
    .split("\n")
    .map((line) => line.split("--")[0])
    .join("\n")
    .split(";");

  for (const statement of statements) {
    const create = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*)\)/.exec(
      statement,
    );
    if (create) {
      const entry = table(create[1]);
      // Spaltendefinitionen sind die Kommas der OBERSTEN Klammerebene —
      // innerhalb von CHECK (…) stehen ebenfalls welche.
      let depth = 0;
      let current = "";
      const parts: string[] = [];
      for (const char of create[2]) {
        if (char === "(") depth++;
        if (char === ")") depth--;
        if (char === "," && depth === 0) {
          parts.push(current);
          current = "";
        } else {
          current += char;
        }
      }
      parts.push(current);

      for (const part of parts) {
        const column = /^\s*([a-z_][a-z0-9_]*)\s+[A-Za-z]/.exec(part);
        if (!column) continue;
        const name = column[1];
        // Tabellen-Constraints sehen wie eine Spalte aus („PRIMARY KEY (…)").
        if (
          ["primary", "unique", "check", "foreign", "constraint"].includes(name)
        ) {
          continue;
        }
        if (!entry.columns.includes(name)) entry.columns.push(name);
        if (/GENERATED/i.test(part)) entry.generated.add(name);
      }
      continue;
    }

    const alter = /ALTER TABLE (\w+)/.exec(statement);
    if (!alter) continue;
    const entry = table(alter[1]);
    for (const added of statement.matchAll(
      /ADD COLUMN IF NOT EXISTS (\w+)([\s\S]*?)(?=ADD COLUMN|$)/g,
    )) {
      const name = added[1];
      if (!entry.columns.includes(name)) entry.columns.push(name);
      if (/GENERATED/i.test(added[2])) entry.generated.add(name);
    }
    for (const dropped of statement.matchAll(/DROP COLUMN IF EXISTS (\w+)/g)) {
      entry.columns = entry.columns.filter((c) => c !== dropped[1]);
      entry.generated.delete(dropped[1]);
    }
  }

  // ALTER TABLE auf eine Tabelle, die es im Schema gar nicht gibt (z.B. nur
  // Constraint-Änderungen), hinterlässt einen leeren Eintrag — der ist keine
  // Tabelle.
  for (const [name, entry] of tables) {
    if (entry.columns.length === 0) tables.delete(name);
  }
  return tables;
}

const schema = parseSchema(
  readFileSync(join(process.cwd(), "scripts", "schema.sql"), "utf8"),
);

describe("scripts/schema.sql lässt sich lesen", () => {
  it("findet die Tabellen mit ihren Spalten", () => {
    // Sicherung gegen einen Parser, der stillschweigend nichts findet und
    // damit jeden Abgleich unten trivial bestehen ließe.
    expect(schema.size).toBeGreaterThan(30);
    expect(schema.get("characters")?.columns).toContain("character_color");
    expect(schema.get("characters")?.generated.has("search_vector")).toBe(true);
  });
});

describe("DB_TABLE_COLUMNS ist auf dem Stand des Schemas", () => {
  it("kennt jede Tabelle des Schemas — und keine darüber hinaus", () => {
    expect([...DB_TABLES].sort()).toEqual([...schema.keys()].sort());
  });

  it.each([...schema.keys()].sort())("hat alle Spalten von %s", (name) => {
    const entry = schema.get(name)!;
    const expected = entry.columns
      .filter((column) => !entry.generated.has(column))
      .sort();
    const listed = [
      ...(DB_TABLE_COLUMNS[name as keyof typeof DB_TABLE_COLUMNS] ?? []),
      ...(OMITTED_COLUMNS[name as keyof typeof DB_TABLE_COLUMNS] ?? []),
    ].sort();
    expect(listed).toEqual(expected);
  });

  it("führt keine generierte Spalte", () => {
    for (const [name, entry] of schema) {
      const listed = DB_TABLE_COLUMNS[name as keyof typeof DB_TABLE_COLUMNS];
      for (const generated of entry.generated) {
        expect(listed as readonly string[]).not.toContain(generated);
      }
    }
  });
});

describe("abgeleitete Listen", () => {
  it("zeigt im Browser alles außer den Geheimnis-Tabellen", () => {
    expect(VIEWABLE_TABLES).toHaveLength(
      DB_TABLES.length - HIDDEN_FROM_VIEW.length,
    );
    for (const hidden of HIDDEN_FROM_VIEW) {
      expect(isViewableTable(hidden)).toBe(false);
    }
    expect(isViewableTable("characters")).toBe(true);
    expect(isViewableTable("charakters")).toBe(false);
  });

  it("hält die Inhaltstabellen einsehbar", () => {
    for (const table of CONTENT_TABLES) {
      expect(isViewableTable(table)).toBe(true);
    }
  });

  it("sichert nur Tabellen, die es gibt — ohne Dubletten", () => {
    for (const table of BACKUP_TABLES) {
      expect(DB_TABLES).toContain(table);
    }
    expect(new Set(BACKUP_TABLES).size).toBe(BACKUP_TABLES.length);
  });

  // Der eigentliche Wächter: Jede Tabelle steht in genau einer der beiden
  // Listen. Wer eine neue anlegt, muss sich entscheiden — sichern oder mit
  // Begründung auslassen. Ohne das fiele sie stillschweigend aus dem Backup,
  // und genau so ist die Lücke entstanden, die v2 geschlossen hat.
  it("ordnet JEDE Tabelle dem Backup zu oder schließt sie begründet aus", () => {
    const zugeordnet = [...BACKUP_TABLES, ...BACKUP_EXCLUDED_TABLES];

    expect(new Set(zugeordnet).size).toBe(zugeordnet.length);
    expect([...zugeordnet].sort()).toEqual([...DB_TABLES].sort());
  });

  // Die Kindtabellen, die beim Restore sonst per TRUNCATE ... CASCADE
  // mitgeleert und nie wieder gefüllt würden (siehe dbBackup.ts).
  it("sichert die Kindtabellen der gesicherten Inhalte mit", () => {
    for (const table of [
      "character_ap_entries",
      "game_session_characters",
      "planned_session_characters",
      "timeline_event_characters",
      "dialogue_npc_speakers",
    ] as const) {
      expect(BACKUP_TABLES).toContain(table);
    }
  });
});
