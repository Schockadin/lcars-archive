import { describe, expect, it } from "vitest";
import { decryptBackupJson, encryptBackupJson } from "./backupEncryption";

const key = Buffer.alloc(32, 7);

describe("backupEncryption", () => {
  it("encrypts a backup and restores it with the matching key and kind", () => {
    const plain = JSON.stringify({ users: [{ email: "test@example.org" }] });
    const encrypted = encryptBackupJson(plain, "users", key);
    expect(encrypted).not.toContain("test@example.org");
    expect(decryptBackupJson(encrypted, "users", key)).toBe(plain);
    expect(encryptBackupJson(plain, "users", key)).not.toBe(encrypted);
  });

  it("rejects wrong keys, tampering and another backup kind", () => {
    const encrypted = encryptBackupJson('{"tables":{}}', "database", key);
    expect(() =>
      decryptBackupJson(encrypted, "database", Buffer.alloc(32, 8)),
    ).toThrow();
    expect(() => decryptBackupJson(encrypted, "users", key)).toThrow();
    const changed = JSON.parse(encrypted);
    changed.data = Buffer.from("changed").toString("base64");
    expect(() =>
      decryptBackupJson(JSON.stringify(changed), "database", key),
    ).toThrow();
  });

  it("accepts legacy plaintext JSON for restore", () => {
    expect(decryptBackupJson('{"version":2}', "database", key)).toBe(
      '{"version":2}',
    );
  });
});
