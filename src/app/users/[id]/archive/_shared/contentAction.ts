"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import {
  createArchiveEntry,
  updateOwnArchiveEntryContent,
  getOwnArchiveEntryForEdit,
} from "@/lib/archive";
import { isArchiveCategory } from "@/lib/archiveFormat";
import { revalidateArchiveEntry } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";
import {
  getAttributeFields,
  getReferenceFields,
} from "@/lib/archiveMetadataFields";
import type { ArchiveCategory } from "@/types/archive";

// Liest alle Metadaten-Felder (Attribute + Verweise) für die gewählte
// Kategorie aus dem FormData — welche Felder das sind, hängt von der
// Kategorie ab (siehe archiveMetadataFields.ts).
function readMetadataValues(
  formData: FormData,
  category: Exclude<ArchiveCategory, "dialogue">,
): { attributeValues: Record<string, string>; referenceValues: Record<string, string> } {
  const attributeValues: Record<string, string> = {};
  for (const field of getAttributeFields(category)) {
    attributeValues[field.key] = String(formData.get(field.key) ?? "").trim();
  }
  const referenceValues: Record<string, string> = {};
  for (const field of getReferenceFields(category)) {
    referenceValues[field.key] = String(formData.get(field.key) ?? "").trim();
  }
  return { attributeValues, referenceValues };
}

export interface ArchiveEntryFormState {
  error?: string;
}

// Vereint createArchiveEntryAction + updateArchiveEntryAction (vorher
// new/actions.ts + [entryId]/edit/actions.ts) zu einer Action für
// ContentEditor — Branch auf Vorhandensein von entryId statt zwei fast
// identischer Funktionen.
export async function archiveEntryAction(
  _state: ArchiveEntryFormState,
  formData: FormData,
): Promise<ArchiveEntryFormState> {
  const session = await verifySession();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect(`/users/${session.userId}`);
  }

  const entryIdRaw = formData.get("entryId");
  const isEdit = entryIdRaw != null && entryIdRaw !== "";
  const entryId = isEdit ? Number(entryIdRaw) : null;
  if (isEdit && !Number.isInteger(entryId)) {
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

  const summary = String(formData.get("summary") ?? "").trim() || null;

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte einen Inhalt schreiben." };

  // Opt-in "Automatisch verlinken" (AutoLinkCheckbox.tsx) — Selbstausschluss
  // nur beim Bearbeiten nötig, ein neuer Eintrag existiert noch nicht in der
  // DB und kann deshalb nicht als eigenes Autolinking-Ziel erscheinen.
  let contentHtml: string | undefined;
  if (formData.get("autoLink") === "on") {
    const selfExclusion = isEdit
      ? await getOwnArchiveEntryForEdit(session.userId, entryId!)
      : null;
    const linked = await autoLinkMarkdown(
      bodyMarkdown,
      selfExclusion ? { type: "archive", slug: selfExclusion.slug } : undefined,
    );
    bodyMarkdown = linked.sourceMd;
    contentHtml = linked.html;
  }

  const categoryValue = category as Exclude<ArchiveCategory, "dialogue">;
  const { attributeValues, referenceValues } = readMetadataValues(formData, categoryValue);

  if (isEdit) {
    const result = await updateOwnArchiveEntryContent(session.userId, entryId!, {
      title,
      category: categoryValue,
      tags,
      summary,
      attributeValues,
      referenceValues,
      bodyMarkdown,
      contentHtml,
    });
    if (!result) {
      return { error: "Eintrag nicht gefunden oder keine Berechtigung." };
    }
    revalidateArchiveEntry(result.slug);
    redirect(`/users/${session.userId}/content`);
  }

  const result = await createArchiveEntry({
    title,
    category: categoryValue,
    tags,
    summary,
    attributeValues,
    referenceValues,
    bodyMarkdown,
    contentHtml,
    ownerUserId: session.userId,
  });
  revalidateArchiveEntry(result.slug);
  redirect(`/archive/${result.slug}`);
}
