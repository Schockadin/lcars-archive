import "server-only";
import crypto from "node:crypto";
import { and, desc, eq, isNull, or, sql as drizzleSql } from "drizzle-orm";
import orm from "@/lib/orm";
import sql from "@/lib/db";
import { characterDocuments, characters } from "@/lib/ormSchema";
import {
  inspectCharacterDocument,
  normalizeCharacterDocumentFileName,
} from "@/lib/characterDocumentValidation";
import { deleteObjectFromR2, uploadObjectBytesToR2 } from "@/lib/r2Backup";
import type { CharacterDocumentKind } from "@/lib/characterDocumentTypes";

export interface UserCharacterFile {
  id: number;
  characterName: string | null;
  characterId: number | null;
  fileName: string;
  kind: CharacterDocumentKind;
  sizeBytes: number;
  createdAt: string;
  previewUrl: string;
  downloadUrl: string;
}

export interface OwnCharacterOption {
  id: number;
  name: string;
}

export async function listOwnCharacterOptions(
  userId: number,
): Promise<OwnCharacterOption[]> {
  return orm
    .select({ id: characters.id, name: characters.name })
    .from(characters)
    .where(and(eq(characters.playerId, userId), isNull(characters.deletedAt)))
    .orderBy(characters.name);
}

export async function listUserCharacterFiles(
  userId: number,
): Promise<UserCharacterFile[]> {
  const rows = await orm
    .select({
      id: characterDocuments.id,
      characterId: characterDocuments.characterId,
      characterName: characters.name,
      fileName: characterDocuments.fileName,
      kind: characterDocuments.fileKind,
      sizeBytes: characterDocuments.sizeBytes,
      createdAt: drizzleSql<string>`${characterDocuments.createdAt}::text`,
    })
    .from(characterDocuments)
    .leftJoin(characters, eq(characters.id, characterDocuments.characterId))
    .where(
      or(
        and(
          isNull(characterDocuments.characterId),
          eq(characterDocuments.ownerUserId, userId),
        ),
        and(eq(characters.playerId, userId), isNull(characters.deletedAt)),
      ),
    )
    .orderBy(desc(characterDocuments.createdAt), desc(characterDocuments.id));
  return rows.map((row) => ({
    id: row.id,
    characterName: row.characterName,
    characterId: row.characterId,
    fileName: row.fileName,
    kind: row.kind as CharacterDocumentKind,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
    previewUrl: `/api/character-documents/${row.id}`,
    downloadUrl: `/api/character-documents/${row.id}?download=1`,
  }));
}

async function ownsCharacter(
  userId: number,
  characterId: number,
): Promise<boolean> {
  const [row] = await orm
    .select({ id: characters.id })
    .from(characters)
    .where(
      and(
        eq(characters.id, characterId),
        eq(characters.playerId, userId),
        isNull(characters.deletedAt),
      ),
    );
  return !!row;
}

export async function uploadUserDocument(input: {
  userId: number;
  characterId: number | null;
  fileName: string;
  buffer: Buffer;
}): Promise<void> {
  if (
    input.characterId !== null &&
    !(await ownsCharacter(input.userId, input.characterId))
  ) {
    throw new Error("Charakter nicht gefunden.");
  }
  const inspected = await inspectCharacterDocument(
    input.fileName,
    input.buffer,
  );
  const key = `character-documents/${input.characterId ?? `user-${input.userId}`}/${crypto.randomUUID()}.${inspected.kind}`;
  await uploadObjectBytesToR2(key, input.buffer, inspected.contentMime);
  try {
    await sql`
      INSERT INTO character_documents
        (character_id, owner_user_id, r2_key, file_name, file_kind,
         content_mime, size_bytes, extracted_text, uploaded_by)
      VALUES
        (${input.characterId}, ${input.userId}, ${key},
         ${normalizeCharacterDocumentFileName(input.fileName, inspected.kind)},
         ${inspected.kind}, ${inspected.contentMime}, ${input.buffer.byteLength},
         ${inspected.extractedText}, ${input.userId})
    `;
  } catch (error) {
    await deleteObjectFromR2(key).catch(() => undefined);
    throw error;
  }
}

interface ManageableDocument {
  r2Key: string;
  kind: CharacterDocumentKind;
  characterId: number | null;
}

async function getManageableDocument(
  userId: number,
  documentId: number,
): Promise<ManageableDocument | null> {
  const [row] = await sql<
    {
      r2_key: string;
      file_kind: CharacterDocumentKind;
      character_id: number | null;
    }[]
  >`
    SELECT d.r2_key, d.file_kind, d.character_id
    FROM character_documents d
    LEFT JOIN characters c ON c.id = d.character_id
    WHERE d.id = ${documentId}
      AND (
        (d.character_id IS NULL AND d.owner_user_id = ${userId})
        OR (c.player_id = ${userId} AND c.deleted_at IS NULL)
      )
  `;
  return row
    ? { r2Key: row.r2_key, kind: row.file_kind, characterId: row.character_id }
    : null;
}

export async function editUserDocument(
  userId: number,
  documentId: number,
  fileName: string,
  characterId: number | null,
): Promise<string | null> {
  const document = await getManageableDocument(userId, documentId);
  if (!document) return null;
  if (characterId !== null && !(await ownsCharacter(userId, characterId))) {
    throw new Error("Charakter nicht gefunden.");
  }
  const normalized = normalizeCharacterDocumentFileName(
    fileName,
    document.kind,
  );
  const [row] = await sql<{ file_name: string }[]>`
    UPDATE character_documents
    SET file_name = ${normalized}, character_id = ${characterId},
        owner_user_id = ${userId}
    WHERE id = ${documentId}
    RETURNING file_name
  `;
  return row?.file_name ?? null;
}

export async function deleteUserDocument(
  userId: number,
  documentId: number,
): Promise<boolean> {
  const document = await getManageableDocument(userId, documentId);
  if (!document) return false;
  await deleteObjectFromR2(document.r2Key);
  await sql`DELETE FROM character_documents WHERE id = ${documentId}`;
  await sql`
    DELETE FROM editor_drafts
    WHERE content_type = 'character_document' AND content_id = ${documentId}
  `;
  return true;
}

export async function deleteUnassignedUserDocumentObjects(
  userId: number,
): Promise<void> {
  const rows = await sql<{ id: number; r2_key: string }[]>`
    SELECT id, r2_key FROM character_documents
    WHERE owner_user_id = ${userId} AND character_id IS NULL
  `;
  for (const row of rows) {
    await deleteObjectFromR2(row.r2_key);
    await sql`DELETE FROM character_documents WHERE id = ${row.id}`;
  }
}
