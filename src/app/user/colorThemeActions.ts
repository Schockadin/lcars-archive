"use server";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { setThemeCookie, setThemeCustomCookie } from "@/lib/session";
import {
  updateColorThemePreference,
  updateThemeOverrides,
} from "@/lib/users";
import {
  DEFAULT_THEME_ID,
  isValidThemeId,
  sanitizeThemeOverrides,
  type ThemeOverrides,
} from "@/lib/themes";

export interface ColorThemeState {
  success?: boolean;
  error?: string;
  theme?: string;
  overrides?: ThemeOverrides;
}

// Parst das JSON aus dem versteckten Formularfeld "overrides" defensiv — jeder
// Fehler ⇒ keine Overrides. Die eigentliche Validierung (gültige Token-IDs +
// Hex) macht sanitizeThemeOverrides.
function parseOverrides(raw: FormDataEntryValue | null): ThemeOverrides {
  if (typeof raw !== "string" || raw.trim() === "") return {};
  try {
    return sanitizeThemeOverrides(JSON.parse(raw));
  } catch {
    return {};
  }
}

// Speichert das im Profil (/user) gewählte Farbtheme + die individuellen
// Token-Overrides des eingeloggten Users. data-theme und die Inline-Overrides
// werden serverseitig im Root-Layout via Cookie angewandt (src/app/layout.tsx).
export async function updateColorThemeAction(
  _state: ColorThemeState,
  formData: FormData,
): Promise<ColorThemeState> {
  const session = await verifySession();

  const requested = String(formData.get("theme") ?? "");
  // Unbekannte/veraltete IDs still auf das Default-Theme normalisieren.
  const theme = isValidThemeId(requested) ? requested : DEFAULT_THEME_ID;
  const overrides = parseOverrides(formData.get("overrides"));

  await updateColorThemePreference(session.userId, theme);
  await updateThemeOverrides(session.userId, overrides);
  // JS-lesbare Cookies spiegeln, damit das Init-Skript im Root-Layout die Wahl
  // nach einem (Re-)Load ohne Flackern anwendet.
  await setThemeCookie(theme);
  await setThemeCustomCookie(overrides);
  // /user zeigt die bestätigte Auswahl — nach dem Speichern revalidieren.
  revalidatePath("/user");

  return { success: true, theme, overrides };
}
