"use server";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { getRoleMap } from "@/lib/roles";
import { getViewer, canView, resolveViewer } from "@/lib/visibility";
import {
  getContentAccessContext,
  canManageContentImages,
} from "@/lib/contentImages";
import {
  listCharacterSheets,
  uploadCharacterSheet,
  deleteCharacterSheet,
  type CharacterSheet,
} from "@/lib/characterSheets";
import { InvalidAssetError } from "@/lib/assetStorage";

export interface CharacterSheetActionState {
  error?: string;
  sheets?: CharacterSheet[];
}

// Upload/Löschen dürfen dieselben Personen wie bei Charakter-Bildern: nur der
// Owner des Charakters (kein Moderations-Bypass — canManageContentImages gibt
// für "character" ausschließlich dem Owner frei). Frische Rolle aus der DB,
// nie aus dem Cookie.
async function requireCharacterSheetManage(
  characterId: number,
): Promise<{ error: string } | { ok: true }> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  const user = await getUserById(session.userId);
  if (!user) return { error: "Nicht angemeldet." };

  const access = await getContentAccessContext("character", characterId);
  if (!access) return { error: "Charakter nicht gefunden." };

  const roleMap = await getRoleMap();
  if (!canManageContentImages("character", access.ownerId, resolveViewer(user, roleMap))) {
    return { error: "Keine Berechtigung." };
  }
  return { ok: true };
}

const MAX_UPLOAD_BATCH = 5;

export async function uploadCharacterSheetsAction(
  _state: CharacterSheetActionState,
  formData: FormData,
): Promise<CharacterSheetActionState> {
  const characterId = Number(formData.get("characterId"));
  if (!Number.isInteger(characterId)) {
    return { error: "Ungültiger Charakter." };
  }

  const manage = await requireCharacterSheetManage(characterId);
  if ("error" in manage) return manage;

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Keine Datei ausgewählt." };
  if (files.length > MAX_UPLOAD_BATCH) {
    return { error: `Höchstens ${MAX_UPLOAD_BATCH} Bögen auf einmal.` };
  }

  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  try {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      await uploadCharacterSheet(
        characterId,
        { buffer, mimeType: file.type, fileName: file.name },
        session.userId,
      );
    }
  } catch (err) {
    if (err instanceof InvalidAssetError) return { error: err.message };
    throw err;
  }

  return { sheets: await listCharacterSheets(characterId) };
}

export async function deleteCharacterSheetAction(
  characterId: number,
  sheetId: number,
): Promise<CharacterSheetActionState> {
  const manage = await requireCharacterSheetManage(characterId);
  if ("error" in manage) return manage;

  await deleteCharacterSheet(characterId, sheetId);
  return { sheets: await listCharacterSheets(characterId) };
}

// Vom Client beim Mounten aufgerufen (gleiches Muster wie
// getContentImagesAction) — gleiche Sichtbarkeitsprüfung wie die
// Charakterseite selbst (canView): wer den Charakter nicht sehen darf, sieht
// auch seine Bögen nicht.
export async function getCharacterSheetsAction(
  characterId: number,
): Promise<CharacterSheet[]> {
  const access = await getContentAccessContext("character", characterId);
  if (!access) return [];

  const viewer = await getViewer();
  if (!canView(access.visibility, access.ownerId, viewer)) return [];

  return listCharacterSheets(characterId);
}
