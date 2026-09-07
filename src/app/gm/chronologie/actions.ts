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

// Die beiden Aktionen der Spielleitung an der Chronologie: aus einem Inhalt
// Ereignisse ableiten lassen und ein abgeleitetes Ereignis wieder entfernen.
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

  const source = await getTimelineSource(sourceType as TimelineSourceType, slug);
  if (!source) return { error: "Inhalt nicht gefunden." };
  if (source.body.trim() === "") {
    return { error: `„${source.title}“ hat keinen Text, aus dem sich etwas ableiten ließe.` };
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
