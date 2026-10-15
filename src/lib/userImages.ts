import "server-only";
import crypto from "node:crypto";
import { and, desc, eq, isNotNull, isNull, like, sql } from "drizzle-orm";
import orm from "@/lib/orm";
import { characters, contentImages, userImages } from "@/lib/ormSchema";
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
  r2Key: string;
  fileName: string;
  contentMime: string;
  sizeBytes: number;
  createdAt: string;
}

const userImageSelection = {
  id: userImages.id,
  r2Key: userImages.r2Key,
  fileName: userImages.fileName,
  contentMime: userImages.contentMime,
  sizeBytes: userImages.sizeBytes,
  createdAt: sql<string>`${userImages.createdAt}::text`,
};

function mapUserImage(row: UserImageRow): UserImage {
  return {
    id: row.id,
    fileName: row.fileName,
    contentMime: row.contentMime,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
    url: assetPublicUrl(row.r2Key),
  };
}

export async function listUserImages(ownerId: number): Promise<UserImage[]> {
  const rows = await orm
    .select(userImageSelection)
    .from(userImages)
    .where(eq(userImages.ownerId, ownerId))
    .orderBy(desc(userImages.createdAt), desc(userImages.id));
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
    const [existing] = await orm
      .select(userImageSelection)
      .from(userImages)
      .where(
        and(
          eq(userImages.ownerId, input.ownerId),
          eq(userImages.sourceImageKey, input.sourceImageKey),
        ),
      );
    if (existing) return mapUserImage(existing);
  }

  const key = `user-images/${input.ownerId}/${crypto.randomUUID()}.${extension}`;
  await uploadAssetObjectToR2(key, input.buffer, input.mimeType);
  try {
    const [row] = await orm
      .insert(userImages)
      .values({
        ownerId: input.ownerId,
        r2Key: key,
        fileName: sanitizeFileName(input.fileName, `bild.${extension}`),
        contentMime: input.mimeType,
        sizeBytes: input.buffer.byteLength,
        sourceImageKey: input.sourceImageKey ?? null,
      })
      .returning(userImageSelection);
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
  const [row] = await orm
    .select({ r2Key: userImages.r2Key })
    .from(userImages)
    .where(and(eq(userImages.ownerId, ownerId), eq(userImages.id, id)));
  if (!row) return false;
  await deleteAssetObjectFromR2(row.r2Key);
  const deleted = await orm
    .delete(userImages)
    .where(and(eq(userImages.ownerId, ownerId), eq(userImages.id, id)))
    .returning({ id: userImages.id });
  return deleted.length > 0;
}

// Vor dem Löschen eines Accounts aufrufen: Der FK entfernt nur die Metadaten,
// nicht die öffentlich erreichbaren Objekte im Asset-Bucket.
export async function deleteAllUserImageObjects(
  ownerId: number,
): Promise<void> {
  const rows = await orm
    .select({ r2Key: userImages.r2Key })
    .from(userImages)
    .where(eq(userImages.ownerId, ownerId));
  await Promise.all(rows.map((row) => deleteAssetObjectFromR2(row.r2Key)));
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
    orm
      .select({
        id: contentImages.id,
        contentType: contentImages.contentType,
        contentId: contentImages.contentId,
        contentMime: contentImages.contentMime,
        sizeBytes: contentImages.sizeBytes,
        createdAt: sql<string>`${contentImages.createdAt}::text`,
      })
      .from(contentImages)
      .leftJoin(
        userImages,
        and(
          eq(userImages.ownerId, ownerId),
          eq(userImages.sourceImageKey, contentImages.r2Key),
        ),
      )
      .where(and(eq(contentImages.uploadedBy, ownerId), isNull(userImages.id)))
      .orderBy(desc(contentImages.createdAt), desc(contentImages.id)),
    orm
      .select({
        id: characters.id,
        name: characters.name,
        portrait: characters.portrait,
        updatedAt: sql<string>`${characters.updatedAt}::text`,
      })
      .from(characters)
      .where(
        and(
          eq(characters.playerId, ownerId),
          isNull(characters.deletedAt),
          like(characters.portrait, "%/character-portraits/%"),
        ),
      ),
    orm
      .select({ sourceImageKey: userImages.sourceImageKey })
      .from(userImages)
      .where(
        and(
          eq(userImages.ownerId, ownerId),
          isNotNull(userImages.sourceImageKey),
        ),
      ),
  ]);
  const importedKeys = new Set(imported.map((row) => row.sourceImageKey));
  const legacyContentImages: LegacyUserImage[] = rows.map((row) => ({
    id: row.id,
    sourceType: "content",
    previewUrl: contentImageSrc(row.id),
    contentType: row.contentType,
    contentId: row.contentId,
    contentMime: row.contentMime,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
  }));
  const oldPortraits: LegacyUserImage[] = portraits.flatMap((row) => {
    const key = row.portrait ? characterPortraitAssetKey(row.portrait) : null;
    if (!key || importedKeys.has(key)) return [];
    const extension = key.split(".").pop()?.toLowerCase();
    const mime = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
    return [
      {
        id: row.id,
        sourceType: "portrait" as const,
        previewUrl: row.portrait!,
        contentMime: mime,
        sizeBytes: 0,
        createdAt: row.updatedAt,
      },
    ];
  });
  return [...legacyContentImages, ...oldPortraits];
}
