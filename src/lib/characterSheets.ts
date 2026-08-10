// Charakterbögen (PDFs) für Charaktere. Wie content_images liegen die Bytes im
// Asset-Bucket (Präfix character-sheets/<CharakterID>/<UUID>.pdf), die DB-Tabelle
// character_sheets hält nur Metadaten (Original-Dateiname für die Anzeige,
// Größe, Uploader). Genau wie Content-Bilder werden die Bögen über eine eigene
// Proxy-Route (/api/character-sheets/<id>) ausgeliefert — der Bucket bleibt
// privat, der r2_key verlässt nie den Server, und die Route prüft die
// Charakter-Sichtbarkeit (canView/canViewDraft) serverseitig, bevor sie die
// Bytes streamt. Ein Charakter kann beliebig viele Bögen haben.
import "server-only";
import crypto from "node:crypto";
import sql from "@/lib/db";
import {
  uploadAssetObjectToR2,
  deleteAssetObjectFromR2,
  getAssetObjectBytesFromR2,
} from "@/lib/r2Backup";
import {
  assertCharacterSheetAsset,
  sanitizeFileName,
  CHARACTER_SHEET_MIME,
} from "@/lib/assetStorage";
import type { Visibility } from "@/lib/visibility";

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
    // Auslieferung über die eigene Proxy-Route (/api/character-sheets/<id>)
    // statt einer direkten öffentlichen Bucket-URL: so bleibt der Bucket
    // privat (der r2_key wird nie an den Client gegeben), die Sichtbarkeit
    // wird serverseitig geprüft, und es hängt nicht an einer korrekt
    // konfigurierten öffentlichen Asset-Domain (R2_ASSET_PUBLIC_BASE_URL) —
    // gleiches Muster wie /api/content-images/<id>.
    url: `/api/character-sheets/${row.id}`,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export interface CharacterSheetAccess {
  r2Key: string;
  fileName: string;
  visibility: Visibility;
  ownerId: number | null;
  isDraft: boolean;
  isActive: boolean;
}

// Für die Auslieferungs-Route (/api/character-sheets/[id]): den r2_key des
// Bogens plus die Sichtbarkeits-/Owner-/Draft-Felder des zugehörigen
// Charakters, damit die Route dieselbe canView/canViewDraft-Prüfung wie die
// Charakterseite fahren kann (der r2_key selbst verlässt den Server nie).
export async function getCharacterSheetAccess(
  id: number,
): Promise<CharacterSheetAccess | null> {
  const [row] = await sql<
    {
      r2_key: string;
      file_name: string;
      visibility: Visibility;
      player_id: number | null;
      is_draft: boolean;
      deleted_at: Date | null;
    }[]
  >`
    SELECT cs.r2_key, cs.file_name, c.visibility, c.player_id, c.is_draft,
           c.deleted_at
    FROM character_sheets cs
    JOIN characters c ON c.id = cs.character_id
    WHERE cs.id = ${id}
  `;
  if (!row) return null;
  return {
    r2Key: row.r2_key,
    fileName: row.file_name,
    visibility: row.visibility,
    ownerId: row.player_id,
    isDraft: row.is_draft,
    isActive: row.deleted_at == null,
  };
}

// Bytes eines Bogens (PDF) aus dem Asset-Bucket. Getrennt von getCharacterSheet
// Access, damit die Route erst die Berechtigung prüfen und dann die Bytes
// laden kann.
export async function getCharacterSheetBytes(r2Key: string) {
  return getAssetObjectBytesFromR2(r2Key);
}

// Sichtbarkeits-/Owner-/Draft-Felder des Charakters für die Bogen-LISTE
// (getCharacterSheetsAction) — inkl. is_draft, damit die Liste dieselbe
// canView + canViewDraft-Prüfung wie die Charakterseite fahren kann (die
// Bytes-Route prüft canViewDraft ebenfalls; sonst leckten Dateinamen/Größen
// eines Entwurf-Charakters). deleted_at IS NULL entspricht dem isActive-Gate.
export async function getCharacterSheetListAccess(
  characterId: number,
): Promise<{
  visibility: Visibility;
  ownerId: number | null;
  isDraft: boolean;
} | null> {
  const [row] = await sql<
    { visibility: Visibility; player_id: number | null; is_draft: boolean }[]
  >`
    SELECT visibility, player_id, is_draft FROM characters
    WHERE id = ${characterId} AND deleted_at IS NULL
  `;
  if (!row) return null;
  return {
    visibility: row.visibility,
    ownerId: row.player_id,
    isDraft: row.is_draft,
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
