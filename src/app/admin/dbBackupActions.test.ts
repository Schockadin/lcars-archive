import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permissions: new Set<string>(),
  requirePermission: vi.fn(),
  restore: vi.fn(),
  download: vi.fn(),
  revalidateTag: vi.fn(),
  revalidateAllContent: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("@/lib/dal", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/lib/revalidate", () => ({
  revalidateAllContent: mocks.revalidateAllContent,
}));
vi.mock("@/lib/realtimeServer", () => ({
  revalidatePathAndNotify: mocks.notify,
}));
vi.mock("@/lib/dbBackup", () => ({
  importDatabaseBackup: mocks.restore,
  exportDatabaseBackup: vi.fn(),
  InvalidBackupError: class extends Error {},
}));
vi.mock("@/lib/r2Backup", () => ({
  downloadDbBackupFromR2: mocks.download,
  uploadDbBackupToR2: vi.fn(),
  buildManualDbBackupKey: vi.fn(),
  listDbBackupsInR2: vi.fn(),
  InvalidBackupKeyError: class extends Error {},
}));

import {
  importDbBackupAction,
  importDbBackupFromR2Action,
} from "./dbBackupActions";

const maliciousBackup = JSON.stringify({
  version: 2,
  tables: {
    roles: [{ key: "db-admin", permissions: ["users.manage"] }],
    password_setup_tokens: [{ user_id: 1, token_hash: "attacker-controlled" }],
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permissions.clear();
  mocks.permissions.add("db_backup");
  mocks.requirePermission.mockImplementation(async (permission: string) => {
    if (!mocks.permissions.has(permission))
      throw new Error(`forbidden:${permission}`);
    return { id: 1 };
  });
  mocks.restore.mockResolvedValue({
    version: 2,
    tables: [],
    missingTables: [],
  });
  mocks.download.mockResolvedValue(maliciousBackup);
});

describe("DB-Restore benötigt Kontenverwaltung", () => {
  it("verweigert manipulierte lokale Auth-Backups vor jedem Schreibzugriff", async () => {
    await expect(importDbBackupAction(maliciousBackup)).rejects.toThrow(
      "forbidden:users.manage",
    );
    expect(mocks.restore).not.toHaveBeenCalled();
  });

  it("verweigert R2-Restore vor Download und Schreibzugriff", async () => {
    await expect(
      importDbBackupFromR2Action("db-backups/example.json.enc"),
    ).rejects.toThrow("forbidden:users.manage");
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.restore).not.toHaveBeenCalled();
  });

  it("verlangt weiterhin auch die DB-Backup-Berechtigung", async () => {
    mocks.permissions.clear();
    mocks.permissions.add("users.manage");
    await expect(importDbBackupAction(maliciousBackup)).rejects.toThrow(
      "forbidden:db_backup",
    );
    expect(mocks.restore).not.toHaveBeenCalled();
  });

  it.each(["local", "r2"])(
    "erlaubt berechtigten %s-Restore und invalidiert Rollen",
    async (source) => {
      mocks.permissions.add("users.manage");
      const result =
        source === "local"
          ? await importDbBackupAction(maliciousBackup)
          : await importDbBackupFromR2Action("db-backups/example.json.enc");
      expect(result.error).toBeUndefined();
      expect(mocks.restore).toHaveBeenCalledWith(JSON.parse(maliciousBackup));
      expect(mocks.revalidateTag).toHaveBeenCalledWith("roles", { expire: 0 });
      expect(mocks.notify).toHaveBeenCalledWith("/", "layout");
    },
  );
});
