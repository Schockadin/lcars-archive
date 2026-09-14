"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/dal";
import { reopenCharacterCreation } from "@/lib/characterAp";
import { revalidateCharacter } from "@/lib/revalidate";
import { characterEditHref } from "@/lib/contentRoutes";

export interface CreationResetState {
  error?: string;
  success?: string;
}

// Eine abgeschlossene Erschaffung wieder öffnen (Spielleitung). Die Rücknahme
// der seither gebuchten Steigerungen, ihre Notiz am Charakter und die
// Gegenbuchungen passieren in reopenCharacterCreation innerhalb EINER
// Transaktion — diese Action prüft nur das Recht, übersetzt das Formular und
// revalidiert.
//
// Dasselbe Recht wie das Zuordnen von Charakteren (characters.assign): beides
// ist Charakter-Verwaltung der Spielleitung und steht auf derselben Seite.
export async function reopenCreationAction(
  _state: CreationResetState,
  formData: FormData,
): Promise<CreationResetState> {
  const gm = await requirePermission("characters.assign");

  const characterId = Number(formData.get("characterId"));
  if (!Number.isInteger(characterId)) {
    return { error: "Ungültiger Charakter." };
  }

  const result = await reopenCharacterCreation(characterId, gm.id);
  if (!result.ok) return { error: result.error };

  revalidateCharacter(result.slug);
  revalidatePath(characterEditHref(characterId));
  revalidatePath("/gm/characters");

  const parts = [`„${result.name}" ist wieder in der Erschaffung.`];
  if (result.reverted.length > 0) {
    parts.push(
      `${result.reverted.length} Steigerung${result.reverted.length === 1 ? " wurde" : "en wurden"} zurückgenommen und notiert — beim Abschließen werden sie automatisch wieder angewandt.`,
    );
  } else {
    parts.push("Es gab keine Steigerungen, die zurückzunehmen waren.");
  }
  if (result.apChange !== 0) {
    parts.push(
      result.apChange > 0
        ? `${result.apChange} AP wurden gutgeschrieben.`
        : `${-result.apChange} AP wurden abgezogen.`,
    );
  }
  if (result.unresolved.length > 0) {
    parts.push(
      `Nicht zugeordnet und deshalb unverändert stehen geblieben: ${result.unresolved.join(", ")}.`,
    );
  }

  return { success: parts.join(" ") };
}
