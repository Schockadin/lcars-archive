"use server";
import { getCurrentUser } from "@/lib/dal";
import {
  updateCharacterColorPreference,
  ColorTakenError,
} from "@/lib/characters";
import { revalidateCharacter } from "@/lib/revalidate";
import { isHexColor, normalizeHex } from "@/lib/characterColor";

export interface CharacterColorState {
  success?: boolean;
  color?: string;
  error?: string;
}

// Formular-Action für den Farbwähler im Profil (/user, eine Instanz pro
// Charakter — siehe CharacterColorForm.tsx). Akzeptiert jede gültige
// Hex-Farbe (#rrggbb) — sowohl LCARS-Presets als auch frei per Color-Picker
// gewählte. updateCharacterColorPreference prüft Ownership per WHERE-Klausel
// (id + player_id) und meldet mit false, wenn der Charakter nicht existiert
// oder nicht diesem User gehört; bereits von einem ANDEREN Charakter belegte
// Farben lehnt sie per ColorTakenError ab (DB-UNIQUE-Index).
export async function updateCharacterColorAction(
  _state: CharacterColorState,
  formData: FormData,
): Promise<CharacterColorState> {
  const currentUser = await getCurrentUser();
  const characterId = Number(formData.get("characterId"));
  const raw = String(formData.get("characterColor") ?? "");

  if (!Number.isInteger(characterId)) {
    return { error: "Ungültiger Charakter." };
  }
  if (!isHexColor(raw)) {
    return { error: "Ungültige Farbe." };
  }
  const color = normalizeHex(raw);

  let slug: string | null;
  try {
    slug = await updateCharacterColorPreference(
      characterId,
      currentUser.id,
      color,
    );
  } catch (err) {
    if (err instanceof ColorTakenError) {
      return { error: err.message };
    }
    throw err;
  }
  if (!slug) {
    return { error: "Dieser Charakter gehört dir nicht." };
  }

  revalidateCharacter(slug);
  return { success: true, color };
}
