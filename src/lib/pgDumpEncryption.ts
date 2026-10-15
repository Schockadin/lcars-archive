import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { open, rm, stat, writeFile } from "node:fs/promises";
import { Transform, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { backupEncryptionKey, BackupEncryptionError } from "./backupEncryption";

const HEADER = Buffer.from("LCARS-PGDUMP-1\n");
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const AAD = Buffer.from("lcars-pgdump-v1");

export async function encryptPgDumpStream(
  source: Readable,
  outputPath: string,
  key = backupEncryptionKey(),
): Promise<void> {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(AAD);
  await writeFile(outputPath, Buffer.concat([HEADER, iv]), {
    flag: "wx",
    mode: 0o600,
  });
  const appendTag = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      callback(null, chunk);
    },
    flush(callback) {
      this.push(cipher.getAuthTag());
      callback();
    },
  });
  try {
    await pipeline(
      source,
      cipher,
      appendTag,
      createWriteStream(outputPath, { flags: "a" }),
    );
  } catch (error) {
    await rm(outputPath, { force: true });
    throw error;
  }
}

export async function decryptPgDumpFile(
  inputPath: string,
  outputPath: string,
  key = backupEncryptionKey(),
): Promise<void> {
  const size = (await stat(inputPath)).size;
  const prefixSize = HEADER.length + IV_LENGTH;
  if (size <= prefixSize + TAG_LENGTH) {
    throw new BackupEncryptionError(
      "Der verschlüsselte Dump ist unvollständig.",
    );
  }
  const file = await open(inputPath, "r");
  let prefix: Buffer;
  let tag: Buffer;
  try {
    prefix = Buffer.alloc(prefixSize);
    tag = Buffer.alloc(TAG_LENGTH);
    const prefixRead = await file.read(prefix, 0, prefixSize, 0);
    const tagRead = await file.read(tag, 0, TAG_LENGTH, size - TAG_LENGTH);
    if (
      prefixRead.bytesRead !== prefixSize ||
      tagRead.bytesRead !== TAG_LENGTH
    ) {
      throw new BackupEncryptionError(
        "Der verschlüsselte Dump ist unvollständig.",
      );
    }
  } finally {
    await file.close();
  }
  if (!prefix.subarray(0, HEADER.length).equals(HEADER)) {
    throw new BackupEncryptionError(
      "Die Datei ist kein verschlüsselter PostgreSQL-Dump.",
    );
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    prefix.subarray(HEADER.length),
  );
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);
  try {
    await pipeline(
      createReadStream(inputPath, {
        start: prefixSize,
        end: size - TAG_LENGTH - 1,
      }),
      decipher,
      createWriteStream(outputPath, { flags: "wx", mode: 0o600 }),
    );
  } catch {
    await rm(outputPath, { force: true });
    throw new BackupEncryptionError(
      "Dump kann nicht entschlüsselt werden. Schlüssel oder Datei prüfen.",
    );
  }
}
