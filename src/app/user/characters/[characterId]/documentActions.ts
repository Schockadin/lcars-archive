"use server";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { getOwnCharacterForEdit } from "@/lib/characters";
import {
  InvalidCharacterDocumentError,
  deleteCharacterDocument,
  renameCharacterDocument,
  uploadCharacterDocument,
} from "@/lib/characterDocuments";
import { MAX_CHARACTER_DOCUMENT_BYTES } from "@/lib/characterDocumentTypes";
import { characterEditHref, characterHref } from "@/lib/contentRoutes";

export interface CharacterDocumentActionState {
  error?: string;
  success?: string;
}

async function requireOwnedCharacter(characterId: number) {
  const session = await verifySession();
  const character = await getOwnCharacterForEdit(session.userId, characterId);
  return { session, character };
}

function refreshCharacterDocuments(characterId: number, characterSlug: string) {
  revalidatePath(characterEditHref(characterId));
  revalidatePath(characterHref(characterSlug));
}

export async function uploadCharacterDocumentAction(
  _state: CharacterDocumentActionState,
  formData: FormData,
): Promise<CharacterDocumentActionState> {
  const characterId = Number(formData.get("characterId"));
  if (!Number.isInteger(characterId)) return { error: "Ungültiger Charakter." };

  const { session, character } = await requireOwnedCharacter(characterId);
  if (!character) return { error: "Charakter nicht gefunden." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte eine Datei auswählen." };
  }
  if (file.size > MAX_CHARACTER_DOCUMENT_BYTES) {
    return { error: "Die Datei ist zu groß (max. 8 MB)." };
  }

  try {
    await uploadCharacterDocument(
      characterId,
      session.userId,
      file.name,
      Buffer.from(await file.arrayBuffer()),
    );
    refreshCharacterDocuments(characterId, character.slug);
    return { success: `„${file.name}“ wurde hinterlegt.` };
  } catch (error) {
    if (error instanceof InvalidCharacterDocumentError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function deleteCharacterDocumentAction(
  _state: CharacterDocumentActionState,
  formData: FormData,
): Promise<CharacterDocumentActionState> {
  const characterId = Number(formData.get("characterId"));
  const documentId = Number(formData.get("documentId"));
  if (!Number.isInteger(characterId) || !Number.isInteger(documentId)) {
    return { error: "Ungültiges Dokument." };
  }

  const { character } = await requireOwnedCharacter(characterId);
  if (!character) return { error: "Charakter nicht gefunden." };

  const deleted = await deleteCharacterDocument(characterId, documentId);
  if (!deleted) return { error: "Dokument nicht gefunden." };
  refreshCharacterDocuments(characterId, character.slug);
  return { success: "Dokument entfernt." };
}

export async function renameCharacterDocumentAction(
  _state: CharacterDocumentActionState,
  formData: FormData,
): Promise<CharacterDocumentActionState> {
  const characterId = Number(formData.get("characterId"));
  const documentId = Number(formData.get("documentId"));
  if (!Number.isInteger(characterId) || !Number.isInteger(documentId)) {
    return { error: "Ungültiges Dokument." };
  }

  const { character } = await requireOwnedCharacter(characterId);
  if (!character) return { error: "Charakter nicht gefunden." };

  try {
    const renamed = await renameCharacterDocument(
      characterId,
      documentId,
      String(formData.get("fileName") ?? ""),
    );
    if (!renamed) return { error: "Dokument nicht gefunden." };
    refreshCharacterDocuments(characterId, character.slug);
    return { success: `Dokument wurde in „${renamed}“ umbenannt.` };
  } catch (error) {
    if (error instanceof InvalidCharacterDocumentError) {
      return { error: error.message };
    }
    throw error;
  }
}
