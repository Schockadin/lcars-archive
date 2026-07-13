// scripts/cleanup-db-backups.ts
//
// Löscht DB-Backups aus R2, die älter als RETENTION_DAYS sind — läuft im
// selben täglichen Cronjob direkt nach dem Backup-Upload (siehe
// .github/workflows/daily-db-backup.yml, backup-db.ts). Das Alter wird aus
// dem Datei-Key selbst gelesen (db-backups/YYYY-MM-DD.json, siehe
// backup-db.ts), nicht aus S3s LastModified — ein erneuter Upload am selben
// Tag würde LastModified zurücksetzen, ohne dass das Backup inhaltlich
// "neuer" ist.
import {
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { createR2Client } from "./r2Client";

const RETENTION_DAYS = 30;
const PREFIX = "db-backups/";
const KEY_PATTERN = /^db-backups\/(\d{4}-\d{2}-\d{2})\.json$/;

async function main() {
  const { client, bucket } = createR2Client();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  console.log(
    `🔎 Suche Backups älter als ${cutoff.toISOString().slice(0, 10)}...`,
  );

  const staleKeys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: PREFIX,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of page.Contents ?? []) {
      const match = obj.Key?.match(KEY_PATTERN);
      if (match && new Date(match[1]) < cutoff) {
        staleKeys.push(obj.Key!);
      }
    }
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);

  if (staleKeys.length === 0) {
    console.log("✓ Keine veralteten Backups gefunden.");
    return;
  }

  console.log(
    `🗑️  Lösche ${staleKeys.length} veraltete(s) Backup(s): ${staleKeys.join(", ")}`,
  );
  await client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: staleKeys.map((Key) => ({ Key })) },
    }),
  );
  console.log("✓ Aufgeräumt.");
}

main().catch((error) => {
  console.error("✗ Aufräumen fehlgeschlagen:", error);
  process.exitCode = 1;
});
