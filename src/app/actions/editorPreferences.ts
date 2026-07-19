"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/lib/dal";
import {
  getEditorSpellcheckPreference,
  updateEditorSpellcheckPreference,
} from "@/lib/users";

// Wird direkt aus MarkdownEditor.tsx aufgerufen (Client-Fetch per useEffect,
// kein Formular) — gleiches Muster wie getFollowState in app/actions/
// follows.ts: getSession() statt getCurrentUser()/verifySession(), damit ein
// fehlender Login keinen Redirect auslöst, sondern einfach den DB-Default
// (true) liefert. MarkdownEditor.tsx wird zwar nur in bereits
// eingeloggten Kontexten gerendert, ein Session-Ablauf zwischen Seitenladen
// und diesem Fetch soll trotzdem nicht crashen.
export async function getEditorSpellcheckPreferenceAction(): Promise<boolean> {
  const session = await getSession();
  if (!session) return true;
  return getEditorSpellcheckPreference(session.userId);
}

export interface EditorSpellcheckSettingsState {
  success?: boolean;
  enabled?: boolean;
}

// Formular-Action für den Toggle im Profil (/user) — analog
// updateNotificationSettingsAction in app/user/notificationActions.ts:
// formData.has(...) statt eines Hidden-Input-Tricks, da eine nicht
// angehakte native Checkbox einfach im FormData fehlt.
export async function updateEditorSpellcheckSettingsAction(
  _state: EditorSpellcheckSettingsState,
  formData: FormData,
): Promise<EditorSpellcheckSettingsState> {
  const currentUser = await getCurrentUser();
  const enabled = formData.has("spellcheckEnabled");

  await updateEditorSpellcheckPreference(currentUser.id, enabled);
  revalidatePath("/user");

  return { success: true, enabled };
}
