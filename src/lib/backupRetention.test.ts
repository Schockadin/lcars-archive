import { describe, it, expect } from "vitest";
import {
  BACKUP_RETENTION_DAYS,
  computeBackupCutoff,
  isStaleBackupKey,
} from "./backupRetention";

describe("computeBackupCutoff", () => {
  it("subtracts the retention window and returns UTC midnight, regardless of the current time-of-day", () => {
    const earlyMorning = new Date("2026-07-13T00:05:00Z");
    const lateEvening = new Date("2026-07-13T23:55:00Z");

    const cutoffFromEarly = computeBackupCutoff(earlyMorning, 30);
    const cutoffFromLate = computeBackupCutoff(lateEvening, 30);

    // Beide Läufe am selben Kalendertag müssen denselben Cutoff liefern,
    // egal wie spät der Cronjob tatsächlich feuert — genau der Bug, den
    // die alte new Date().setDate(...)-Implementierung hatte.
    expect(cutoffFromEarly.toISOString()).toBe(cutoffFromLate.toISOString());
    expect(cutoffFromEarly.toISOString()).toBe("2026-06-13T00:00:00.000Z");
  });

  it("uses BACKUP_RETENTION_DAYS (30) as the default window", () => {
    const now = new Date("2026-07-13T03:00:00Z");
    expect(computeBackupCutoff(now).toISOString()).toBe(
      computeBackupCutoff(now, BACKUP_RETENTION_DAYS).toISOString(),
    );
  });

  it("correctly crosses a month/year boundary", () => {
    const now = new Date("2026-01-15T03:00:00Z");
    expect(computeBackupCutoff(now, 30).toISOString()).toBe(
      "2025-12-16T00:00:00.000Z",
    );
  });
});

describe("isStaleBackupKey", () => {
  const cutoff = new Date("2026-06-13T00:00:00.000Z");

  it("returns true for a backup dated before the cutoff", () => {
    expect(isStaleBackupKey("db-backups/2026-06-01.json", cutoff)).toBe(true);
  });

  it("returns false for a backup dated exactly on the cutoff", () => {
    expect(isStaleBackupKey("db-backups/2026-06-13.json", cutoff)).toBe(false);
  });

  it("returns false for a backup dated after the cutoff", () => {
    expect(isStaleBackupKey("db-backups/2026-07-01.json", cutoff)).toBe(false);
  });

  it("returns false for a key that doesn't match the expected backup filename pattern", () => {
    expect(isStaleBackupKey("db-backups/README.md", cutoff)).toBe(false);
    expect(isStaleBackupKey("some-other-prefix/2026-01-01.json", cutoff)).toBe(
      false,
    );
  });
});
