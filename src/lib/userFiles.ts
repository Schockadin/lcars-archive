import "server-only";
import sql from "@/lib/db";

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
  const rows = await sql<
    {
      id: number;
      character_id: number;
      character_name: string;
      file_name: string;
      file_kind: string;
      size_bytes: number;
      created_at: string;
    }[]
  >`
    SELECT d.id, d.character_id, c.name AS character_name, d.file_name,
           d.file_kind, d.size_bytes, d.created_at::text AS created_at
    FROM character_documents d
    JOIN characters c ON c.id = d.character_id
    WHERE c.player_id = ${userId} AND c.deleted_at IS NULL
    ORDER BY c.name, d.created_at DESC, d.id DESC
  `;
  return rows.map((row) => ({
    id: row.id,
    characterName: row.character_name,
    characterId: row.character_id,
    fileName: row.file_name,
    kind: row.file_kind,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    previewUrl: `/api/character-documents/${row.id}`,
    downloadUrl: `/api/character-documents/${row.id}?download=1`,
  }));
}
