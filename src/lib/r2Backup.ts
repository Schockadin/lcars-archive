// Cloudflare-R2-Zugriff (S3-kompatible API) — gemeinsame Quelle sowohl für
// den täglichen Backup-Cronjob (scripts/backup-db.ts/cleanup-db-backups.ts,
// re-exportiert über scripts/r2Client.ts, läuft per tsx außerhalb von Next,
// siehe dortiger --conditions=react-server-Kommentar) als auch für den
// manuellen Export/Import im Adminpanel (dbBackupActions.ts) UND für
// beliebige Binärobjekte (Content-Bilder, src/lib/contentImages.ts) — alle
// drei teilen sich denselben Bucket (R2_BUCKET_NAME), nur der Key-Präfix
// unterscheidet den "Namensraum" (db-backups/, user-backups/,
// content-images/). "auto" statt einer echten AWS-Region und der
// Account-spezifische S3-Endpoint, siehe Cloudflare-R2-Doku.
import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import {
  BACKUP_PREFIX,
  buildManualDbBackupKey,
  buildManualUserBackupKey,
} from "@/lib/backupRetention";

export { buildManualDbBackupKey, buildManualUserBackupKey };

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

// Lädt einen fertigen Backup-JSON-Export nach R2 hoch — der Aufrufer baut
// den Key selbst (Cronjob: db-backups/JJJJ-MM-TT.json, siehe backup-db.ts;
// manueller DB-Export: buildManualDbBackupKey; manueller User-Export:
// buildManualUserBackupKey, beide in src/lib/backupRetention.ts), diese
// Funktion kennt nur den Upload-Mechanismus und wird für beide Backup-Arten
// (DB + User) genutzt.
export async function uploadDbBackupToR2(key: string, json: string): Promise<void> {
  const { client, bucket } = createR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: json,
      ContentType: "application/json",
    }),
  );
}

export interface R2BackupObject {
  key: string;
  sizeBytes: number;
  lastModified: string | null;
}

// Listet alle Backup-Objekte im Bucket unter einem Präfix (Default:
// db-backups/, tägliche Cronjob-Backups UND manuelle; UserBackupPanel.tsx
// ruft mit USER_BACKUP_PREFIX auf), neueste zuerst — Grundlage für "Aus
// R2-Bucket importieren" im Adminpanel.
export async function listDbBackupsInR2(
  prefix: string = BACKUP_PREFIX,
): Promise<R2BackupObject[]> {
  const { client, bucket } = createR2Client();

  const objects: R2BackupObject[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of page.Contents ?? []) {
      if (obj.Key) {
        objects.push({
          key: obj.Key,
          sizeBytes: obj.Size ?? 0,
          lastModified: obj.LastModified?.toISOString() ?? null,
        });
      }
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects.sort((a, b) => b.key.localeCompare(a.key));
}

// Der Backup-Key kommt beim Import client->server als String (Auswahl aus
// listDbBackupsInR2, siehe importDbBackupFromR2Action) — defensiv gegen
// einen manipulierten Wert geprüft, damit sich darüber nicht auf beliebige
// Bucket-Objekte außerhalb des erwarteten Präfixes zugreifen lässt.
export class InvalidBackupKeyError extends Error {}

// Lädt genau ein Backup-Objekt aus R2 und gibt seinen Inhalt als Text
// zurück (JSON, noch ungeparst — Parsing/Validieren bleibt beim jeweiligen
// Aufrufer, gleiches Prinzip wie beim lokalen Datei-Import). requiredPrefix
// grenzt ein, aus welchem "Namensraum" (db-backups/ vs. user-backups/)
// gelesen werden darf.
export async function downloadDbBackupFromR2(
  key: string,
  requiredPrefix: string = BACKUP_PREFIX,
): Promise<string> {
  if (!key.startsWith(requiredPrefix) || key.includes("..")) {
    throw new InvalidBackupKeyError(`Ungültiger Backup-Key: "${key}"`);
  }
  const { client, bucket } = createR2Client();
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = await result.Body?.transformToString();
  if (body == null) {
    throw new Error(`Backup "${key}" konnte nicht gelesen werden (leerer Inhalt).`);
  }
  return body;
}

// Generische Binärobjekt-Funktionen (Content-Bilder, siehe
// src/lib/contentImages.ts) — anders als uploadDbBackupToR2/
// downloadDbBackupFromR2 oben kein Text/JSON, sondern beliebige Bytes mit
// eigenem Content-Type.
export async function uploadObjectToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const { client, bucket } = createR2Client();
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
}

export interface R2ObjectBytes {
  body: Buffer;
  contentType: string | null;
}

export async function getObjectBytesFromR2(key: string): Promise<R2ObjectBytes | null> {
  const { client, bucket } = createR2Client();
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await result.Body?.transformToByteArray();
    if (bytes == null) return null;
    return { body: Buffer.from(bytes), contentType: result.ContentType ?? null };
  } catch (err) {
    if (err instanceof Error && err.name === "NoSuchKey") return null;
    throw err;
  }
}

export async function deleteObjectFromR2(key: string): Promise<void> {
  const { client, bucket } = createR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
