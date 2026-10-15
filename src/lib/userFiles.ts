import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import orm from "@/lib/orm";
import { characterDocuments, characters } from "@/lib/ormSchema";

export interface UserCharacterFile {
  id: number;
  characterName: string;
  characterId: number;
  fileName: string;
  kind: string;
  sizeBytes: number;
  createdAt: string;
  previewUrl: string;
  downloadUrl: string;
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
      createdAt: sql<string>`${characterDocuments.createdAt}::text`,
    })
    .from(characterDocuments)
    .innerJoin(characters, eq(characters.id, characterDocuments.characterId))
    .where(and(eq(characters.playerId, userId), isNull(characters.deletedAt)))
    .orderBy(
      characters.name,
      desc(characterDocuments.createdAt),
      desc(characterDocuments.id),
    );
  return rows.map((row) => ({
    id: row.id,
    characterName: row.characterName,
    characterId: row.characterId,
    fileName: row.fileName,
    kind: row.kind,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
    previewUrl: `/api/character-documents/${row.id}`,
    downloadUrl: `/api/character-documents/${row.id}?download=1`,
  }));
}
