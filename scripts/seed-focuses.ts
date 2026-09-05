// scripts/seed-focuses.ts
//
// Spielt den Schwerpunkt-Katalog aus scripts/seed/focuses.json in die Tabelle
// focuses ein (siehe scripts/schema.sql). Eigenständiger tsx-Einstiegspunkt
// wie scripts/seed-talents.ts, kein Bestandteil von db:ingest.
//
// IDEMPOTENT: Schwerpunkte werden über (Name, Disziplin) erkannt; bereits
// vorhandene bleiben unverändert (ON CONFLICT DO NOTHING). Das ist Absicht —
// die Spielleitung darf importierte Einträge unter /gm/focuses anpassen, ein
// erneuter Lauf soll diese Anpassungen nicht wieder überschreiben.
//
//   npm run db:seed-focuses        (Produktion, .env.local)
//   npm run db:seed-focuses:dev    (lokal, .env.development.local)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sql from "@/lib/db";
import { isFocusDiscipline } from "@/lib/focusCatalog";

interface SeedFocus {
  name: string;
  discipline: string;
  description?: string | null;
}

const here = dirname(fileURLToPath(import.meta.url));

async function main() {
  const raw = readFileSync(join(here, "seed", "focuses.json"), "utf-8");
  const focuses = JSON.parse(raw) as SeedFocus[];

  // Vor dem ersten INSERT prüfen: eine unbekannte Disziplin würde sonst erst
  // am CHECK der Tabelle scheitern — mitten im Lauf, mit halb gefüllter
  // Tabelle.
  for (const focus of focuses) {
    if (!focus.name?.trim()) {
      throw new Error(`Unvollständiger Schwerpunkt: ${JSON.stringify(focus)}`);
    }
    if (!isFocusDiscipline(focus.discipline)) {
      throw new Error(
        `Unbekannte Disziplin "${focus.discipline}" bei ${focus.name}`,
      );
    }
  }

  let inserted = 0;
  for (const focus of focuses) {
    const rows = await sql`
      INSERT INTO focuses (name, discipline, description, is_custom)
      VALUES (${focus.name}, ${focus.discipline}, ${focus.description ?? null}, FALSE)
      ON CONFLICT (name, discipline) DO NOTHING
      RETURNING id
    `;
    if (rows.length > 0) inserted++;
  }

  console.log(
    `✓ ${inserted} Schwerpunkte neu angelegt, ${focuses.length - inserted} waren bereits vorhanden.`,
  );
  await sql.end();
}

main().catch((err) => {
  console.error("✗ Fehler:", err);
  process.exit(1);
});
