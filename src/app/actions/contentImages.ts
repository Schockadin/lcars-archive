"use server";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { getRoleMap } from "@/lib/roles";
import { getViewer, canView, resolveViewer } from "@/lib/visibility";
import { revalidateCharacter } from "@/lib/revalidate";
import {
  isContentImageType,
  getContentAccessContext,
  canManageContentImages,
  uploadContentImage,
  deleteContentImage,
  listContentImages,
  setCharacterPortraitFromImage,
  InvalidContentImageError,
  type ContentImage,
  type ContentImageType,
} from "@/lib/contentImages";

export interface ContentImageActionState {
  error?: string;
  images?: ContentImage[];
}

// Gemeinsame Vorprüfung für Upload/Löschen: Session -> frische Rolle aus der
// DB (nie aus dem Cookie, gleiches Prinzip wie setOwnerAction) -> Inhalt
// existiert -> Berechtigung. Gibt bei jedem Fehlschlag denselben
// {error}-Shape zurück, damit beide Aktionen unten schlank bleiben.
async function requireContentImageAccess(
  contentTypeRaw: string,
  contentId: number,
): Promise<{ error: string } | { contentType: ContentImageType }> {
  if (!isContentImageType(contentTypeRaw)) {
    return { error: "Ungültiger Inhaltstyp." };
  }
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  const user = await getUserById(session.userId);
  if (!user) return { error: "Nicht angemeldet." };

  const access = await getContentAccessContext(contentTypeRaw, contentId);
  if (!access) return { error: "Inhalt nicht gefunden." };

  const roleMap = await getRoleMap();
  if (
    !canManageContentImages(
      contentTypeRaw,
      access.ownerId,
      resolveViewer(user, roleMap),
    )
  ) {
    return { error: "Keine Berechtigung." };
  }
  return { contentType: contentTypeRaw };
}

const MAX_UPLOAD_BATCH = 10;

export async function uploadContentImagesAction(
  _state: ContentImageActionState,
  formData: FormData,
): Promise<ContentImageActionState> {
  const contentTypeRaw = String(formData.get("contentType") ?? "");
  const contentId = Number(formData.get("contentId"));
  if (!Number.isInteger(contentId)) {
    return { error: "Ungültiger Inhalt." };
  }

  const access = await requireContentImageAccess(contentTypeRaw, contentId);
  if ("error" in access) return access;

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Keine Datei ausgewählt." };
  }
  if (files.length > MAX_UPLOAD_BATCH) {
    return { error: `Höchstens ${MAX_UPLOAD_BATCH} Bilder auf einmal.` };
  }

  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  try {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      await uploadContentImage(
        access.contentType,
        contentId,
        { buffer, mimeType: file.type },
        session.userId,
      );
    }
  } catch (err) {
    if (err instanceof InvalidContentImageError) {
      return { error: err.message };
    }
    throw err;
  }

  return { images: await listContentImages(access.contentType, contentId) };
}

export async function deleteContentImageAction(
  contentTypeRaw: string,
  contentId: number,
  imageId: number,
): Promise<ContentImageActionState> {
  const access = await requireContentImageAccess(contentTypeRaw, contentId);
  if ("error" in access) return access;

  await deleteContentImage(access.contentType, contentId, imageId);
  return { images: await listContentImages(access.contentType, contentId) };
}

// Vom Gallery-Client beim Mounten aufgerufen (gleiches Muster wie
// getFollowState/getDialogueSnapshotAction) — kein RSC-Prop-Durchreichen
// nötig, die Bilderliste ist client-seitig ohnehin neu zu laden, sobald sich
// nach Upload/Löschen etwas ändert. Gleiche Sichtbarkeitsprüfung wie der
// Bild-Proxy (canView) — sonst ließe sich über diese Aktion die Bilderliste
// (Anzahl/IDs) eines sonst privaten/GM-only-Inhalts erfragen, auch wenn die
// Bytes selbst durch den Proxy weiterhin geschützt wären.
export async function getContentImagesAction(
  contentTypeRaw: string,
  contentId: number,
): Promise<ContentImage[]> {
  if (!isContentImageType(contentTypeRaw)) return [];

  const access = await getContentAccessContext(contentTypeRaw, contentId);
  if (!access) return [];

  const viewer = await getViewer();
  if (!canView(access.visibility, access.ownerId, viewer)) return [];

  return listContentImages(contentTypeRaw, contentId);
}

// Setzt eines der bereits hochgeladenen Bilder als Profilbild — dieselbe
// Owner-only-Berechtigung wie Bild-Upload/-Löschen für Charaktere
// (requireContentImageAccess("character", ...), kein Admin-Bypass, siehe
// canManageContentImages).
export async function setCharacterPortraitAction(
  characterId: number,
  imageId: number,
): Promise<{ error?: string }> {
  const access = await requireContentImageAccess("character", characterId);
  if ("error" in access) return access;

  const slug = await setCharacterPortraitFromImage(characterId, imageId);
  if (!slug) return { error: "Bild nicht gefunden." };

  revalidateCharacter(slug);
  return {};
}
