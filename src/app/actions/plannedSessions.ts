"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import {
  createPlannedSession,
  deletePlannedSession,
  updatePlannedSession,
} from "@/lib/plannedSessions";
import { parsePlannedSession } from "@/lib/plannedSessionFormat";
import { listActiveCharactersForAp } from "@/lib/gameSessions";

export interface PlannedSessionState {
  error?: string;
  success?: string;
}

// Termine pflegt die Spielleitung (requireGM prüft das Recht frisch aus der
// DB). Das Zu- und Absagen liegt NICHT hier, sondern in der Route
// /api/rsvp — es war die einzige Aktion, die vom Dashboard ("/") aus lief,
// und genau sie scheiterte in der Netlify-Umgebung mit einem 403 (die
// Begründung steht ausführlich in src/app/api/rsvp/route.ts).
//
// Nach jeder Änderung beide Seiten neu bauen: die Verwaltung unter
// /gm/sessions und das Dashboard, auf dem der Termin steht.
function revalidateBoth(): void {
  revalidatePath("/gm/sessions");
  revalidatePath("/");
}

function formFields(formData: FormData) {
  return {
    scheduledAt: String(formData.get("scheduledAt") ?? ""),
    title: String(formData.get("title") ?? ""),
    location: String(formData.get("location") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    characterIds: formData.getAll("characterIds").map(String),
  };
}

// Wie bei den gespielten Sessions: nur aktive Akten mit Konto dürfen in die
// Planung — ein manipuliertes Formular soll keine fremde oder zurückgezogene
// Figur eintragen.
async function allowedCharacters(ids: number[]): Promise<number[] | null> {
  const allowed = new Set(
    (await listActiveCharactersForAp()).map((character) => character.id),
  );
  const kept = ids.filter((id) => allowed.has(id));
  return kept.length === ids.length ? kept : null;
}

export async function createPlannedSessionAction(
  _state: PlannedSessionState,
  formData: FormData,
): Promise<PlannedSessionState> {
  const user = await requireGM();
  const parsed = parsePlannedSession(formFields(formData));
  if (!parsed.ok) return { error: parsed.error };

  const characterIds = await allowedCharacters(parsed.characterIds);
  if (characterIds === null) {
    return { error: "Mindestens eine ausgewählte Figur ist nicht (mehr) aktiv." };
  }

  await createPlannedSession({ ...parsed, characterIds }, user.id);
  revalidateBoth();
  return { success: "Termin angekündigt." };
}

export async function updatePlannedSessionAction(
  _state: PlannedSessionState,
  formData: FormData,
): Promise<PlannedSessionState> {
  await requireGM();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Unbekannter Termin." };

  const parsed = parsePlannedSession(formFields(formData));
  if (!parsed.ok) return { error: parsed.error };

  const characterIds = await allowedCharacters(parsed.characterIds);
  if (characterIds === null) {
    return { error: "Mindestens eine ausgewählte Figur ist nicht (mehr) aktiv." };
  }

  await updatePlannedSession(id, { ...parsed, characterIds });
  revalidateBoth();
  return { success: "Termin geändert." };
}

export async function deletePlannedSessionAction(
  _state: PlannedSessionState,
  formData: FormData,
): Promise<PlannedSessionState> {
  await requireGM();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Unbekannter Termin." };

  await deletePlannedSession(id);
  revalidateBoth();
  return { success: "Termin abgesagt und entfernt." };
}
