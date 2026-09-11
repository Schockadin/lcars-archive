"use server";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { setFontCookies } from "@/lib/session";
import { updateFontPreferences } from "@/lib/users";
import { normalizeFontSans, normalizeFontMono } from "@/lib/fonts";

export interface FontState {
  success?: boolean;
  error?: string;
  fontSans?: string;
  fontMono?: string;
}

// Speichert die im Profil (/user) gewählten Schriften des eingeloggten Users.
// data-font-sans/data-font-mono setzt das Init-Skript im Root-Layout aus den
// neo_font_*-Cookies (src/app/layout.tsx) — analog zu Farbtheme, Hell/Dunkel
// und UI-Modus.
export async function updateFontsAction(
  _state: FontState,
  formData: FormData,
): Promise<FontState> {
  const session = await verifySession();

  // Unbekannte Werte still auf die Vorgabe normalisieren.
  const fontSans = normalizeFontSans(String(formData.get("fontSans") ?? ""));
  const fontMono = normalizeFontMono(String(formData.get("fontMono") ?? ""));

  await updateFontPreferences(session.userId, fontSans, fontMono);
  // JS-lesbare Cookies spiegeln, damit das Init-Skript die Wahl nach einem
  // (Re-)Load ohne Flackern anwendet.
  await setFontCookies(fontSans, fontMono);
  // /user zeigt die bestätigte Auswahl — nach dem Speichern revalidieren.
  revalidatePath("/user");

  return { success: true, fontSans, fontMono };
}
