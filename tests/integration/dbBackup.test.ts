import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  InvalidBackupError,
} from "@/lib/dbBackup";
import { insertCharacter } from "./helpers";

// users steht bewusst NICHT im DB-Backup (dafür gibt es src/lib/userBackup.ts)
// — die Tests laufen deshalb über characters, das zugleich JSONB-Spalten
// (metadata, frontmatter) mitbringt.

describe("exportDatabaseBackup / importDatabaseBackup", () => {
  it("spielt einen Export unverändert wieder ein", async () => {
    const figur = await insertCharacter({ name: "Testfigur" });

    const backup = await exportDatabaseBackup();
    const summary = await importDatabaseBackup(backup);

    const [wieder] = await sql<{ name: string }[]>`
      SELECT name FROM characters WHERE id = ${figur.id}
    `;
    expect(wieder?.name).toBe("Testfigur");
    expect(summary.tables.find((t) => t.name === "characters")?.rows).toBe(1);
  });

  it("spielt mehrere Zeilen einer Tabelle vollständig ein", async () => {
    for (let i = 0; i < 25; i += 1) {
      await insertCharacter({ name: `Figur ${i}`, slug: `figur-${i}` });
    }

    const backup = await exportDatabaseBackup();
    await importDatabaseBackup(backup);

    const [row] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM characters
    `;
    expect(row.count).toBe(25);
  });

  // Der Kern der Umstellung auf blockweise INSERTs: Zeilen werden nach ihrer
  // Spaltenmenge gruppiert. Kommen in einer Tabelle Zeilen mit
  // unterschiedlichen Spalten vor — so wie es eine Backup-Datei von einem
  // älteren Schemastand liefert —, dürfen sie sich nicht gegenseitig die
  // Werte verschieben.
  it("verträgt Zeilen mit unterschiedlichen Spaltenmengen", async () => {
    const erste = await insertCharacter({ name: "Vollständig", slug: "vollstaendig" });

    const backup = await exportDatabaseBackup();
    const characters = backup.tables.characters ?? [];
    const knapp: Record<string, unknown> = {
      ...characters[0],
      id: erste.id + 1,
      slug: "ohne-feld",
      name: "Ohne Feld",
    };
    delete knapp.species;
    delete knapp.rank;
    characters.push(knapp);

    await importDatabaseBackup(backup);

    const rows = await sql<
      { id: number; name: string; slug: string; species: string | null }[]
    >`
      SELECT id, name, slug, species FROM characters ORDER BY id
    `;
    // Beide Zeilen kommen an, Name und Slug gehören weiterhin zusammen
    // (nichts ist gegeneinander verrutscht).
    expect(rows.map((r) => [r.name, r.slug])).toEqual([
      ["Vollständig", "vollstaendig"],
      ["Ohne Feld", "ohne-feld"],
    ]);
    // Die Spalte, die der zweiten Zeile fehlte, bleibt dort leer, statt den
    // Wert der ersten zu erben.
    expect(rows[1].species).toBeNull();
  });

  it("setzt die Sequence hinter die höchste wiederhergestellte id", async () => {
    const figur = await insertCharacter();
    const backup = await exportDatabaseBackup();

    await importDatabaseBackup(backup);

    // Die nächste per App angelegte Zeile darf nicht mit einer gerade
    // eingespielten id kollidieren.
    const neu = await insertCharacter({ slug: "nach-restore" });
    expect(neu.id).toBeGreaterThan(figur.id);
  });

  it("lehnt eine Datei mit falschem Format ab", async () => {
    await expect(importDatabaseBackup({ version: 99 })).rejects.toBeInstanceOf(
      InvalidBackupError,
    );
    await expect(importDatabaseBackup(null)).rejects.toBeInstanceOf(
      InvalidBackupError,
    );
  });
});
