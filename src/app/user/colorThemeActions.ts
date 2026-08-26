"use server";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { setThemeCookie } from "@/lib/session";
import { updateColorThemePreference } from "@/lib/users";
import { DEFAULT_THEME_ID, isValidThemeId } from "@/lib/themes";

export interface ColorThemeState {
  success?: boolean;
  error?: string;
  theme?: string;
}

// Speichert das im Profil (/user) gewählte Farbtheme des eingeloggten Users.
// Das Attribut data-theme auf <html> wird serverseitig im Root-Layout gesetzt
// (src/app/layout.tsx) — nach dem Speichern übernimmt die nächste Server-
// Render (bzw. clientseitig sofort das ThemeSettingsForm) den neuen Wert.
export async function updateColorThemeAction(
  _state: ColorThemeState,
  formData: FormData,
): Promise<ColorThemeState> {
  const session = await verifySession();

  const requested = String(formData.get("theme") ?? "");
  // Unbekannte/veraltete IDs still auf das Default-Theme normalisieren, statt
  // einen Fehler zu werfen — das Formular bietet ohnehin nur gültige an.
  const theme = isValidThemeId(requested) ? requested : DEFAULT_THEME_ID;

  await updateColorThemePreference(session.userId, theme);
  // JS-lesbares Theme-Cookie spiegeln, damit das Init-Skript im Root-Layout
  // die Wahl nach einem (Re-)Load ohne Flackern anwendet.
  await setThemeCookie(theme);
  // /user zeigt die bestätigte Auswahl (currentTheme-Prop) — nach dem
  // Speichern revalidieren, damit ein Neuladen den frischen Stand rendert.
  revalidatePath("/user");

  return { success: true, theme };
}
