import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  InvalidBackupError,
} from "@/lib/dbBackup";
import { BACKUP_EXCLUDED_TABLES, BACKUP_TABLES } from "@/lib/dbTables";
import { insertCharacter, insertMission, insertUser } from "./helpers";

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


// Bis v1 sicherte das Backup eine enge Auswahl. Weil TRUNCATE ... CASCADE
// aber auf alles übergreift, was per Fremdschlüssel auf eine geleerte Tabelle
// zeigt, leerte ein Restore die Kindtabellen von characters gleich mit — und
// füllte sie mangels Daten nie wieder. Das AP-Konto einer Runde war danach
// weg. Seit v2 stehen sie in BACKUP_TABLES.
describe("DB-Backup, Umfang seit v2", () => {
  async function apPunkte(): Promise<number> {
    const [row] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM character_ap_entries
    `;
    return row.count;
  }

  async function apEintrag() {
    const user = await insertUser();
    const figur = await insertCharacter({ name: "AP-Figur" });
    await sql`
      INSERT INTO character_ap_entries (character_id, amount, reason, created_by)
      VALUES (${figur.id}, 3, 'bonus', ${user.id})
    `;
    return { user, figur };
  }

  it("trägt die Kampagnentabellen im Export", async () => {
    await apEintrag();

    const backup = await exportDatabaseBackup();

    expect(backup.version).toBe(2);
    expect(backup.tables.character_ap_entries).toHaveLength(1);
    // Stichproben quer durch die Gruppen, die v1 ausließ.
    for (const table of [
      "talents",
      "focuses",
      "campaign_rules",
      "game_sessions",
      "planned_sessions",
      "content_revisions",
      "content_images",
      "content_notes",
      "roles",
    ] as const) {
      expect(backup.tables[table]).toBeDefined();
    }
  });

  it("holt das AP-Konto beim Wiedereinspielen zurück", async () => {
    await apEintrag();
    const backup = await exportDatabaseBackup();

    await importDatabaseBackup(backup);

    expect(await apPunkte()).toBe(1);
  });

  // Was eine Datei im alten Zuschnitt anrichtet — und was nicht. TRUNCATE
  // CASCADE lässt sich nicht aushebeln: Wer characters leert, leert auch
  // alles, was daran hängt. Unabhängige Tabellen bleiben dagegen unangetastet,
  // weil der Restore nur noch anfasst, was die Datei nennt.
  it("lässt unabhängige Tabellen in Ruhe, die eine ältere Datei nicht kennt", async () => {
    await apEintrag();
    const user = await insertUser();
    await sql`
      INSERT INTO talents (name, category, description, created_by)
      VALUES ('Ausweichen', 'general', 'Beschreibung', ${user.id})
    `;

    // Eine Datei im alten Zuschnitt: nur characters, keine Kampagnentabellen.
    const summary = await importDatabaseBackup({
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      tables: { characters: [] },
    });

    // talents hängt an nichts, was die Datei leert — bleibt also stehen.
    const [talente] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM talents
    `;
    expect(talente.count).toBe(1);

    // character_ap_entries hängt an characters und ist deshalb leer. Das
    // sagt die Zusammenfassung auch: Die Tabelle fehlte in der Datei.
    expect(await apPunkte()).toBe(0);
    expect(summary.version).toBe(1);
    expect(summary.missingTables).toContain("character_ap_entries");
    expect(summary.missingTables).toContain("talents");
  });

  it("meldet bei einer vollständigen Datei nichts als fehlend", async () => {
    const backup = await exportDatabaseBackup();

    const summary = await importDatabaseBackup(backup);

    expect(summary.version).toBe(2);
    expect(summary.missingTables).toEqual([]);
  });

  it("nennt im Ergebnis nur die eingespielten Tabellen", async () => {
    const summary = await importDatabaseBackup({
      version: 2 as const,
      exportedAt: new Date().toISOString(),
      tables: { characters: [] },
    });

    expect(summary.tables.map((t) => t.name)).toEqual(["characters"]);
  });

  // campaign_settings hat als einzige gesicherte Tabelle eine BOOLEAN-id
  // (Ein-Zeilen-Tabelle). Liefe sie durch den setval-Block, scheiterte der
  // Restore an MAX(id) auf einem Boolean.
  it("spielt die Ein-Zeilen-Tabelle campaign_settings ein", async () => {
    await sql`
      INSERT INTO campaign_settings (id, ingame_year, advancement_rules)
      VALUES (TRUE, 2402, ${sql.json({ ap: 3 })})
      ON CONFLICT (id) DO UPDATE SET ingame_year = EXCLUDED.ingame_year,
                                     advancement_rules = EXCLUDED.advancement_rules
    `;
    const backup = await exportDatabaseBackup();

    await importDatabaseBackup(backup);

    const [row] = await sql<{ ingame_year: number; advancement_rules: unknown }[]>`
      SELECT ingame_year, advancement_rules FROM campaign_settings
    `;
    expect(row.ingame_year).toBe(2402);
    expect(row.advancement_rules).toEqual({ ap: 3 });
  });

  // Die Inserts des Restores laufen in der Reihenfolge von BACKUP_TABLES.
  // mission_logs und character_ap_entries zeigen per session_id auf
  // game_sessions — stünde game_sessions in der Liste dahinter, scheiterte
  // dieser Restore an der Fremdschlüssel-Prüfung und risse (eine
  // Transaktion) die gesamte Wiederherstellung mit. Eine Runde, die
  // Logbücher und AP-Gutschriften ihren Spielabenden zuordnet, ist der
  // Normalfall, nicht der Sonderfall.
  it("spielt Logbücher und AP-Gutschriften mit Session-Bezug wieder ein", async () => {
    const user = await insertUser();
    const figur = await insertCharacter({ name: "Session-Figur" });
    const mission = await insertMission();
    const [session] = await sql<{ id: number }[]>`
      INSERT INTO game_sessions (session_date, title, created_by)
      VALUES ('2401-05-12', 'Der Abend am Rand', ${user.id})
      RETURNING id
    `;
    await sql`
      INSERT INTO mission_logs (slug, mission_id, title, content, session_id)
      VALUES ('log-mit-session', ${mission.id}, 'Logbuch', 'Text', ${session.id})
    `;
    await sql`
      INSERT INTO character_ap_entries (character_id, amount, reason, session_id)
      VALUES (${figur.id}, 4, 'session', ${session.id})
    `;

    const backup = await exportDatabaseBackup();
    await importDatabaseBackup(backup);

    const [log] = await sql<{ session_id: number | null }[]>`
      SELECT session_id FROM mission_logs WHERE slug = 'log-mit-session'
    `;
    const [ap] = await sql<{ session_id: number | null; amount: number }[]>`
      SELECT session_id, amount FROM character_ap_entries
    `;
    // Nicht nur „überlebt", sondern mit unveränderter Zuordnung: Der Abend
    // hängt nach dem Restore noch am selben Logbuch und an derselben
    // Gutschrift.
    expect(log?.session_id).toBe(session.id);
    expect(ap?.session_id).toBe(session.id);
    expect(ap?.amount).toBe(4);
  });

  it("führt jede gesicherte Tabelle auch wirklich im Export", async () => {
    const backup = await exportDatabaseBackup();

    for (const table of BACKUP_TABLES) {
      expect(Object.keys(backup.tables)).toContain(table);
    }
  });
});


// Derselbe Abgleich, den der nächtliche Lauf gegen die produktive Datenbank
// macht (scripts/backup-db.ts) — hier gegen die Testdatenbank, die aus
// scripts/schema.sql entsteht. dbTables.test.ts liest dieselbe Datei als Text;
// dieser Fall fragt stattdessen die fertige Datenbank und deckt damit auch
// ab, was ein Parser übersehen könnte.
describe("DB-Backup gegen die laufende Datenbank", () => {
  it("kennt jede Tabelle der Datenbank — gesichert oder begründet ausgelassen", async () => {
    const rows = await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    const bekannt = new Set<string>([
      ...BACKUP_TABLES,
      ...BACKUP_EXCLUDED_TABLES,
    ]);

    const unbekannt = rows
      .map((r) => r.table_name)
      .filter((name) => !bekannt.has(name));

    expect(unbekannt).toEqual([]);
  });
});
