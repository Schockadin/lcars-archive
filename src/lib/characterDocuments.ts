import "server-only";
import crypto from "node:crypto";
import sql from "@/lib/db";
import { sanitizeFileName } from "@/lib/assetStorage";
import {
  deleteObjectFromR2,
  getObjectBytesFromR2,
  uploadObjectBytesToR2,
} from "@/lib/r2Backup";
import {
  type CharacterDocument,
  type CharacterDocumentKind,
} from "@/lib/characterDocumentTypes";
import { inspectCharacterDocument } from "@/lib/characterDocumentValidation";
export type { CharacterDocument } from "@/lib/characterDocumentTypes";
export { InvalidCharacterDocumentError } from "@/lib/characterDocumentValidation";

const PREFIX = "character-documents/";

interface CharacterDocumentRow {
  id: number;
  character_id: number;
  r2_key: string;
  file_name: string;
  file_kind: CharacterDocumentKind;
  content_mime: string;
  size_bytes: number;
  extracted_text: string | null;
  uploaded_by: number | null;
  created_at: string;
}

function mapRow(row: CharacterDocumentRow): CharacterDocument {
  const previewUrl = `/api/character-documents/${row.id}`;
  return {
    id: row.id,
    characterId: row.character_id,
    fileName: row.file_name,
    kind: row.file_kind,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    previewUrl,
    downloadUrl: `${previewUrl}?download=1`,
  };
}

export async function listCharacterDocuments(
  characterId: number,
): Promise<CharacterDocument[]> {
  const rows = await sql<CharacterDocumentRow[]>`
    SELECT id, character_id, r2_key, file_name, file_kind, content_mime,
           size_bytes, extracted_text, uploaded_by, created_at::text AS created_at
    FROM character_documents
    WHERE character_id = ${characterId}
    ORDER BY created_at ASC, id ASC
  `;
  return rows.map(mapRow);
}

export async function uploadCharacterDocument(
  characterId: number,
  uploadedBy: number,
  fileName: string,
  buffer: Buffer,
): Promise<CharacterDocument> {
  const inspected = await inspectCharacterDocument(fileName, buffer);
  const key = `${PREFIX}${characterId}/${crypto.randomUUID()}.${inspected.kind}`;
  await uploadObjectBytesToR2(key, buffer, inspected.contentMime);

  try {
    const [row] = await sql<CharacterDocumentRow[]>`
      INSERT INTO character_documents
        (character_id, r2_key, file_name, file_kind, content_mime,
         size_bytes, extracted_text, uploaded_by)
      VALUES
        (${characterId}, ${key}, ${sanitizeFileName(fileName, `dokument.${inspected.kind}`)},
         ${inspected.kind}, ${inspected.contentMime}, ${buffer.byteLength},
         ${inspected.extractedText}, ${uploadedBy})
      RETURNING id, character_id, r2_key, file_name, file_kind, content_mime,
                size_bytes, extracted_text, uploaded_by, created_at::text AS created_at
    `;
    return mapRow(row);
  } catch (error) {
    await deleteObjectFromR2(key).catch(() => undefined);
    throw error;
  }
}

export async function deleteCharacterDocument(
  characterId: number,
  documentId: number,
): Promise<boolean> {
  const [row] = await sql<{ r2_key: string }[]>`
    SELECT r2_key
    FROM character_documents
    WHERE id = ${documentId} AND character_id = ${characterId}
  `;
  if (!row) return false;

  // Erst das private Objekt entfernen, dann seinen einzigen auffindbaren
  // Schlüssel. Andersherum würde ein vorübergehender R2-Fehler eine verwaiste
  // Datei hinterlassen, die ohne DB-Zeile später nicht mehr löschbar ist.
  await deleteObjectFromR2(row.r2_key);
  const deleted = await sql<{ id: number }[]>`
    DELETE FROM character_documents
    WHERE id = ${documentId} AND character_id = ${characterId}
    RETURNING id
  `;
  return deleted.length > 0;
}

export interface CharacterDocumentAccess {
  id: number;
  r2Key: string;
  fileName: string;
  kind: CharacterDocumentKind;
  contentMime: string;
  extractedText: string | null;
  ownerId: number | null;
  isDraft: boolean;
  isActive: boolean;
}

export async function getCharacterDocumentAccess(
  id: number,
): Promise<CharacterDocumentAccess | null> {
  const [row] = await sql<
    {
      id: number;
      r2_key: string;
      file_name: string;
      file_kind: CharacterDocumentKind;
      content_mime: string;
      extracted_text: string | null;
      player_id: number | null;
      is_draft: boolean;
      deleted_at: Date | null;
    }[]
  >`
    SELECT d.id, d.r2_key, d.file_name, d.file_kind, d.content_mime,
           d.extracted_text, c.player_id, c.is_draft, c.deleted_at
    FROM character_documents d
    JOIN characters c ON c.id = d.character_id
    WHERE d.id = ${id}
  `;
  return row
    ? {
        id: row.id,
        r2Key: row.r2_key,
        fileName: row.file_name,
        kind: row.file_kind,
        contentMime: row.content_mime,
        extractedText: row.extracted_text,
        ownerId: row.player_id,
        isDraft: row.is_draft,
        isActive: row.deleted_at == null,
      }
    : null;
}

export async function getCharacterDocumentBytes(r2Key: string) {
  return getObjectBytesFromR2(r2Key);
}

export interface CharacterDocumentForExport {
  id: number;
  fileName: string;
  kind: CharacterDocumentKind;
  r2Key: string;
  extractedText: string | null;
}

export async function getCharacterDocumentsForExport(
  characterId: number,
  ids: number[],
): Promise<CharacterDocumentForExport[]> {
  if (ids.length === 0) return [];
  const rows = await sql<
    {
      id: number;
      file_name: string;
      file_kind: CharacterDocumentKind;
      r2_key: string;
      extracted_text: string | null;
    }[]
  >`
    SELECT id, file_name, file_kind, r2_key, extracted_text
    FROM character_documents
    WHERE character_id = ${characterId} AND id = ANY(${ids}::int[])
    ORDER BY created_at ASC, id ASC
  `;
  return rows.map((row) => ({
    id: row.id,
    fileName: row.file_name,
    kind: row.file_kind,
    r2Key: row.r2_key,
    extractedText: row.extracted_text,
  }));
}

export async function purgeCharacterDocumentsFor(
  characterId: number,
): Promise<void> {
  const rows = await sql<{ id: number; r2_key: string }[]>`
    SELECT id, r2_key
    FROM character_documents
    WHERE character_id = ${characterId}
  `;
  for (const row of rows) {
    await deleteObjectFromR2(row.r2_key);
    await sql`
      DELETE FROM character_documents
      WHERE id = ${row.id} AND character_id = ${characterId}
    `;
  }
}
