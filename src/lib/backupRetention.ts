// Reine Datums-/Key-Logik für scripts/cleanup-db-backups.ts, ausgelagert
// nach src/lib/, damit sie mit dem übrigen Unit-Test-Setup (src/**/*.test.ts,
// siehe vitest.config.ts) testbar ist — scripts/ selbst ist von keiner
// Vitest-Config erfasst und hat keine "server-only"-Abhängigkeiten, die eine
// Trennung nötig machen würden; die Auslagerung ist rein für die
// Testbarkeit.
export const BACKUP_RETENTION_DAYS = 30;
export const BACKUP_PREFIX = "db-backups/";
export const BACKUP_KEY_PATTERN = /^db-backups\/(\d{4}-\d{2}-\d{2})\.json$/;

// Manuelle Backups (Adminpanel-Button "Im R2-Bucket speichern", siehe
// exportDbBackupToR2Action in src/app/admin/dbBackupActions.ts) bekommen
// einen Zeitstempel- statt Datums-Key (bis auf die Sekunde, nicht nur der
// Tag) mit "manual-"-Präfix — zwei Gründe: (1) mehrere manuelle Sicherungen
// am selben Tag (z.B. unmittelbar vor UND nach einer riskanten Aktion)
// sollen sich nicht gegenseitig überschreiben, wie es der tägliche
// Cronjob-Key (ein Key pro Kalendertag, siehe scripts/backup-db.ts) bewusst
// tut; (2) BACKUP_KEY_PATTERN oben erkennt nur das reine Datumsformat ohne
// Präfix — manuelle Backups fallen dadurch bewusst NICHT unter die
// automatische 30-Tage-Löschung von cleanup-db-backups.ts und bleiben bis
// zur manuellen Löschung im Bucket erhalten.
export function buildManualDbBackupKey(now: Date = new Date()): string {
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  return `${BACKUP_PREFIX}manual-${timestamp}.json`;
}

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
