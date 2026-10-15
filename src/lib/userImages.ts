import "server-only";
import crypto from "node:crypto";
import sql from "@/lib/db";
import {
  assertImageAsset,
  characterPortraitAssetKey,
  sanitizeFileName,
} from "@/lib/assetStorage";
import { contentImageSrc } from "@/lib/contentRoutes";
import {
  assetPublicUrl,
  deleteAssetObjectFromR2,
  uploadAssetObjectToR2,
} from "@/lib/r2Backup";

export interface UserImage {
  id: number;
  fileName: string;
  contentMime: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
}

interface UserImageRow {
  id: number;
  r2_key: string;
  file_name: string;
  content_mime: string;
  size_bytes: number;
  created_at: string;
}

function mapUserImage(row: UserImageRow): UserImage {
  return {
    id: row.id,
    fileName: row.file_name,
    contentMime: row.content_mime,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    url: assetPublicUrl(row.r2_key),
  };
}

export async function listUserImages(ownerId: number): Promise<UserImage[]> {
  const rows = await sql<UserImageRow[]>`
    SELECT id, r2_key, file_name, content_mime, size_bytes,
           created_at::text AS created_at
    FROM user_images WHERE owner_id = ${ownerId}
    ORDER BY created_at DESC, id DESC
  `;
  return rows.map(mapUserImage);
}

export async function uploadUserImage(input: {
  ownerId: number;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  sourceImageKey?: string;
}): Promise<UserImage> {
  const extension = assertImageAsset(input.mimeType, input.buffer.byteLength);
  if (input.sourceImageKey) {
    const [existing] = await sql<UserImageRow[]>`
      SELECT id, r2_key, file_name, content_mime, size_bytes,
             created_at::text AS created_at
      FROM user_images
      WHERE owner_id = ${input.ownerId}
        AND source_image_key = ${input.sourceImageKey}
    `;
    if (existing) return mapUserImage(existing);
  }

  const key = `user-images/${input.ownerId}/${crypto.randomUUID()}.${extension}`;
  await uploadAssetObjectToR2(key, input.buffer, input.mimeType);
  try {
    const [row] = await sql<UserImageRow[]>`
      INSERT INTO user_images
        (owner_id, r2_key, file_name, content_mime, size_bytes, source_image_key)
      VALUES
        (${input.ownerId}, ${key}, ${sanitizeFileName(input.fileName, `bild.${extension}`)},
         ${input.mimeType}, ${input.buffer.byteLength}, ${input.sourceImageKey ?? null})
      RETURNING id, r2_key, file_name, content_mime, size_bytes,
                created_at::text AS created_at
    `;
    return mapUserImage(row);
  } catch (error) {
    await deleteAssetObjectFromR2(key).catch(() => undefined);
    throw error;
  }
}

export async function deleteUserImage(
  ownerId: number,
  id: number,
): Promise<boolean> {
  const [row] = await sql<{ r2_key: string }[]>`
    SELECT r2_key FROM user_images WHERE owner_id = ${ownerId} AND id = ${id}
  `;
  if (!row) return false;
  await deleteAssetObjectFromR2(row.r2_key);
  const deleted = await sql`
    DELETE FROM user_images WHERE owner_id = ${ownerId} AND id = ${id}
  `;
  return deleted.count > 0;
}

// Vor dem Löschen eines Accounts aufrufen: Der FK entfernt nur die Metadaten,
// nicht die öffentlich erreichbaren Objekte im Asset-Bucket.
export async function deleteAllUserImageObjects(
  ownerId: number,
): Promise<void> {
  const rows = await sql<{ r2_key: string }[]>`
    SELECT r2_key FROM user_images WHERE owner_id = ${ownerId}
  `;
  await Promise.all(rows.map((row) => deleteAssetObjectFromR2(row.r2_key)));
}

export interface LegacyUserImage {
  id: number;
  sourceType: "content" | "portrait";
  previewUrl: string;
  contentType?: string;
  contentId?: number;
  contentMime: string;
  sizeBytes: number;
  createdAt: string;
}

// Alte Inhaltsbilder ohne Bibliothekskopie für eine einmalige Übernahme.
export async function listLegacyUserImages(
  ownerId: number,
): Promise<LegacyUserImage[]> {
  const [rows, portraits, imported] = await Promise.all([
    sql<
      {
        id: number;
        content_type: string;
        content_id: number;
        content_mime: string;
        size_bytes: number;
        created_at: string;
      }[]
    >`
    SELECT ci.id, ci.content_type, ci.content_id, ci.content_mime,
           ci.size_bytes, ci.created_at::text AS created_at
    FROM content_images ci
    LEFT JOIN user_images ui ON ui.owner_id = ${ownerId}
      AND ui.source_image_key = ci.r2_key
    WHERE ci.uploaded_by = ${ownerId} AND ui.id IS NULL
    ORDER BY ci.created_at DESC, ci.id DESC
  `,
    sql<{ id: number; name: string; portrait: string; updated_at: string }[]>`
    SELECT id, name, portrait, updated_at::text AS updated_at
    FROM characters
    WHERE player_id = ${ownerId} AND deleted_at IS NULL
      AND portrait LIKE '%/character-portraits/%'
  `,
    sql<{ source_image_key: string }[]>`
    SELECT source_image_key FROM user_images
    WHERE owner_id = ${ownerId} AND source_image_key IS NOT NULL
  `,
  ]);
  const importedKeys = new Set(imported.map((row) => row.source_image_key));
  const contentImages: LegacyUserImage[] = rows.map((row) => ({
    id: row.id,
    sourceType: "content",
    previewUrl: contentImageSrc(row.id),
    contentType: row.content_type,
    contentId: row.content_id,
    contentMime: row.content_mime,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  }));
  const oldPortraits: LegacyUserImage[] = portraits.flatMap((row) => {
    const key = characterPortraitAssetKey(row.portrait);
    if (!key || importedKeys.has(key)) return [];
    const extension = key.split(".").pop()?.toLowerCase();
    const mime = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
    return [
      {
        id: row.id,
        sourceType: "portrait" as const,
        previewUrl: row.portrait,
        contentMime: mime,
        sizeBytes: 0,
        createdAt: row.updated_at,
      },
    ];
  });
  return [...contentImages, ...oldPortraits];
}
