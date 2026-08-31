"use server";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import {
  advanceOwnCharacter,
  lockOwnCharacterCreation,
} from "@/lib/characterAp";
import { revalidateCharacter } from "@/lib/revalidate";
import type { AdvancementKind } from "@/lib/advancement";

export interface AdvancementActionResult {
  error?: string;
  // Kurzer Erfolgstext für den Toast, z.B. „Kontrolle 9 → 10 für 30 AP".
  success?: string;
}

const VALID_KINDS: AdvancementKind[] = [
  "attribute",
  "department",
  "talent",
  "focus",
];

function isAdvancementKind(value: string): value is AdvancementKind {
  return (VALID_KINDS as string[]).includes(value);
}

// Steigern eines eigenen Charakters. Die eigentliche Prüfung (Regelgrenzen,
// AP-Deckung) und das Buchen passieren in advanceOwnCharacter innerhalb EINER
// Transaktion — diese Action übersetzt nur das Formular und revalidiert.
//
// Wie die übrigen Content-Actions im User-Bereich: Session prüfen, Berechtigung
// über das owner-gescopte SQL durchsetzen (eine fremde characterId trifft 0
// Zeilen), Fehler als deutscher Text zurückgeben.
export async function advanceCharacterAction(
  state: AdvancementActionResult,
  formData: FormData,
): Promise<AdvancementActionResult> {
  const session = await verifySession();

  const characterId = Number(formData.get("characterId"));
  if (!Number.isInteger(characterId)) {
    return { error: "Ungültiger Charakter." };
  }

  const kind = String(formData.get("kind") ?? "");
  if (!isAdvancementKind(kind)) {
    return { error: "Unbekannte Steigerung." };
  }

  const result = await advanceOwnCharacter(session.userId, characterId, {
    kind,
    key: String(formData.get("key") ?? "") || undefined,
    entry: String(formData.get("entry") ?? "") || undefined,
  });

  if (!result.ok) return { error: result.error };

  revalidateCharacter(result.slug);
  revalidatePath(`/user/characters/${characterId}/stats`);

  return { success: `${result.label} für ${result.cost} AP gesteigert.` };
}

// Ersterschaffung abschließen: danach sind Attribute/Disziplinen auf dem Bogen
// schreibgeschützt und nur noch über AP-Steigerungen veränderbar.
export async function lockCreationAction(
  state: AdvancementActionResult,
  formData: FormData,
): Promise<AdvancementActionResult> {
  const session = await verifySession();

  const characterId = Number(formData.get("characterId"));
  if (!Number.isInteger(characterId)) {
    return { error: "Ungültiger Charakter." };
  }

  const result = await lockOwnCharacterCreation(session.userId, characterId);
  if (!result) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }

  revalidateCharacter(result.slug);
  revalidatePath(`/user/characters/${characterId}/stats`);

  return {
    success:
      "Erschaffung abgeschlossen — Attribute und Disziplinen lassen sich jetzt nur noch mit AP steigern.",
  };
}
