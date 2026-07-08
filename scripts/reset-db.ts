// scripts/reset-db.ts
import sql from "@/lib/db";
import { readFileSync } from "fs";
import { join } from "path";
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";

// Alle Tabellen in der richtigen Reihenfolge (oder einfach CASCADE nutzen)
// Wir droppen in umgekehrter Dependency-Reihenfolge – CASCADE macht's ohnehin sicher.
const TABLES = [
  "timeline_events",
  "archive_links",
  "dialogue_messages",
  "archive_entries",
  "mission_logs",
  "missions",
  "characters",
  "users",
];

async function reset() {
  // ── Sicherheitscheck: --confirm muss explizit übergeben werden ──
  const confirmed = process.argv.includes("--confirm");

  if (!confirmed) {
    console.error("");
    console.error(
      "⚠️  WARNUNG: Dieses Script löscht ALLE Daten unwiderruflich.",
    );
    console.error("");
    console.error("   Zum Ausführen: npm run db:reset -- --confirm");
    console.error("");
    process.exit(1);
  }

  // ── Interaktive Bestätigung (zweite Sicherheitsstufe) ──
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(
    "❓ Wirklich alle Tabellen löschen und neu anlegen? [ja/NEIN] ",
  );
  rl.close();

  if (answer.trim().toLowerCase() !== "ja") {
    console.log("→ Abgebrochen.");
    process.exit(0);
  }

  // if (!process.env.DATABASE_URL) {
  //   throw new Error("DATABASE_URL ist nicht gesetzt");
  // }

  // const sql = postgres(process.env.DATABASE_URL, {
  //   ssl: { rejectUnauthorized: false },
  //   max: 1,
  //   onnotice: () => {},
  // });

  console.log("\n🔌 Verbinde mit Datenbank...");

  try {
    // ── Phase 1: DROP ──
    console.log("\n🗑  Lösche Tabellen...");
    for (const table of TABLES) {
      await sql.unsafe(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      console.log(`   ✓ ${table}`);
    }

    // ── Phase 2: CREATE (aus schema.sql) ──
    console.log("\n📦 Lege Tabellen neu an...");
    const schema = readFileSync(
      join(process.cwd(), "scripts", "schema.sql"),
      "utf8",
    );
    await sql.unsafe(schema);
    console.log("   ✓ Schema angelegt");

    console.log("\n✅ Datenbank erfolgreich zurückgesetzt.\n");
    console.log("   Nächster Schritt: npm run db:ingest\n");
  } catch (error) {
    console.error("\n❌ Fehler beim Reset:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

reset();
