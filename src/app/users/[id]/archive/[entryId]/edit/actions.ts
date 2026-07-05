"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import {
  updateOwnArchiveEntryContent,
  getOwnArchiveEntryForEdit,
} from "@/lib/archive";
import { isArchiveCategory } from "@/lib/archiveFormat";
import { revalidateArchiveEntry } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";
import type { ArchiveCategory } from "@/types/archive";

export interface ArchiveEntryFormState {
  error?: string;
}

export async function updateArchiveEntryAction(
  _state: ArchiveEntryFormState,
  formData: FormData,
): Promise<ArchiveEntryFormState> {
  const session = await verifySession();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect(`/users/${session.userId}`);
  }

  const entryId = Number(formData.get("entryId"));
  if (!Number.isInteger(entryId)) {
    return { error: "Ungültiger Archiv-Eintrag." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Bitte einen Titel angeben." };

  const category = String(formData.get("category") ?? "");
  if (!isArchiveCategory(category) || category === "dialogue") {
    return { error: "Ungültige Kategorie." };
  }

  const tags = [
    ...new Set(
      String(formData.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte einen Inhalt schreiben." };

  // Opt-in "Automatisch verlinken" (AutoLinkCheckbox.tsx) — der Eintrag
  // selbst muss dabei als Autolinking-Ziel ausgeschlossen werden (sonst
  // könnte sein Titel im eigenen Text auf sich selbst verlinken), dafür
  // wird sein aktueller Slug vorab geladen.
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

  const result = await updateOwnArchiveEntryContent(session.userId, entryId, {
    title,
    category: category as Exclude<ArchiveCategory, "dialogue">,
    tags,
    bodyMarkdown,
    contentHtml,
  });
  if (!result) {
    return { error: "Eintrag nicht gefunden oder keine Berechtigung." };
  }

  revalidateArchiveEntry(result.slug);
  redirect(`/users/${session.userId}/content`);
}
