// scripts/purge-character-sheet-uploads.ts
//
// Einmal-Skript zum Abbau der hochgeladenen PDF-Charakterbögen (v1.27.23): das
// Hochladen gibt es nicht mehr, an seine Stelle tritt die Ansicht des
// gepflegten Bogens (/characters/[slug]/sheet). Die Metazeilen räumt die
// Migration (scripts/migrate-pr62.sql, DROP TABLE character_sheets) — die
// Objekte im Asset-Bucket muss jemand explizit löschen, sonst blieben sie
// verwaist liegen. Dieses Skript tut genau das und leert danach die Tabelle.
//
// REIHENFOLGE: erst dieses Skript, DANN die Migration. Andersherum sind die
// r2_keys weg und die Objekte nicht mehr auffindbar.
//
// Aufruf: npx tsx --conditions=react-server scripts/purge-character-sheet-uploads.ts
import sql from "@/lib/db";
import { deleteAssetObjectFromR2 } from "@/lib/r2Backup";

async function main() {
  const rows = await sql<{ id: number; r2_key: string; file_name: string }[]>`
    SELECT id, r2_key, file_name FROM character_sheets ORDER BY id
  `;

  if (rows.length === 0) {
    console.log("✓ Keine hochgeladenen Charakterbögen vorhanden.");
    return;
  }

  console.log(`🗑️  ${rows.length} hochgeladene(r) Charakterbogen/-bögen…`);
  for (const row of rows) {
    await deleteAssetObjectFromR2(row.r2_key);
    console.log(`   – ${row.file_name} (${row.r2_key})`);
  }

  await sql`DELETE FROM character_sheets`;
  console.log("✓ Asset-Objekte gelöscht, Tabelle geleert.");
}

main()
  .catch((error) => {
    console.error("✗ Abbau fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
