"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { updateDialogueMetadata } from "@/lib/dialogues";
import { revalidateArchiveEntry } from "@/lib/revalidate";
import { parseList } from "@/lib/formParsing";

export interface DialogueMetaFormState {
  error?: string;
}

// Admin-only: bearbeitet die Metadaten eines Gesprächs (Titel, Datum,
// Schauplatz, Ort, Tags) — NICHT den Gesprächsverlauf. Löschen fremder
// Nachrichten/Owner-Wechsel bleiben separaten Admin-Werkzeugen vorbehalten
// (siehe changelog 1.15).
export async function updateDialogueMetadataAction(
  _state: DialogueMetaFormState,
  formData: FormData,
): Promise<DialogueMetaFormState> {
  await requireAdmin();

  const idRaw = formData.get("dialogueId");
  const id = Number(idRaw);
  if (!Number.isInteger(id)) return { error: "Ungültiges Gespräch." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Bitte einen Titel angeben." };

  const setting = String(formData.get("setting") ?? "").trim() || null;
  const locationSlug =
    String(formData.get("locationSlug") ?? "").trim() || null;

  const logDateRaw = String(formData.get("logDate") ?? "").trim();
  let logDate: string | null = null;
  if (logDateRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(logDateRaw)) {
      return { error: "Ungültiges Datum." };
    }
    logDate = logDateRaw;
  }

  const tags = parseList(formData.get("tags"));

  const result = await updateDialogueMetadata(id, {
    title,
    setting,
    logDate,
    locationSlug,
    tags,
  });
  if (!result) return { error: "Gespräch nicht gefunden." };

  revalidateArchiveEntry(result.slug);
  redirect("/admin/dialogues");
}
