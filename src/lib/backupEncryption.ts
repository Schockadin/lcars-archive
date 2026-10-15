import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type BackupKind = "database" | "users";

const FORMAT = "lcars-backup-encrypted";
const VERSION = 1;

export class BackupEncryptionError extends Error {}

export function backupEncryptionKey(
  value = process.env.BACKUP_ENCRYPTION_KEY,
): Buffer {
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    throw new BackupEncryptionError(
      "BACKUP_ENCRYPTION_KEY muss ein Base64-kodierter Schlüssel mit 32 Bytes sein.",
    );
  }
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value) {
    throw new BackupEncryptionError("BACKUP_ENCRYPTION_KEY ist ungültig.");
  }
  return key;
}

function associatedData(kind: BackupKind): Buffer {
  return Buffer.from(`${FORMAT}:${VERSION}:${kind}`);
}

export function encryptBackupJson(
  json: string,
  kind: BackupKind,
  key = backupEncryptionKey(),
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(associatedData(kind));
  const encrypted = Buffer.concat([
    cipher.update(json, "utf8"),
    cipher.final(),
  ]);
  return JSON.stringify({
    format: FORMAT,
    version: VERSION,
    kind,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  });
}

export function decryptBackupJson(
  input: string,
  kind: BackupKind,
  key?: Buffer,
): string {
  let envelope: unknown;
  try {
    envelope = JSON.parse(input);
  } catch {
    throw new BackupEncryptionError("Die Backup-Datei ist kein gültiges JSON.");
  }
  // Alte, vor Version 2.0 erstellte JSON-Sicherungen bleiben einspielbar.
  if (!envelope || typeof envelope !== "object" || !("format" in envelope)) {
    return input;
  }
  const data = envelope as Record<string, unknown>;
  if (
    data.format !== FORMAT ||
    data.version !== VERSION ||
    data.kind !== kind ||
    typeof data.iv !== "string" ||
    typeof data.tag !== "string" ||
    typeof data.data !== "string"
  ) {
    throw new BackupEncryptionError(
      "Unbekanntes oder unpassendes Backup-Format.",
    );
  }
  const iv = Buffer.from(data.iv, "base64");
  const tag = Buffer.from(data.tag, "base64");
  if (iv.length !== 12 || tag.length !== 16) {
    throw new BackupEncryptionError(
      "Die verschlüsselte Backup-Datei ist beschädigt.",
    );
  }
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key ?? backupEncryptionKey(),
      iv,
    );
    decipher.setAAD(associatedData(kind));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(data.data, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new BackupEncryptionError(
      "Backup kann nicht entschlüsselt werden. Schlüssel oder Datei prüfen.",
    );
  }
}
