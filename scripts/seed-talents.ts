// scripts/seed-talents.ts
//
// Spielt den Talent-Katalog aus scripts/seed/talents.json in die Tabelle
// talents ein (siehe scripts/schema.sql). Eigenständiger tsx-Einstiegspunkt
// wie scripts/seedExampleDialogue.ts, kein Bestandteil von db:ingest.
//
// IDEMPOTENT: Talente werden über ihren Namen erkannt; bereits vorhandene
// bleiben unverändert (ON CONFLICT DO NOTHING). Das ist Absicht — die
// Spielleitung darf importierte Talente unter /gm/talents anpassen, ein
// erneuter Lauf soll diese Anpassungen nicht wieder überschreiben.
//
//   npm run db:seed-talents        (Produktion, .env.local)
//   npm run db:seed-talents:dev    (lokal, .env.development.local)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sql from "@/lib/db";
import { isTalentCategory } from "@/lib/talentCatalog";

interface SeedTalent {
  name: string;
  category: string;
  requirement: string | null;
  description: string;
}

const here = dirname(fileURLToPath(import.meta.url));

async function main() {
  const raw = readFileSync(join(here, "seed", "talents.json"), "utf-8");
  const talents = JSON.parse(raw) as SeedTalent[];

  // Vor dem ersten INSERT prüfen: eine unbekannte Kategorie würde sonst erst
  // am CHECK der Tabelle scheitern — mitten im Lauf, mit halb gefüllter
  // Tabelle.
  for (const talent of talents) {
    if (!talent.name?.trim() || !talent.description?.trim()) {
      throw new Error(`Unvollständiges Talent: ${JSON.stringify(talent)}`);
    }
    if (!isTalentCategory(talent.category)) {
      throw new Error(`Unbekannte Kategorie "${talent.category}" bei ${talent.name}`);
    }
  }

  // Drei variable Talente hießen bisher mit „X“. Die alten Katalogzeilen
  // werden umbenannt, damit ein erneuter Seed keine zweite Auswahl erzeugt.
  // Wenn der Zielname bereits existiert, wird nur die alte importierte Zeile
  // entfernt; eigene Talente bleiben unberührt.
  for (const [oldName, newName] of [
    ["Bold X", "Bold"],
    ["Cautious X", "Cautious"],
    ["Collaboration X", "Collaboration"],
  ] as const) {
    await sql`
      UPDATE talents AS old
      SET name = ${newName}
      WHERE old.name = ${oldName}
        AND old.is_custom = FALSE
        AND NOT EXISTS (SELECT 1 FROM talents AS current WHERE current.name = ${newName})
    `;
    await sql`
      DELETE FROM talents AS old
      WHERE old.name = ${oldName}
        AND old.is_custom = FALSE
        AND EXISTS (SELECT 1 FROM talents AS current WHERE current.name = ${newName})
    `;
  }

  let inserted = 0;
  for (const talent of talents) {
    const rows = await sql`
      INSERT INTO talents (name, category, requirement, description, is_custom)
      VALUES (${talent.name}, ${talent.category}, ${talent.requirement},
              ${talent.description}, FALSE)
      ON CONFLICT (name) DO NOTHING
      RETURNING id
    `;
    if (rows.length > 0) inserted++;
  }

  // Diese Regelanforderung wurde geändert und soll auch bei bereits
  // vorhandenen importierten Zeilen dem aktuellen Regelstand entsprechen.
  const updated = await sql`
    UPDATE talents
    SET requirement = 'Department 4+'
    WHERE name = 'Dedicated Focus X'
      AND is_custom = FALSE
      AND requirement IS DISTINCT FROM 'Department 4+'
    RETURNING id
  `;

  console.log(
    `✓ ${inserted} Talente neu angelegt, ${talents.length - inserted} waren bereits vorhanden, ${updated.length} Anforderungen aktualisiert.`,
  );
  await sql.end();
}

main().catch((err) => {
  console.error("✗ Fehler:", err);
  process.exit(1);
});
