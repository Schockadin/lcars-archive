"use server";
import { redirect } from "next/navigation";
import { verifySession, requireMatchingFormUserId } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import {
  createArchiveEntry,
  updateOwnArchiveEntryContent,
  getOwnArchiveEntryForEdit,
  notifyArchiveEntrySubscribers,
} from "@/lib/archive";
import { isArchiveCategory } from "@/lib/archiveFormat";
import { revalidateArchiveEntry } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";
import { notifyContentChange } from "@/lib/follows";
import { getBaseUrl } from "@/lib/http";
import { synopsisExcerpt } from "@/lib/missionFormat";
import { parseList } from "@/lib/formParsing";
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
  requireMatchingFormUserId(formData, session);

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

  const tags = parseList(formData.get("tags"));

  const summary = String(formData.get("summary") ?? "").trim() || null;

  // Im Entwurf-Modus (ContentEditor.tsx-Checkbox) ist nur der Inhalt
  // optional — siehe canViewDraft-Kommentar in src/lib/visibility.ts.
  const isDraft = formData.get("isDraft") === "on";

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown && !isDraft) {
    return { error: "Bitte einen Inhalt schreiben." };
  }

  // Opt-in "Automatisch verlinken" (AutoLinkCheckbox.tsx) — Selbstausschluss
  // nur beim Bearbeiten nötig, ein neuer Eintrag existiert noch nicht in der
  // DB und kann deshalb nicht als eigenes Autolinking-Ziel erscheinen.
  let contentHtml: string | undefined;
  if (bodyMarkdown && formData.get("autoLink") === "on") {
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
      isDraft,
      contentHtml,
    });
    if (!result) {
      return { error: "Eintrag nicht gefunden oder keine Berechtigung." };
    }
    revalidateArchiveEntry(result.slug);

    // Solange der Eintrag ein Entwurf bleibt, sieht ihn außer dem Owner
    // niemand — keine Benachrichtigung. Beim Veröffentlichen (wasDraft true,
    // isDraft jetzt false) gilt das wie ein Neuanlegen ("created" statt
    // "updated"), siehe notifyMissionParticipants in
    // missions/_shared/contentAction.ts für dieselbe Begründung.
    if (!isDraft) {
      const contentUrl = `${await getBaseUrl()}/archive/${result.slug}`;
      const preview = synopsisExcerpt(bodyMarkdown, 140);
      const author = await getUserById(session.userId);

      if (result.wasDraft) {
        await notifyContentChange({
          contentType: "archive_entry",
          event: "created",
          authorUserId: session.userId,
          authorName: author?.name ?? "Unbekannt",
          contentTypeLabel: "einen neuen Archiv-Eintrag",
          contentTitle: title,
          contentUrl,
          preview,
          notifyPublic: result.visibility === "public",
        });
      } else {
        await notifyArchiveEntrySubscribers({
          entrySlug: result.slug,
          entryTitle: title,
          editingUserId: session.userId,
          preview,
        });
        await notifyContentChange({
          contentType: "archive_entry",
          event: "updated",
          authorUserId: session.userId,
          authorName: author?.name ?? "Unbekannt",
          contentTypeLabel: "einen Archiv-Eintrag",
          contentTitle: title,
          contentUrl,
          preview,
          notifyPublic: result.visibility === "public",
        });
      }
    }
    redirect("/user/content");
  }

  const result = await createArchiveEntry({
    title,
    category: categoryValue,
    tags,
    summary,
    attributeValues,
    referenceValues,
    bodyMarkdown,
    isDraft,
    contentHtml,
    ownerUserId: session.userId,
  });
  revalidateArchiveEntry(result.slug);

  if (!isDraft) {
    const contentUrl = `${await getBaseUrl()}/archive/${result.slug}`;
    const preview = synopsisExcerpt(bodyMarkdown, 140);
    const author = await getUserById(session.userId);

    // Archiv-Einträge sind standardmäßig public (siehe scripts/schema.sql) —
    // ein neu angelegter Eintrag benachrichtigt die Abonnenten des
    // Erstellers deshalb ungegated (keine separate visibility im
    // createArchiveEntry-Result).
    await notifyContentChange({
      contentType: "archive_entry",
      event: "created",
      authorUserId: session.userId,
      authorName: author?.name ?? "Unbekannt",
      contentTypeLabel: "einen neuen Archiv-Eintrag",
      contentTitle: title,
      contentUrl,
      preview,
      notifyPublic: true,
    });
  }
  redirect(`/archive/${result.slug}`);
}
