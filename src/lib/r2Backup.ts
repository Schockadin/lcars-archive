// Cloudflare-R2-Zugriff (S3-kompatible API) — gemeinsame Quelle sowohl für
// den täglichen Backup-Cronjob (scripts/backup-db.ts/cleanup-db-backups.ts,
// re-exportiert über scripts/r2Client.ts, läuft per tsx außerhalb von Next,
// siehe dortiger --conditions=react-server-Kommentar) als auch für den
// manuellen Export/Import im Adminpanel (dbBackupActions.ts) UND für private
// Binärobjekte wie Charakterdokumente. Diese teilen sich den privaten Bucket
// (R2_BUCKET_NAME); der Key-Präfix trennt die Namensräume (db-backups/,
// user-backups/, character-documents/). Öffentliche Nutzer-Assets liegen im
// separaten Asset-Bucket weiter unten. "auto" statt einer echten AWS-Region
// und der Account-spezifische S3-Endpoint, siehe Cloudflare-R2-Doku.
//
// Das AWS-SDK wird nur per dynamic import geladen (siehe loadS3): Über
// contentImages.ts/characterAssets.ts hängt dieses Modul an den Datenmodulen,
// die nahezu jede Seite lädt. @aws-sdk/client-s3 ist ein von Next extern
// gehaltenes Paket (server-external-packages) — ein statischer Import würde
// es bei JEDEM Kaltstart der Server-Funktion samt @smithy-Unterbau per
// require() laden, obwohl nur Uploads, Backups und Dokument-Downloads es
// brauchen.
import "server-only";
import type { S3Client } from "@aws-sdk/client-s3";
import {
  BACKUP_PREFIX,
  buildManualDbBackupKey,
  buildManualUserBackupKey,
} from "@/lib/backupRetention";
import { buildAssetPublicUrl } from "@/lib/assetStorage";

export { buildManualDbBackupKey, buildManualUserBackupKey };

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} ist nicht gesetzt`);
  }
  return value;
}

// R2-Client ist unabhängig vom Bucket (dieselben Account-Credentials bedienen
// Backup- und Asset-Bucket) — der Bucketname wird separat aufgelöst.
type S3Module = typeof import("@aws-sdk/client-s3");

let s3Module: Promise<S3Module> | null = null;
function loadS3(): Promise<S3Module> {
  s3Module ??= import("@aws-sdk/client-s3");
  return s3Module;
}

async function createR2ClientFor(bucketEnvName: string): Promise<{
  client: S3Client;
  s3: S3Module;
  bucket: string;
}> {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requireEnv(bucketEnvName);

  const s3 = await loadS3();
  const client = new s3.S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, s3, bucket };
}

// Backup-Bucket (DB-/User-Backups). Für hochgeladene Assets (Content-Bilder,
// Portraits, Charakterbögen) den öffentlichen Asset-Bucket unten nutzen.
export function createR2Client(): ReturnType<typeof createR2ClientFor> {
  return createR2ClientFor("R2_BUCKET_NAME");
}

// Öffentlicher Asset-Bucket (R2_ASSET_BUCKET_NAME) — getrennt vom Backup-
// Bucket, damit hochgeladene Nutzer-Assets nicht zwischen den Backups liegen.
export function createAssetR2Client(): ReturnType<typeof createR2ClientFor> {
  return createR2ClientFor("R2_ASSET_BUCKET_NAME");
}

// Öffentliche Auslieferungs-URL eines Asset-Objekts (der Bucket wird über eine
// eigene Domain/Public-URL, R2_ASSET_PUBLIC_BASE_URL, direkt ausgeliefert —
// kein App-Proxy). Der Key wird nie zurück an den Client gegeben, nur diese
// fertige URL.
export function assetPublicUrl(key: string): string {
  return buildAssetPublicUrl(requireEnv("R2_ASSET_PUBLIC_BASE_URL"), key);
}

// Lädt einen fertigen Backup-JSON-Export nach R2 hoch — der Aufrufer baut
// den Key selbst (Cronjob: db-backups/JJJJ-MM-TT.json, siehe backup-db.ts;
// manueller DB-Export: buildManualDbBackupKey; manueller User-Export:
// buildManualUserBackupKey, beide in src/lib/backupRetention.ts), diese
// Funktion kennt nur den Upload-Mechanismus und wird für beide Backup-Arten
// (DB + User) genutzt.
export async function uploadDbBackupToR2(
  key: string,
  json: string,
): Promise<void> {
  const { client, s3, bucket } = await createR2Client();
  await client.send(
    new s3.PutObjectCommand({
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
  const { client, s3, bucket } = await createR2Client();

  const objects: R2BackupObject[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await client.send(
      new s3.ListObjectsV2Command({
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
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
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
  const { client, s3, bucket } = await createR2Client();
  const result = await client.send(
    new s3.GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const body = await result.Body?.transformToString();
  if (body == null) {
    throw new Error(
      `Backup "${key}" konnte nicht gelesen werden (leerer Inhalt).`,
    );
  }
  return body;
}

export interface R2ObjectBytes {
  body: Buffer;
  contentType: string | null;
}

// Private Binärobjekte, die ausschließlich über authentifizierte App-Routen
// ausgeliefert werden. Anders als Nutzerbilder gehören sie nicht in den
// öffentlichen Asset-Bucket; Charakterdokumente nutzen diesen Pfad.
export async function uploadObjectBytesToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const { client, s3, bucket } = await createR2Client();
  await client.send(
    new s3.PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObjectBytesFromR2(
  key: string,
): Promise<R2ObjectBytes | null> {
  const { client, s3, bucket } = await createR2Client();
  try {
    const result = await client.send(
      new s3.GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const bytes = await result.Body?.transformToByteArray();
    if (bytes == null) return null;
    return {
      body: Buffer.from(bytes),
      contentType: result.ContentType ?? null,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "NoSuchKey") return null;
    throw err;
  }
}

export async function deleteObjectFromR2(key: string): Promise<void> {
  const { client, s3, bucket } = await createR2Client();
  await client.send(new s3.DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// ── Öffentlicher Asset-Bucket ──────────────────────────────────────────────
// Gleiche Objekt-Operationen wie oben, aber gegen den Asset-Bucket
// (createAssetR2Client). Genutzt von src/lib/contentImages.ts für
// Content-Bilder und Portraits.

export async function uploadAssetObjectToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const { client, s3, bucket } = await createAssetR2Client();
  await client.send(
    new s3.PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getAssetObjectBytesFromR2(
  key: string,
): Promise<R2ObjectBytes | null> {
  const { client, s3, bucket } = await createAssetR2Client();
  try {
    const result = await client.send(
      new s3.GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const bytes = await result.Body?.transformToByteArray();
    if (bytes == null) return null;
    return {
      body: Buffer.from(bytes),
      contentType: result.ContentType ?? null,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "NoSuchKey") return null;
    throw err;
  }
}

export async function deleteAssetObjectFromR2(key: string): Promise<void> {
  const { client, s3, bucket } = await createAssetR2Client();
  await client.send(new s3.DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
