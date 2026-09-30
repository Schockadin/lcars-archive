"use server";

import { verifySession } from "@/lib/dal";
import {
  convertOwnedCharacterToNpc,
  restoreOwnedCharacterFromNpc,
} from "@/lib/characterNpcConversion";
import { revalidateCharacter, revalidateArchiveEntry } from "@/lib/revalidate";
import { revalidatePathAndNotify } from "@/lib/realtimeServer";

export interface CharacterNpcConversionState {
  error?: string;
  success?: string;
  npcSlug?: string;
}

function readCharacterId(formData: FormData): number | null {
  const id = Number(formData.get("characterId"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function revalidateConversionPaths(
  characterId: number,
  characterSlug: string,
  npcSlug: string,
) {
  revalidateCharacter(characterSlug);
  revalidateArchiveEntry(npcSlug);
  await revalidatePathAndNotify("/characters");
  await revalidatePathAndNotify(`/characters/${characterSlug}`);
  await revalidatePathAndNotify(`/archive/${npcSlug}`);
  await revalidatePathAndNotify("/user/characters");
  await revalidatePathAndNotify(`/user/characters/${characterId}`);
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

  await revalidateConversionPaths(characterId, result.characterSlug, result.npcSlug);
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

  await revalidateConversionPaths(characterId, result.characterSlug, result.npcSlug);
  return { success: "Der Charakter wurde wiederhergestellt." };
}
