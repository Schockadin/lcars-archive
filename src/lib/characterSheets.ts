// Charakterbögen (PDFs) für Charaktere. Wie content_images liegen die Bytes im
// öffentlichen Asset-Bucket (Präfix character-sheets/<CharakterID>/<UUID>.pdf),
// die DB-Tabelle character_sheets hält nur Metadaten (Original-Dateiname für
// die Anzeige, Größe, Uploader). Anders als Content-Bilder werden Bögen NICHT
// über den Proxy, sondern über ihre direkte öffentliche URL ausgeliefert
// (assetPublicUrl) — sie erscheinen aber nur auf der Charakterseite selbst, die
// bereits nach der Charakter-Sichtbarkeit gated ist ("Sichtbarkeit = Charakter",
// Nutzerentscheidung). Ein Charakter kann beliebig viele Bögen haben.
import "server-only";
import crypto from "node:crypto";
import sql from "@/lib/db";
import {
  uploadAssetObjectToR2,
  deleteAssetObjectFromR2,
  assetPublicUrl,
} from "@/lib/r2Backup";
import {
  assertCharacterSheetAsset,
  sanitizeFileName,
  CHARACTER_SHEET_MIME,
} from "@/lib/assetStorage";

const CHARACTER_SHEET_PREFIX = "character-sheets/";

export interface CharacterSheet {
  id: number;
  characterId: number;
  fileName: string;
  sizeBytes: number;
  // Fertige öffentliche URL (der r2_key wird nie an den Client gegeben).
  url: string;
  uploadedBy: number | null;
  createdAt: string;
}

interface CharacterSheetRow {
  id: number;
  character_id: number;
  r2_key: string;
  file_name: string;
  size_bytes: number;
  uploaded_by: number | null;
  created_at: string;
}

function mapRow(row: CharacterSheetRow): CharacterSheet {
  return {
    id: row.id,
    characterId: row.character_id,
    fileName: row.file_name,
    sizeBytes: row.size_bytes,
    url: assetPublicUrl(row.r2_key),
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export async function listCharacterSheets(
  characterId: number,
): Promise<CharacterSheet[]> {
  const rows = await sql<CharacterSheetRow[]>`
    SELECT id, character_id, r2_key, file_name, size_bytes, uploaded_by, created_at
    FROM character_sheets
    WHERE character_id = ${characterId}
    ORDER BY created_at ASC
  `;
  return rows.map(mapRow);
}

// Lädt einen Charakterbogen (PDF) in den Asset-Bucket und legt die Metazeile
// an. Wirft InvalidAssetError (assertCharacterSheetAsset) bei Nicht-PDF,
// leerer oder zu großer Datei. Der Key wird aus einer UUID gebaut (nie aus dem
// Client-Dateinamen — der wird nur als Anzeige-Label gespeichert).
export async function uploadCharacterSheet(
  characterId: number,
  file: { buffer: Buffer; mimeType: string; fileName: string },
  uploadedByUserId: number,
): Promise<CharacterSheet> {
  assertCharacterSheetAsset(file.mimeType, file.buffer.byteLength);

  const key = `${CHARACTER_SHEET_PREFIX}${characterId}/${crypto.randomUUID()}.pdf`;
  await uploadAssetObjectToR2(key, file.buffer, CHARACTER_SHEET_MIME);

  const fileName = sanitizeFileName(file.fileName);
  const [row] = await sql<CharacterSheetRow[]>`
    INSERT INTO character_sheets
      (character_id, r2_key, file_name, size_bytes, uploaded_by)
    VALUES (${characterId}, ${key}, ${fileName}, ${file.buffer.byteLength}, ${uploadedByUserId})
    RETURNING id, character_id, r2_key, file_name, size_bytes, uploaded_by, created_at
  `;
  return mapRow(row);
}

// Löscht Metazeile + Asset-Objekt. characterId ist Teil der WHERE-Bedingung
// (nicht nur id) — gleiche Content-Scoping-Überlegung wie deleteContentImage:
// der Aufrufer hat die Berechtigung nur für GENAU diesen Charakter geprüft.
export async function deleteCharacterSheet(
  characterId: number,
  id: number,
): Promise<boolean> {
  const [row] = await sql<{ r2_key: string }[]>`
    DELETE FROM character_sheets
    WHERE id = ${id} AND character_id = ${characterId}
    RETURNING r2_key
  `;
  if (!row) return false;
  await deleteAssetObjectFromR2(row.r2_key);
  return true;
}

// Entfernt alle Bögen eines Charakters inkl. Asset-Objekten — von
// purgeContent.ts VOR dem endgültigen Löschen des Charakters aufgerufen (die
// character_sheets-Zeilen selbst hätte auch ON DELETE CASCADE geräumt, aber
// die R2-Objekte müssen vorher explizit weg, sonst blieben sie verwaist).
export async function purgeCharacterSheetsFor(characterId: number): Promise<void> {
  const rows = await sql<{ r2_key: string }[]>`
    DELETE FROM character_sheets WHERE character_id = ${characterId} RETURNING r2_key
  `;
  for (const row of rows) {
    await deleteAssetObjectFromR2(row.r2_key);
  }
}
