// Reine Datums-/Key-Logik für scripts/cleanup-db-backups.ts, ausgelagert
// nach src/lib/, damit sie mit dem übrigen Unit-Test-Setup (src/**/*.test.ts,
// siehe vitest.config.ts) testbar ist — scripts/ selbst ist von keiner
// Vitest-Config erfasst und hat keine "server-only"-Abhängigkeiten, die eine
// Trennung nötig machen würden; die Auslagerung ist rein für die
// Testbarkeit.
export const BACKUP_RETENTION_DAYS = 30;
export const BACKUP_KEY_PATTERN = /^db-backups\/(\d{4}-\d{2}-\d{2})\.json$/;

// UTC-Mitternacht statt der aktuellen Uhrzeit — Backup-Daten werden aus dem
// Key ("YYYY-MM-DD") ebenfalls als UTC-Mitternacht geparst (siehe
// isStaleBackupKey unten), sonst würde die Uhrzeit des Cronjob-Laufs die
// effektive Aufbewahrungsdauer um bis zu einen Tag verschieben.
export function computeBackupCutoff(
  now: Date,
  retentionDays: number = BACKUP_RETENTION_DAYS,
): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - retentionDays),
  );
}

// true, wenn key ein gültiger Backup-Key ist UND sein Datum vor cutoff liegt.
// Ein Key, der nicht ins Muster passt, gilt nie als veraltet (defensiv —
// lieber ein unerwartetes Objekt im Bucket übersehen als versehentlich etwas
// löschen, das gar kein Tages-Backup ist).
export function isStaleBackupKey(key: string, cutoff: Date): boolean {
  const match = key.match(BACKUP_KEY_PATTERN);
  return match !== null && new Date(match[1]) < cutoff;
}
