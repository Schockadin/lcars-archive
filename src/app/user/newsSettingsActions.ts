"use server";
import { verifySession } from "@/lib/dal";
import { updateNewsKinds } from "@/lib/users";

export interface NewsSettingsState {
  error?: string;
  success?: boolean;
  newsKinds?: string[];
}

const VALID_KINDS = ["created", "updated", "deleted"];

// Speichert, welche News-Arten der eingeloggte User auf dem Dashboard sehen
// will (Neu/Editiert/Gelöscht). Keine Checkbox angehakt = keine News.
export async function updateNewsSettingsAction(
  _state: NewsSettingsState,
  formData: FormData,
): Promise<NewsSettingsState> {
  const session = await verifySession();

  const newsKinds = formData
    .getAll("newsKinds")
    .map((v) => String(v))
    .filter((v) => VALID_KINDS.includes(v));

  await updateNewsKinds(session.userId, newsKinds);
  return { success: true, newsKinds };
}
