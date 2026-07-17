// scripts/r2Client.ts
//
// Reine Re-Exports — die eigentliche Logik lebt in src/lib/r2Backup.ts (auch
// im App-Code nutzbar, siehe src/app/admin/dbBackupActions.ts). Relative
// Pfade (kein @/-Alias) — die Backup-Cronjob-Skripte laufen per tsx
// außerhalb von Next.js, das den @/-Alias nicht auflöst.
export {
  requireEnv,
  createR2Client,
  uploadDbBackupToR2,
} from "../src/lib/r2Backup";
