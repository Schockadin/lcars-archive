// scripts/backup-db.ts
//
// Täglicher DB-Backup-Cronjob (siehe .github/workflows/daily-db-backup.yml):
// nutzt exportDatabaseBackup() — dieselbe Export-Logik wie der manuelle
// "DB-Backup herunterladen"-Button im Adminpanel (DbBackupPanel.tsx) — und
// lädt das Ergebnis nach Cloudflare R2 hoch. Läuft per `tsx` außerhalb von
// Next, braucht daher `--conditions=react-server`, damit das reale
// "server-only"-Package (jetzt eine echte Dependency, siehe package.json)
// über seine "react-server"-Exportbedingung auf den No-op-Stub statt auf
// den werfenden Default-Export auflöst — exakt die Bedingung, die Next.js'
// eigener Server-Build normalerweise implizit setzt.
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sql from "@/lib/db";
import { exportDatabaseBackup } from "@/lib/dbBackup";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} ist nicht gesetzt`);
  }
  return value;
}

async function main() {
  console.log("🔌 Exportiere Datenbank...");
  const backup = await exportDatabaseBackup();
  const json = JSON.stringify(backup);

  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requireEnv("R2_BUCKET_NAME");

  // R2 spricht die S3-API, braucht aber "auto" statt einer echten AWS-Region
  // (siehe Cloudflare-R2-Doku) und den Account-spezifischen S3-Endpoint.
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  // Ein Key pro Kalendertag (nicht Timestamp) — ein erneuter Lauf am selben
  // Tag überschreibt statt zu duplizieren. Aufbewahrungsfrist/Aufräumen alter
  // Backups ist bewusst kein Skript-Feature, sondern eine R2-Lifecycle-Regel
  // auf dem Bucket selbst (Cloudflare-Dashboard) — verlässlicher als
  // selbstgebaute Lösch-Logik in diesem Skript.
  const date = new Date().toISOString().slice(0, 10);
  const key = `db-backups/${date}.json`;

  console.log(`☁️  Lade Backup nach r2://${bucket}/${key} hoch...`);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: json,
      ContentType: "application/json",
    }),
  );

  console.log(`✓ Backup hochgeladen (${(json.length / 1024).toFixed(1)} KB)`);
}

main()
  .catch((error) => {
    console.error("✗ Backup fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
