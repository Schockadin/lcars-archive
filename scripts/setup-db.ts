// scripts/setup-db.ts
import { readFileSync } from "fs";
import { join } from "path";
import sql from "@/lib/db";

const SCHEMA_NAME = "schema.sql";

async function setup() {
  console.log("🔌 Verbinde mit Datenbank...");

  try {
    const schema = readFileSync(
      join(process.cwd(), "scripts", SCHEMA_NAME),
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
