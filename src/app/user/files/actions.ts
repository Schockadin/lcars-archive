"use server";
import { revalidatePath } from "next/cache";
import { requireOwnUser } from "@/app/user/dal";
import { getRoleMap } from "@/lib/roles";
import { resolveViewer, canView } from "@/lib/visibility";
import {
  assertImageAsset,
  characterPortraitAssetKey,
  InvalidAssetError,
} from "@/lib/assetStorage";
import { getAssetObjectBytesFromR2 } from "@/lib/r2Backup";
import sql from "@/lib/db";
import {
  getContentAccessContext,
  getContentImageById,
  getContentImageStorageKey,
  getContentImageBytes,
  isContentImageType,
} from "@/lib/contentImages";
import {
  deleteUserImage,
  listLegacyUserImages,
  listUserImages,
  uploadUserImage,
  type UserImage,
  type LegacyUserImage,
} from "@/lib/userImages";

export async function getOwnImagesAction(): Promise<{
  images: UserImage[];
  legacy: LegacyUserImage[];
}> {
  const user = await requireOwnUser();
  const [images, legacy, roleMap] = await Promise.all([
    listUserImages(user.id),
    listLegacyUserImages(user.id),
    getRoleMap(),
  ]);
  const viewer = resolveViewer(user, roleMap);
  const accessible = await Promise.all(
    legacy.map(async (image) => {
      if (image.sourceType === "portrait") return image;
      if (!image.contentType || !isContentImageType(image.contentType))
        return null;
      const access = await getContentAccessContext(
        image.contentType,
        image.contentId!,
      );
      return access && canView(access.isDraft, access.ownerId, viewer)
        ? image
        : null;
    }),
  );
  return {
    images,
    legacy: accessible.filter(
      (image): image is LegacyUserImage => image != null,
    ),
  };
}

export async function uploadOwnImageAction(formData: FormData): Promise<{
  image?: UserImage;
  error?: string;
}> {
  const user = await requireOwnUser();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Bitte ein Bild auswählen." };
  try {
    assertImageAsset(file.type, file.size);
    const image = await uploadUserImage({
      ownerId: user.id,
      fileName: file.name,
      mimeType: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    });
    revalidatePath("/user/files");
    return { image };
  } catch (error) {
    if (error instanceof InvalidAssetError) return { error: error.message };
    throw error;
  }
}

export async function importOwnContentImageAction(
  id: number,
  sourceType: "content" | "portrait" = "content",
): Promise<{
  image?: UserImage;
  error?: string;
}> {
  const user = await requireOwnUser();
  if (!Number.isInteger(id) || id <= 0) return { error: "Ungültiges Bild." };
  if (sourceType === "portrait") {
    const [portrait] = await sql<{ name: string; portrait: string | null }[]>`
      SELECT name, portrait FROM characters
      WHERE id = ${id} AND player_id = ${user.id} AND deleted_at IS NULL
    `;
    const key = portrait?.portrait
      ? characterPortraitAssetKey(portrait.portrait)
      : null;
    if (!key) return { error: "Profilbild nicht gefunden." };
    const object = await getAssetObjectBytesFromR2(key);
    if (!object) return { error: "Bilddatei nicht gefunden." };
    const extension = key.split(".").pop()?.toLowerCase();
    const mimeType =
      object.contentType ??
      (extension === "jpg" ? "image/jpeg" : `image/${extension}`);
    const image = await uploadUserImage({
      ownerId: user.id,
      fileName: `Profilbild ${portrait!.name}.${extension}`,
      mimeType,
      buffer: object.body,
      sourceImageKey: key,
    });
    revalidatePath("/user/files");
    return { image };
  }
  const source = await getContentImageById(id);
  if (!source || source.uploadedBy !== user.id)
    return { error: "Bild nicht gefunden." };
  const access = await getContentAccessContext(
    source.contentType,
    source.contentId,
  );
  const viewer = resolveViewer(user, await getRoleMap());
  if (!access || !canView(access.isDraft, access.ownerId, viewer)) {
    return { error: "Keine Berechtigung für dieses Bild." };
  }
  const object = await getContentImageBytes(id);
  if (!object) return { error: "Bilddatei nicht gefunden." };
  const sourceContentImageKey = await getContentImageStorageKey(id);
  if (!sourceContentImageKey) return { error: "Bilddatei nicht gefunden." };
  const image = await uploadUserImage({
    ownerId: user.id,
    fileName: `Bild ${id}`,
    mimeType: source.contentMime,
    buffer: object.body,
    sourceImageKey: sourceContentImageKey,
  });
  revalidatePath("/user/files");
  return { image };
}

export async function deleteOwnImageAction(
  id: number,
): Promise<{ error?: string }> {
  const user = await requireOwnUser();
  if (!Number.isInteger(id) || id <= 0) return { error: "Ungültiges Bild." };
  if (!(await deleteUserImage(user.id, id)))
    return { error: "Bild nicht gefunden." };
  revalidatePath("/user/files");
  return {};
}
