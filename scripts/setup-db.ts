import { readFileSync } from "fs";
import { join } from "path";
import sql from "@/lib/db";
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";

async function setup() {
  console.log("🔌 Verbinde mit Datenbank...");

  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(
    "Welches Schema soll angewandt werden (ohne Auswahl: schema.sql)? ",
  );
  rl.close();

  const schemaName = answer.trim().toLowerCase() || "schema.sql";

  try {
    const schema = readFileSync(
      join(process.cwd(), "scripts", schemaName),
      "utf8",
    );

    console.log("📦 Erstelle Tabellen...");
    await sql.unsafe(schema);

    console.log("✓ Schema erfolgreich angelegt");
  } catch (error) {
    console.error("✗ Fehler beim Setup:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setup();
