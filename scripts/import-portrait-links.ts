// scripts/import-portrait-links.ts
//
// Einmaliger Wartungslauf: Portraits, die als ADRESSE gespeichert sind, holen
// und als eigenen Upload ablegen.
//
// Hintergrund: Ein Portrait wird nur noch als Datei hochgeladen (siehe
// PortraitPicker.tsx). Im Bestand stehen aber noch Werte aus der Zeit davor —
// von Hand eingetragene fremde Adressen und Data-URLs aus dem Vault-Import.
// Beides ist die schlechtere Haltung: ein fremdes Bild verschwindet, sobald
// dort jemand aufräumt, lässt sich hier nicht zuschneiden (CORS) und meldet
// jeden Aufruf des Bogens an diesen Server; eine Data-URL bläht jede Zeile
// auf, die den Charakter liest. Nach diesem Lauf liegt jedes Portrait im
// eigenen Asset-Bucket.
//
// Angefasst werden characters.portrait UND metadata.portraitSource (das
// Original, aus dem der Ausschnitt geschnitten wurde). Beide werden getrennt
// betrachtet: zeigen sie auf dasselbe Bild, wird es auch nur einmal geladen.
//
// NICHT angefasst: was bereits im Asset-Bucket liegt, und die relativen
// /api/content-images/…-Pfade — das sind ebenfalls eigene Uploads, nur über
// den Proxy adressiert; ein zweiter Upload würde dasselbe Bild verdoppeln.
//
// Idempotent: ein zweiter Lauf findet nichts mehr zu tun.
//
// Aufruf:
//   npm run assets:import-portrait-links               (überführt)
//   npm run assets:import-portrait-links -- --dry-run  (zeigt nur, was käme)
import sql from "@/lib/db";
import { requireEnv } from "@/lib/r2Backup";
import { InvalidAssetError } from "@/lib/assetStorage";
import { needsPortraitImport, portraitKind } from "@/lib/portraitSource";
import {
  importPortraitFromUrl,
  PortraitImportError,
} from "@/lib/portraitImport";

const DRY_RUN = process.argv.includes("--dry-run");

interface CharacterRow {
  id: number;
  slug: string;
  portrait: string | null;
  portrait_source: string | null;
}

// Eine Adresse wird höchstens einmal geladen, auch wenn mehrere Charaktere
// (oder Portrait und Original desselben Charakters) auf sie zeigen.
const uploaded = new Map<string, string>();

async function importOnce(url: string): Promise<string> {
  const known = uploaded.get(url);
  if (known) return known;
  const fresh = await importPortraitFromUrl(url);
  uploaded.set(url, fresh);
  return fresh;
}

// Für die Ausgabe: eine Data-URL ist tausende Zeichen lang und würde die
// Konsole zumüllen.
function short(url: string): string {
  return url.length > 70 ? `${url.slice(0, 67)}…` : url;
}

async function main(): Promise<void> {
  const assetBase = requireEnv("R2_ASSET_PUBLIC_BASE_URL");

  console.log(
    `🖼️  Portrait-Adressen gegen "${assetBase}" prüfen${DRY_RUN ? " (Trockenlauf)" : ""}…`,
  );

  const rows = await sql<CharacterRow[]>`
    SELECT id,
           slug,
           portrait,
           metadata->>'portraitSource' AS portrait_source
    FROM characters
    WHERE deleted_at IS NULL
    ORDER BY id
  `;

  let changed = 0;
  let failed = 0;

  for (const row of rows) {
    const portraitTodo = needsPortraitImport(row.portrait, assetBase);
    const sourceTodo = needsPortraitImport(row.portrait_source, assetBase);
    if (!portraitTodo && !sourceTodo) continue;

    console.log(`  ${row.slug}`);
    if (portraitTodo) {
      console.log(
        `    portrait       (${portraitKind(row.portrait, assetBase)}): ${short(row.portrait!)}`,
      );
    }
    if (sourceTodo) {
      console.log(
        `    portraitSource (${portraitKind(row.portrait_source, assetBase)}): ${short(row.portrait_source!)}`,
      );
    }

    if (DRY_RUN) {
      changed++;
      continue;
    }

    try {
      const newPortrait = portraitTodo
        ? await importOnce(row.portrait!)
        : row.portrait;
      const newSource = sourceTodo
        ? await importOnce(row.portrait_source!)
        : row.portrait_source;

      // Zwei getrennte Felder, ein Schreibvorgang: das Portrait ist eine
      // Spalte, das Original steckt in der Metadata und wird hineingemischt,
      // damit die übrigen Metadaten stehen bleiben.
      await sql`
        UPDATE characters
        SET portrait   = ${newPortrait},
            metadata   = metadata || ${sql.json({ portraitSource: newSource })},
            updated_at = NOW()
        WHERE id = ${row.id}
      `;
      console.log(`    → ${short(newPortrait ?? "")}`);
      changed++;
    } catch (err) {
      // Ein einzelnes nicht mehr erreichbares Bild darf den Lauf nicht
      // abbrechen — der Rest ist trotzdem zu retten.
      failed++;
      const reason =
        err instanceof PortraitImportError || err instanceof InvalidAssetError
          ? err.message
          : String(err);
      console.log(`    ⚠️  übersprungen: ${reason}`);
    }
  }

  if (changed === 0 && failed === 0) {
    console.log("✅ Alle Portraits liegen bereits als eigener Upload vor.");
  } else if (DRY_RUN) {
    console.log(
      `\nℹ️  ${changed} Charakter(e) WÜRDEN überführt (Trockenlauf, nichts geschrieben).`,
    );
  } else {
    console.log(`\n✅ ${changed} Charakter(e) überführt.`);
    if (failed > 0) {
      console.log(
        `⚠️  ${failed} Charakter(e) übersprungen — die Adressen oben sind nicht mehr brauchbar. ` +
          "Dort hilft nur, das Bild von Hand neu hochzuladen.",
      );
    }
    console.log(
      "   Danach einmal den Cache auffrischen (npm run db:revalidate), damit die " +
        "Charakterseiten die neuen URLs ausliefern.",
    );
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
