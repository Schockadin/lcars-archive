"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import {
  updateCharacterColorPreference,
  ColorTakenError,
} from "@/lib/users";
import { isHexColor, normalizeHex } from "@/lib/characterColor";

export interface CharacterColorState {
  success?: boolean;
  color?: string;
  error?: string;
}

// Formular-Action für den Farbwähler im Profil (/user). Akzeptiert jede
// gültige Hex-Farbe (#rrggbb) — sowohl LCARS-Presets als auch frei per
// Color-Picker gewählte. Bereits von anderen belegte Farben lehnt
// updateCharacterColorPreference per ColorTakenError ab (DB-UNIQUE-Index).
export async function updateCharacterColorAction(
  _state: CharacterColorState,
  formData: FormData,
): Promise<CharacterColorState> {
  const currentUser = await getCurrentUser();
  const raw = String(formData.get("characterColor") ?? "");

  if (!isHexColor(raw)) {
    return { error: "Ungültige Farbe." };
  }
  const color = normalizeHex(raw);

  try {
    await updateCharacterColorPreference(currentUser.id, color);
  } catch (err) {
    if (err instanceof ColorTakenError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath("/user");
  return { success: true, color };
}
