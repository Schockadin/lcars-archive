"use server";
import { getSession } from "@/lib/session";
import { updateOwnArchiveEntryBody } from "@/lib/archive";
import { revalidateArchiveEntry } from "@/lib/revalidate";

export interface ArchiveEntryEditState {
  error?: string;
  success?: boolean;
  updatedHtml?: string;
}

// Inline-Bearbeitung des Inhalts direkt auf /archive/[slug]
// (ArchiveEntryEditor) — schlanker als das volle Formular unter
// /users/[id]/archive/[entryId]/edit: nur der Fließtext ändert sich,
// Titel/Kategorie/Tags bleiben unangetastet. Owner-only (anders als
// updateMissionSynopsisAction, das gm/admin-gated ist) —
// updateOwnArchiveEntryBody scoped die Schreibung selbst auf
// owner_user_id, ein Nicht-Owner trifft 0 Zeilen.
export async function updateOwnArchiveEntryAction(
  _state: ArchiveEntryEditState,
  formData: FormData,
): Promise<ArchiveEntryEditState> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  const entryId = Number(formData.get("entryId"));
  if (!Number.isInteger(entryId)) {
    return { error: "Ungültiger Archiv-Eintrag." };
  }

  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte einen Inhalt schreiben." };

  const result = await updateOwnArchiveEntryBody(
    session.userId,
    entryId,
    bodyMarkdown,
  );
  if (!result) {
    return { error: "Eintrag nicht gefunden oder keine Berechtigung." };
  }

  revalidateArchiveEntry(result.slug);

  return { success: true, updatedHtml: result.contentHtml };
}
