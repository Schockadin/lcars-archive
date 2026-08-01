// scripts/migrate-content-images-to-asset-bucket.ts
//
// Einmaliger Umzug aller hochgeladenen Content-Bilder aus dem Backup-Bucket
// (R2_BUCKET_NAME, Präfix content-images/) in den neuen öffentlichen
// Asset-Bucket (R2_ASSET_BUCKET_NAME). Die App liest/schreibt Content-Bilder
// seit diesem Release im Asset-Bucket (src/lib/contentImages.ts) und fällt für
// noch nicht umgezogene Objekte auf den Backup-Bucket zurück — dieser Umzug
// räumt die Alt-Objekte endgültig aus dem Backup-Bucket heraus.
//
// Idempotent: bereits umgezogene Objekte liegen nicht mehr im Backup-Bucket
// und werden beim erneuten Lauf übersprungen. Reihenfolge pro Objekt: kopieren
// (in Asset-Bucket schreiben) → verifizieren → aus Backup-Bucket löschen, damit
// ein Abbruch nie zu Datenverlust führt (schlimmstenfalls liegt ein Objekt
// danach in beiden Buckets, was der Fallback-Lesepfad toleriert).
//
// Aufruf:
//   npm run assets:migrate-content-images            (führt den Umzug aus)
//   npm run assets:migrate-content-images -- --dry-run   (zeigt nur, was käme)
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createR2Client } from "./r2Client";
import {
  requireEnv,
  getObjectBytesFromR2,
  getAssetObjectBytesFromR2,
  uploadAssetObjectToR2,
  deleteAssetObjectFromR2,
  deleteObjectFromR2,
} from "@/lib/r2Backup";

// Bewusst hier dupliziert statt aus @/lib/contentImages importiert: jener
// Import zöge über sql aus @/lib/db die komplette DB-Kette herein (und würde
// ohne gesetztes DATABASE_URL schon beim Modul-Laden werfen). Die Migration
// arbeitet aber rein auf R2 und braucht die DB nicht — Wert muss mit
// CONTENT_IMAGE_PREFIX in src/lib/contentImages.ts übereinstimmen.
const CONTENT_IMAGE_PREFIX = "content-images/";

const DRY_RUN = process.argv.includes("--dry-run");

async function listBackupContentImageKeys(): Promise<string[]> {
  const { client, bucket } = createR2Client();
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: CONTENT_IMAGE_PREFIX,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of page.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

// Schreibt+löscht ein winziges Probe-Objekt im Asset-Bucket, BEVOR echte
// Objekte angefasst werden — so scheitert ein fehlendes Schreibrecht sofort und
// eindeutig (statt erst mitten in der Migration beim ersten PutObject).
async function preflightAssetBucketWrite(): Promise<void> {
  const probeKey = `${CONTENT_IMAGE_PREFIX}.migration-write-probe-${Date.now()}`;
  await uploadAssetObjectToR2(probeKey, Buffer.from("probe"), "text/plain");
  await deleteAssetObjectFromR2(probeKey);
}

async function main() {
  const keys = await listBackupContentImageKeys();
  if (keys.length === 0) {
    console.log("✓ Keine Content-Bilder im Backup-Bucket — nichts zu migrieren.");
    return;
  }

  console.log(
    `🔎 ${keys.length} Content-Bild(er) im Backup-Bucket gefunden${
      DRY_RUN ? " (Dry-Run, es wird nichts verändert)" : ""
    }.`,
  );

  if (!DRY_RUN) {
    console.log(
      `🔐 Prüfe Schreibrecht auf Asset-Bucket "${requireEnv("R2_ASSET_BUCKET_NAME")}"…`,
    );
    await preflightAssetBucketWrite();
    console.log("   ✓ Schreibrecht vorhanden.");
  }

  let moved = 0;
  let skipped = 0;
  for (const key of keys) {
    if (DRY_RUN) {
      console.log(`  → ${key}`);
      continue;
    }

    const object = await getObjectBytesFromR2(key);
    if (!object) {
      // Zwischen Auflistung und Zugriff verschwunden — überspringen.
      console.warn(`  ⚠ ${key}: im Backup-Bucket nicht mehr lesbar, übersprungen.`);
      skipped++;
      continue;
    }

    await uploadAssetObjectToR2(
      key,
      object.body,
      object.contentType ?? "application/octet-stream",
    );

    // Verifizieren, dass das Objekt im Asset-Bucket angekommen ist, bevor es
    // aus dem Backup-Bucket gelöscht wird.
    const verify = await getAssetObjectBytesFromR2(key);
    if (!verify || verify.body.byteLength !== object.body.byteLength) {
      console.error(
        `  ✗ ${key}: Verifikation im Asset-Bucket fehlgeschlagen — Backup-Objekt bleibt erhalten.`,
      );
      skipped++;
      continue;
    }

    await deleteObjectFromR2(key);
    moved++;
    console.log(`  ✓ ${key}`);
  }

  if (DRY_RUN) {
    console.log(`ℹ Dry-Run: ${keys.length} Objekt(e) würden migriert.`);
  } else {
    console.log(`✓ Fertig: ${moved} migriert, ${skipped} übersprungen.`);
  }
}

function isAccessDenied(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    ("Code" in error
      ? (error as { Code?: string }).Code === "AccessDenied"
      : (error as { name?: string }).name === "AccessDenied")
  );
}

main().catch((error) => {
  console.error("✗ Migration fehlgeschlagen:", error);
  if (isAccessDenied(error)) {
    console.error(
      [
        "",
        "→ Access Denied (403) kommt fast immer vom Asset-Bucket-Schreibrecht:",
        "  • Das R2-API-Token (R2_ACCESS_KEY_ID) braucht Object Read & Write auf",
        `    den Asset-Bucket "${process.env.R2_ASSET_BUCKET_NAME ?? "(R2_ASSET_BUCKET_NAME nicht gesetzt)"}".`,
        "  • Ist das Token in Cloudflare auf bestimmte Buckets eingeschränkt,",
        "    muss der Asset-Bucket dort mit aufgenommen werden (oder ein Token mit",
        "    kontoweitem Object-Read-&-Write nutzen).",
        "  • Prüfe außerdem, ob R2_ASSET_BUCKET_NAME exakt dem Bucketnamen entspricht.",
        "  Der Dry-Run funktioniert trotzdem, weil er nur den Backup-Bucket liest.",
      ].join("\n"),
    );
  }
  process.exitCode = 1;
});
