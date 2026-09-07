"use server";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { setColorModeCookie } from "@/lib/session";
import { updateColorModePreference } from "@/lib/users";
import { normalizeColorMode } from "@/lib/colorMode";

export interface ColorModeState {
  success?: boolean;
  error?: string;
  colorMode?: string;
}

// Speichert den im Profil (/user) gewählten Hell/Dunkel-Modus des eingeloggten
// Users. data-mode wird serverseitig via neo_mode-Cookie im Root-Layout
// angewandt (src/app/layout.tsx) — analog zum Farbtheme und UI-Modus.
export async function updateColorModeAction(
  _state: ColorModeState,
  formData: FormData,
): Promise<ColorModeState> {
  const session = await verifySession();

  // Unbekannte Werte still auf den Default (dark) normalisieren.
  const colorMode = normalizeColorMode(String(formData.get("colorMode") ?? ""));

  await updateColorModePreference(session.userId, colorMode);
  // JS-lesbares Cookie spiegeln, damit das Init-Skript im Root-Layout die Wahl
  // nach einem (Re-)Load ohne Flackern anwendet.
  await setColorModeCookie(colorMode);
  // /user zeigt die bestätigte Auswahl — nach dem Speichern revalidieren.
  revalidatePath("/user");

  return { success: true, colorMode };
}
