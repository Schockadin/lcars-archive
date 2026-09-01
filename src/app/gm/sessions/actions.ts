"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import {
  createGameSession,
  deleteGameSession,
  updateGameSessionNotes,
  listActiveCharactersForAp,
  setSessionLogbooks,
} from "@/lib/gameSessions";
import {
  validateGameSessionInput,
  SESSION_TITLE_MAX,
  SESSION_NOTES_MAX,
} from "@/lib/gameSessionFormat";

export interface SessionFormState {
  error?: string;
  success?: string;
}

// Alle Actions sind gm-oder-admin (requireGM prüft das Recht frisch aus der
// DB). Die Eingaben laufen durch dieselbe Prüfung wie im Formular; verbindlich
// ist ausschließlich diese Seite.

export async function createSessionAction(
  state: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const user = await requireGM();

  const parsed = validateGameSessionInput({
    sessionDate: String(formData.get("sessionDate") ?? ""),
    title: String(formData.get("title") ?? ""),
    sessionAp: String(formData.get("sessionAp") ?? ""),
    bonusAp: String(formData.get("bonusAp") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    characterIds: formData.getAll("characterIds").map(String),
  });
  if (!parsed.ok) return { error: parsed.error };

  // Nur Charaktere gutschreiben, die auch wirklich gutschreibbar sind — ein
  // manipuliertes Formular soll keine fremde, zurückgezogene oder gelöschte
  // Akte auf ein AP-Konto heben.
  const allowed = new Set(
    (await listActiveCharactersForAp()).map((character) => character.id),
  );
  const characterIds = parsed.value.characterIds.filter((id) => allowed.has(id));
  if (characterIds.length !== parsed.value.characterIds.length) {
    return { error: "Mindestens ein ausgewählter Charakter ist nicht (mehr) aktiv." };
  }

  await createGameSession({
    ...parsed.value,
    characterIds,
    createdByUserId: user.id,
  });

  revalidatePath("/gm/sessions");
  revalidatePath("/gm/ap");
  revalidatePath("/gm/campaign");

  const perCharacter = parsed.value.sessionAp + parsed.value.bonusAp;
  return {
    success:
      characterIds.length > 0 && perCharacter > 0
        ? `Session angelegt, je ${perCharacter} AP an ${characterIds.length} Charaktere gebucht.`
        : "Session angelegt.",
  };
}

// Zurücknehmen löscht auch die Gutschriften (ON DELETE CASCADE, siehe
// scripts/schema.sql) — bereits ausgegebene AP holt das nicht zurück, der
// Kontostand kann dadurch rechnerisch ins Minus laufen.
export async function deleteSessionAction(
  state: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireGM();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Ungültige Session." };

  const deleted = await deleteGameSession(id);
  if (!deleted) return { error: "Session nicht gefunden." };

  revalidatePath("/gm/sessions");
  revalidatePath("/gm/ap");
  revalidatePath("/gm/campaign");
  return { success: "Session zurückgenommen, die Gutschriften wurden storniert." };
}

// Nur Titel und Notizen — die AP-Beträge sind bereits als Buchungen unterwegs
// und werden hier bewusst nicht nachträglich verändert (siehe
// updateGameSessionNotes).
export async function updateSessionAction(
  state: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  await requireGM();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Ungültige Session." };

  const title = String(formData.get("title") ?? "").trim();
  if (title.length > SESSION_TITLE_MAX) {
    return { error: `Titel zu lang (max. ${SESSION_TITLE_MAX} Zeichen).` };
  }
  const notes = String(formData.get("notes") ?? "").trim();
  if (notes.length > SESSION_NOTES_MAX) {
    return { error: `Notizen zu lang (max. ${SESSION_NOTES_MAX} Zeichen).` };
  }

  const updated = await updateGameSessionNotes(id, title, notes);
  if (!updated) return { error: "Session nicht gefunden." };

  revalidatePath("/gm/sessions");
  return { success: "Session gespeichert." };
}

// Logbücher einer Session zuordnen. Sobald mindestens eines daran hängt,
// schreibt setSessionLogbooks den Teilnehmenden automatisch die Logbuch-AP gut
// (einmal je Session und Charakter); fällt das letzte wieder weg, wird die
// Gutschrift zurückgenommen.
export async function setSessionLogbooksAction(
  state: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const user = await requireGM();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Ungültige Session." };

  const logIds = formData.getAll("logIds").map(Number);
  if (logIds.some((logId) => !Number.isInteger(logId))) {
    return { error: "Ungültige Logbuch-Auswahl." };
  }

  await setSessionLogbooks(id, logIds, user.id);

  revalidatePath("/gm/sessions");
  revalidatePath("/gm/ap");

  return {
    success:
      logIds.length > 0
        ? `${logIds.length} Logbuch/Logbücher verknüpft — die Logbuch-AP sind gebucht.`
        : "Keine Logbücher mehr verknüpft — die Logbuch-AP wurden zurückgenommen.",
  };
}
