"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { createArchiveEntry } from "@/lib/archive";
import { isArchiveCategory } from "@/lib/archiveFormat";
import { revalidateArchiveEntry } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";
import type { ArchiveCategory } from "@/types/archive";

export interface ArchiveEntryFormState {
  error?: string;
}

// Jeder eingeloggte User darf Archiv-Einträge anlegen (anders als Missionen,
// die gm/admin-only sind) — hier reicht deshalb der reine Identitätscheck,
// keine Rollenprüfung.
export async function createArchiveEntryAction(
  _state: ArchiveEntryFormState,
  formData: FormData,
): Promise<ArchiveEntryFormState> {
  const session = await verifySession();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect(`/users/${session.userId}`);
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

  // Opt-in "Automatisch verlinken" (AutoLinkCheckbox.tsx) — kein
  // Selbst-Ausschluss nötig, der neue Eintrag existiert noch nicht in der
  // DB und kann deshalb nicht als eigenes Autolinking-Ziel erscheinen.
  let contentHtml: string | undefined;
  if (formData.get("autoLink") === "on") {
    const linked = await autoLinkMarkdown(bodyMarkdown);
    bodyMarkdown = linked.sourceMd;
    contentHtml = linked.html;
  }

  const result = await createArchiveEntry({
    title,
    category: category as Exclude<ArchiveCategory, "dialogue">,
    tags,
    bodyMarkdown,
    contentHtml,
    ownerUserId: session.userId,
  });

  revalidateArchiveEntry(result.slug);
  redirect(`/archive/${result.slug}`);
}
