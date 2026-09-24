"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import { deleteStoredTimelineEvent } from "@/lib/timelineStoredEvents";
import {
  createManualEvents,
  listCharactersForEvents,
  ManualEventError,
  parseManualEvent,
} from "@/lib/timelineManualEvents";
import { parseTimelineCsv, TimelineCsvError } from "@/lib/timelineCsvImport";

// Die Aktionen der Spielleitung an der Chronologie: CSV-Dateien importieren
// und ein gespeichertes Ereignis wieder entfernen.
//
// Jede Action prüft ihr Recht selbst über requireGM — eine Server Action ist
// ein öffentlicher Endpunkt, die Sichtbarkeit des Menüpunkts sagt darüber
// nichts.

export interface TimelineActionState {
  error?: string;
  success?: string;
}

const MAX_CSV_BYTES = 1_000_000;
const MAX_CSV_ROWS = 500;

export async function importTimelineCsvAction(
  _state: TimelineActionState,
  formData: FormData,
): Promise<TimelineActionState> {
  const user = await requireGM();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte eine CSV-Datei auswählen." };
  }
  if (file.size > MAX_CSV_BYTES) {
    return { error: "Die CSV-Datei darf höchstens 1 MB groß sein." };
  }

  try {
    const rows = parseTimelineCsv(await file.text());
    if (rows.length === 0) {
      return { error: "Die CSV-Datei enthält keine Ereignisse." };
    }
    if (rows.length > MAX_CSV_ROWS) {
      return {
        error: `Eine CSV-Datei darf höchstens ${MAX_CSV_ROWS} Ereignisse enthalten.`,
      };
    }

    const characters = await listCharactersForEvents();
    const characterIdsByName = new Map<string, number[]>();
    for (const character of characters) {
      const key = character.name.trim().toLocaleLowerCase("de-DE");
      characterIdsByName.set(key, [
        ...(characterIdsByName.get(key) ?? []),
        character.id,
      ]);
    }

    const inputs = rows.map((row) => {
      const characterIds = row.characterNames.map((name) => {
        const matches =
          characterIdsByName.get(name.toLocaleLowerCase("de-DE")) ?? [];
        if (matches.length === 0) {
          throw new TimelineCsvError(
            `Zeile ${row.line}: Die Figur „${name}“ wurde nicht gefunden.`,
          );
        }
        if (matches.length > 1) {
          throw new TimelineCsvError(
            `Zeile ${row.line}: Der Figurenname „${name}“ ist nicht eindeutig.`,
          );
        }
        return String(matches[0]);
      });

      try {
        return parseManualEvent({
          date: row.date,
          title: row.title,
          teaser: row.teaser,
          detail: row.detail,
          category: "other",
          characterIds,
        });
      } catch (error) {
        if (error instanceof ManualEventError) {
          throw new TimelineCsvError(`Zeile ${row.line}: ${error.message}`);
        }
        throw error;
      }
    });

    await createManualEvents(inputs, user.id);
    revalidatePath("/gm/chronologie");
    revalidatePath("/chronologie");
    return {
      success:
        inputs.length === 1
          ? "1 Ereignis importiert."
          : `${inputs.length} Ereignisse importiert.`,
    };
  } catch (error) {
    if (error instanceof TimelineCsvError) return { error: error.message };
    throw error;
  }
}

export async function deleteTimelineEventAction(
  _state: TimelineActionState,
  formData: FormData,
): Promise<TimelineActionState> {
  await requireGM();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Ungültiges Ereignis." };

  await deleteStoredTimelineEvent(id);
  revalidatePath("/gm/chronologie");
  revalidatePath("/chronologie");
  return { success: "Ereignis entfernt." };
}
