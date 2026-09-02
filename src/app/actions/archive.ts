"use server";
import { getSession } from "@/lib/session";
import {
  updateOwnArchiveEntryBody,
  getOwnArchiveEntryForEdit,
  notifyArchiveEntrySubscribers,
} from "@/lib/archive";
import { revalidateArchiveEntry } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";
import { synopsisExcerpt } from "@/lib/missionFormat";

export interface ArchiveEntryEditState {
  error?: string;
  success?: boolean;
  updatedHtml?: string;
}

// Inline-Bearbeitung des Inhalts direkt auf /archive/[slug]
// (ArchiveEntryEditor) — schlanker als das volle Formular unter
// /user/archive/[entryId]/edit: nur der Fließtext ändert sich,
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
    return { error: "Ungültiger Datenbank-Eintrag." };
  }

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte einen Inhalt schreiben." };

  // Opt-in "Automatisch verlinken" (AutoLinkCheckbox.tsx) — der Eintrag
  // selbst muss dabei als Autolinking-Ziel ausgeschlossen werden, dafür
  // wird sein aktueller Slug vorab geladen (gleiches Prinzip wie
  // updateArchiveEntryAction für das volle Formular).
  let contentHtml: string | undefined;
  if (formData.get("autoLink") === "on") {
    const entry = await getOwnArchiveEntryForEdit(session.userId, entryId);
    const linked = await autoLinkMarkdown(
      bodyMarkdown,
      entry ? { type: "archive", slug: entry.slug } : undefined,
    );
    bodyMarkdown = linked.sourceMd;
    contentHtml = linked.html;
  }

  const result = await updateOwnArchiveEntryBody(
    session.userId,
    entryId,
    bodyMarkdown,
    contentHtml,
  );
  if (!result) {
    return { error: "Eintrag nicht gefunden oder keine Berechtigung." };
  }

  revalidateArchiveEntry(result.slug);
  await notifyArchiveEntrySubscribers({
    entrySlug: result.slug,
    entryTitle: result.title,
    editingUserId: session.userId,
    preview: synopsisExcerpt(bodyMarkdown, 140),
  });

  return { success: true, updatedHtml: result.contentHtml };
}
