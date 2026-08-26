"use server";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { setUiModeCookie } from "@/lib/session";
import { updateUiModePreference } from "@/lib/users";
import { normalizeUiMode } from "@/lib/uiMode";

export interface UiModeState {
  success?: boolean;
  error?: string;
  uiMode?: string;
}

// Speichert den im Profil (/user) gewählten UI-Modus (LCARS vs. minimal) des
// eingeloggten Users. data-ui wird serverseitig via neo_ui-Cookie im
// Root-Layout angewandt (src/app/layout.tsx) — analog zum Farbtheme.
export async function updateUiModeAction(
  _state: UiModeState,
  formData: FormData,
): Promise<UiModeState> {
  const session = await verifySession();

  // Unbekannte Werte still auf den Default (lcars) normalisieren.
  const uiMode = normalizeUiMode(String(formData.get("uiMode") ?? ""));

  await updateUiModePreference(session.userId, uiMode);
  // JS-lesbares Cookie spiegeln, damit das Init-Skript im Root-Layout die Wahl
  // nach einem (Re-)Load ohne Flackern anwendet.
  await setUiModeCookie(uiMode);
  // /user zeigt die bestätigte Auswahl — nach dem Speichern revalidieren.
  revalidatePath("/user");

  return { success: true, uiMode };
}
