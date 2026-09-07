"use server";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { getRoleMap } from "@/lib/roles";
import { userCan } from "@/lib/permissions";
import {
  ManualEventError,
  createManualEvent,
  deleteManualEvent,
  listCharactersForEvents,
  parseManualEvent,
} from "@/lib/timelineManualEvents";

export interface ManualEventState {
  error?: string;
  success?: boolean;
}

// Ein Ereignis von Hand in die Chronologie eintragen — für alles, was zur
// Kampagne gehört, aber in keinem Eintrag steht. Gebunden an dasselbe Recht
// wie das Anlegen eigener Inhalte (content.create): wer ein Logbuch schreiben
// darf, darf auch einen Meilenstein setzen.
export async function createManualEventAction(
  _state: ManualEventState,
  formData: FormData,
): Promise<ManualEventState> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  const user = await getUserById(session.userId);
  const roleMap = await getRoleMap();
  if (!user || !userCan(user, "content.create", roleMap)) {
    return { error: "Keine Berechtigung, Ereignisse einzutragen." };
  }

  try {
    const input = parseManualEvent({
      date: String(formData.get("date") ?? ""),
      title: String(formData.get("title") ?? ""),
      detail: String(formData.get("detail") ?? ""),
      category: String(formData.get("category") ?? ""),
      characterIds: formData.getAll("characterIds").map(String),
    });

    // Wie überall: die Auswahl gegen den Bestand prüfen — ein manipuliertes
    // Formular soll keine gelöschte oder fremde Entwurfs-Figur verknüpfen.
    const bekannt = new Set(
      (await listCharactersForEvents()).map((character) => character.id),
    );
    if (input.characterIds.some((id) => !bekannt.has(id))) {
      return { error: "Mindestens eine ausgewählte Figur gibt es nicht." };
    }

    await createManualEvent(input, user.id);
    return { success: true };
  } catch (err) {
    // Eingabefehler gehören zurück an die Person; alles andere ist ein
    // echter Fehler und soll laut scheitern.
    if (err instanceof ManualEventError) return { error: err.message };
    throw err;
  }
}

export async function deleteManualEventAction(
  _state: ManualEventState,
  formData: FormData,
): Promise<ManualEventState> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  const user = await getUserById(session.userId);
  const roleMap = await getRoleMap();
  if (!user) return { error: "Nicht angemeldet." };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Unbekanntes Ereignis." };

  const removed = await deleteManualEvent(id, {
    userId: user.id,
    canModerate: userCan(user, "content.moderate", roleMap),
  });
  return removed
    ? { success: true }
    : { error: "Das Ereignis gibt es nicht mehr — oder es gehört jemand anderem." };
}
