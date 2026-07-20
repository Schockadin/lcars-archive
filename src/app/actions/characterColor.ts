"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { updateCharacterColorPreference } from "@/lib/users";
import { isCharacterColorKey } from "@/lib/characterColor";

export interface CharacterColorState {
  success?: boolean;
  color?: string;
  error?: string;
}

// Formular-Action für den Farbwähler im Profil (/user) — analog
// updateEditorSpellcheckSettingsAction (app/actions/editorPreferences.ts).
// Nur einer der festen Palette-Schlüssel wird akzeptiert; alles andere wird
// abgelehnt (die DB-CHECK-Constraint sichert das zusätzlich ab).
export async function updateCharacterColorAction(
  _state: CharacterColorState,
  formData: FormData,
): Promise<CharacterColorState> {
  const currentUser = await getCurrentUser();
  const color = String(formData.get("characterColor") ?? "");

  if (!isCharacterColorKey(color)) {
    return { error: "Ungültige Farbe." };
  }

  await updateCharacterColorPreference(currentUser.id, color);
  revalidatePath("/user");

  return { success: true, color };
}
