"use server";

import { verifySession } from "@/lib/dal";
import {
  convertOwnedCharacterToNpc,
  restoreOwnedCharacterFromNpc,
} from "@/lib/characterNpcConversion";
import { revalidateCharacter, revalidateArchiveEntry } from "@/lib/revalidate";
import { revalidatePath } from "next/cache";

export interface CharacterNpcConversionState {
  error?: string;
  success?: string;
  npcSlug?: string;
}

function readCharacterId(formData: FormData): number | null {
  const id = Number(formData.get("characterId"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function revalidateConversionPaths(
  characterId: number,
  characterSlug: string,
  npcSlug: string,
) {
  revalidateCharacter(characterSlug);
  revalidateArchiveEntry(npcSlug);
  revalidatePath("/characters");
  revalidatePath(`/characters/${characterSlug}`);
  revalidatePath(`/archive/${npcSlug}`);
  revalidatePath("/user/characters");
  revalidatePath(`/user/characters/${characterId}`);
}

export async function convertCharacterToNpcAction(
  _state: CharacterNpcConversionState,
  formData: FormData,
): Promise<CharacterNpcConversionState> {
  const session = await verifySession();
  const characterId = readCharacterId(formData);
  if (characterId === null) return { error: "Ungültiger Charakter." };

  const result = await convertOwnedCharacterToNpc(session.userId, characterId);
  if (result.status === "not-found") {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }
  if (result.status === "already-converted") {
    return {
      error: "Dieser Charakter wurde bereits in einen NPC umgewandelt.",
    };
  }
  if (result.status === "active") {
    return {
      error:
        "Nur inaktive oder verstorbene Charaktere können umgewandelt werden.",
    };
  }
  if (result.status === "changed") {
    return {
      error:
        "Der Charakter wurde zwischenzeitlich bearbeitet. Bitte lade die Seite neu und versuche es noch einmal.",
    };
  }

  revalidateConversionPaths(characterId, result.characterSlug, result.npcSlug);
  return {
    success: "Der Charakter wurde in einen NPC umgewandelt.",
    npcSlug: result.npcSlug,
  };
}

export async function restoreCharacterFromNpcAction(
  _state: CharacterNpcConversionState,
  formData: FormData,
): Promise<CharacterNpcConversionState> {
  const session = await verifySession();
  const characterId = readCharacterId(formData);
  if (characterId === null) return { error: "Ungültiger Charakter." };

  const result = await restoreOwnedCharacterFromNpc(
    session.userId,
    characterId,
  );
  if (result.status === "not-found") {
    return { error: "Umwandlung nicht gefunden oder keine Berechtigung." };
  }

  revalidateConversionPaths(characterId, result.characterSlug, result.npcSlug);
  return { success: "Der Charakter wurde wiederhergestellt." };
}
