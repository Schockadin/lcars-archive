// scripts/r2Client.ts
//
// Gemeinsam genutzter R2-Client für die DB-Backup-Cronjobs (backup-db.ts,
// cleanup-db-backups.ts) — R2 spricht die S3-API, braucht aber "auto" statt
// einer echten AWS-Region und den Account-spezifischen S3-Endpoint (siehe
// Cloudflare-R2-Doku).
import { S3Client } from "@aws-sdk/client-s3";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} ist nicht gesetzt`);
  }
  return value;
}

export function createR2Client(): { client: S3Client; bucket: string } {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requireEnv("R2_BUCKET_NAME");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, bucket };
}
