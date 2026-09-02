// scripts/fix-portrait-asset-urls.ts
//
// Einmalige Reparatur von Portrait-URLs, die mit einer falschen Basis-URL
// gespeichert wurden. Hintergrund: characters.portrait speichert bei einem
// Upload die absolute Auslieferungs-URL, gebaut aus R2_ASSET_PUBLIC_BASE_URL +
// Objekt-Key (siehe uploadCharacterPortraitImage in src/lib/characterAssets.ts).
// Stand in dieser Variable versehentlich der BUCKETNAME statt der Domain
// (z.B. "https://neo-archive-assets" statt "https://assets.neo-archiv.de"),
// entstand daraus eine gültige, aber nirgends auflösbare URL — das Bild wurde
// einfach nicht mehr angezeigt. buildAssetPublicUrl weist solche Basis-URLs
// inzwischen zurück (src/lib/assetStorage.ts); dieses Skript zieht die bereits
// gespeicherten Datensätze nach.
//
// Angefasst werden AUSSCHLIESSLICH Portraits, deren Pfad mit
// /character-portraits/ beginnt (also eigene Uploads) und deren Host von der
// konfigurierten Domain abweicht. Von Hand eingetragene externe Portrait-URLs
// und die relativen /api/content-images/…-Pfade bleiben unberührt.
//
// Idempotent: ein zweiter Lauf findet nichts mehr zu tun.
//
// Aufruf:
//   npm run assets:fix-portrait-urls               (repariert)
//   npm run assets:fix-portrait-urls -- --dry-run  (zeigt nur, was käme)
import sql from "@/lib/db";
import {
  buildAssetPublicUrl,
  repairedPortraitUrl,
  InvalidAssetError,
} from "@/lib/assetStorage";
import { requireEnv } from "@/lib/r2Backup";

const DRY_RUN = process.argv.includes("--dry-run");

interface CharacterPortraitRow {
  id: number;
  slug: string;
  portrait: string;
}

async function main(): Promise<void> {
  const baseUrl = requireEnv("R2_ASSET_PUBLIC_BASE_URL");

  // Basis-URL vorab prüfen: liefe das Skript mit derselben Fehlkonfiguration,
  // würde es die kaputten URLs nur durch andere kaputte ersetzen.
  try {
    buildAssetPublicUrl(baseUrl, "character-portraits/probe.jpg");
  } catch (err) {
    if (err instanceof InvalidAssetError) {
      console.error(`❌ ${err.message}`);
      console.error(
        "   Erst R2_ASSET_PUBLIC_BASE_URL korrigieren, dann das Skript erneut starten.",
      );
      process.exit(1);
    }
    throw err;
  }

  console.log(
    `🔧 Portrait-URLs gegen Basis "${baseUrl}" prüfen${DRY_RUN ? " (Trockenlauf)" : ""}…`,
  );

  const rows = await sql<CharacterPortraitRow[]>`
    SELECT id, slug, portrait
    FROM characters
    WHERE portrait LIKE 'http%'
    ORDER BY id
  `;

  let fixed = 0;
  for (const row of rows) {
    const repaired = repairedPortraitUrl(row.portrait, baseUrl);
    if (!repaired) continue;

    console.log(`  ${row.slug}`);
    console.log(`    alt: ${row.portrait}`);
    console.log(`    neu: ${repaired}`);
    fixed++;

    if (!DRY_RUN) {
      await sql`
        UPDATE characters
        SET portrait = ${repaired}, updated_at = NOW()
        WHERE id = ${row.id}
      `;
    }
  }

  if (fixed === 0) {
    console.log("✅ Keine reparaturbedürftigen Portrait-URLs gefunden.");
  } else if (DRY_RUN) {
    console.log(
      `\nℹ️  ${fixed} Datensatz/Datensätze WÜRDEN repariert (Trockenlauf, nichts geschrieben).`,
    );
  } else {
    console.log(`\n✅ ${fixed} Datensatz/Datensätze repariert.`);
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
