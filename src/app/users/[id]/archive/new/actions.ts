"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { createArchiveEntry } from "@/lib/archive";
import { isArchiveCategory } from "@/lib/archiveFormat";
import { revalidateArchiveEntry } from "@/lib/revalidate";
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

  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte einen Inhalt schreiben." };

  const result = await createArchiveEntry({
    title,
    category: category as Exclude<ArchiveCategory, "dialogue">,
    tags,
    bodyMarkdown,
    ownerUserId: session.userId,
  });

  revalidateArchiveEntry(result.slug);
  redirect(`/users/${session.userId}/content`);
}
