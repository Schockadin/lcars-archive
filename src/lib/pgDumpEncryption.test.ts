import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { decryptPgDumpFile, encryptPgDumpStream } from "./pgDumpEncryption";

describe("pgDumpEncryption", () => {
  it("streams an encrypted dump and rejects a changed authentication tag", async () => {
    const directory = await mkdtemp(join(tmpdir(), "lcars-dump-test-"));
    const encrypted = join(directory, "backup.dump.enc");
    const restored = join(directory, "restored.dump");
    const key = Buffer.alloc(32, 12);
    const plain = Buffer.from("PGDMP\0secret-data".repeat(1000));
    try {
      await encryptPgDumpStream(Readable.from([plain]), encrypted, key);
      const bytes = await readFile(encrypted);
      expect(bytes.includes(Buffer.from("secret-data"))).toBe(false);
      await decryptPgDumpFile(encrypted, restored, key);
      expect(await readFile(restored)).toEqual(plain);

      bytes[bytes.length - 1] ^= 1;
      await writeFile(encrypted, bytes);
      await expect(
        decryptPgDumpFile(encrypted, join(directory, "bad.dump"), key),
      ).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
