"use server";
import { revalidatePath } from "next/cache";
import { requireGM } from "@/lib/dal";
import { getViewer } from "@/lib/visibility";
import { hasRagConfig } from "@/lib/rag";
import { getTimelineSource } from "@/lib/timelineSources";
import {
  deleteInferredEvent,
  inferEvents,
  saveInferredEvents,
} from "@/lib/timelineInference";
import type { TimelineSourceType } from "@/lib/timelineTypes";
import {
  createManualEvents,
  listCharactersForEvents,
  ManualEventError,
  parseManualEvent,
} from "@/lib/timelineManualEvents";
import { parseTimelineCsv, TimelineCsvError } from "@/lib/timelineCsvImport";

// Die Aktionen der Spielleitung an der Chronologie: CSV-Dateien importieren,
// aus einem Inhalt Ereignisse ableiten lassen und ein gespeichertes Ereignis
// wieder entfernen.
//
// Jede Action prüft ihr Recht selbst über requireGM — eine Server Action ist
// ein öffentlicher Endpunkt, die Sichtbarkeit des Menüpunkts sagt darüber
// nichts.

const SOURCE_TYPES: TimelineSourceType[] = [
  "mission",
  "mission_log",
  "archive_entry",
  "character",
];

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

export async function inferEventsAction(
  state: TimelineActionState,
  formData: FormData,
): Promise<TimelineActionState> {
  const user = await requireGM();

  const sourceType = String(formData.get("sourceType") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!SOURCE_TYPES.includes(sourceType as TimelineSourceType) || !slug) {
    return { error: "Ungültiger Inhalt." };
  }

  if (!hasRagConfig()) {
    return {
      error:
        "Das Ableiten braucht dieselben Zugänge wie der Datenbank-Assistent (OPENAI_API_KEY und CLOUDFLARE_AI_API_TOKEN). Ohne sie bleibt die Chronologie auf die gepflegten Angaben und die Marken im Text beschränkt.",
    };
  }

  const source = await getTimelineSource(
    sourceType as TimelineSourceType,
    slug,
  );
  if (!source) return { error: "Inhalt nicht gefunden." };
  if (source.body.trim() === "") {
    return {
      error: `„${source.title}“ hat keinen Text, aus dem sich etwas ableiten ließe.`,
    };
  }

  let candidates;
  try {
    candidates = await inferEvents(
      {
        sourceType: source.sourceType,
        sourceSlug: source.slug,
        title: source.title,
        body: source.body,
        anchors: source.anchors,
      },
      // Der Zusammenhang wird mit den Rechten der Spielleitung geholt — sie
      // darf ohnehin alles lesen, und die abgeleiteten Ereignisse werden auf
      // der Seite später an der Sichtbarkeit ihres Quell-Inhalts gemessen.
      await getViewer(),
    );
  } catch (err) {
    // Ein Modell- oder Netzfehler ist kein Grund, die Seite abstürzen zu
    // lassen — die Spielleitung soll es einfach noch einmal versuchen können.
    return {
      error: `Das Ableiten ist fehlgeschlagen: ${
        err instanceof Error ? err.message : "unbekannter Fehler"
      }`,
    };
  }

  if (candidates.length === 0) {
    return {
      success: `Aus „${source.title}“ ließ sich kein datierbares Ereignis lesen.`,
    };
  }

  const saved = await saveInferredEvents(
    source.sourceType,
    source.slug,
    candidates,
    user.id,
  );

  revalidatePath("/gm/chronologie");
  revalidatePath("/chronologie");
  return {
    success:
      saved === 1
        ? `1 Ereignis aus „${source.title}“ übernommen.`
        : `${saved} Ereignisse aus „${source.title}“ übernommen.`,
  };
}

export async function deleteEventAction(
  state: TimelineActionState,
  formData: FormData,
): Promise<TimelineActionState> {
  await requireGM();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Ungültiges Ereignis." };

  await deleteInferredEvent(id);
  revalidatePath("/gm/chronologie");
  revalidatePath("/chronologie");
  return { success: "Ereignis entfernt." };
}
