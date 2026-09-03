import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getArchiveEntryBySlug } from "@/lib/archive";
import { archiveTitle } from "@/lib/archiveFormat";
import { stripHtml } from "@/lib/missionFormat";
import PageMeta from "@/components/PageMeta";
import { LcarsReadingModeToggle } from "@/components/lcars";
import DialogueHeader from "@/components/DialogueHeader";
import DeleteDialogueButton from "@/components/DeleteDialogueButton";
import { getDialogueMessages } from "@/lib/dialogues";
import {
  getViewer,
  canView,
  canViewDraft,
  viewerHasPermission,
} from "@/lib/visibility";
import { getDialogueViewPreference } from "@/lib/users";
import MarkNewsSeen from "@/app/_shared/MarkNewsSeen";
import DialogueContentView from "./DialogueContentView";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const entry = await getArchiveEntryBySlug(slug);
  if (!entry || entry.category !== "dialogue") {
    return { title: "Nicht gefunden · Neo Archive" };
  }

  // Offene Gespräche: Zugriff wird auf /dialogues/<slug> per Teilnehmer-Check
  // entschieden — Metadaten dafür nicht zusätzlich blocken.
  const viewerForMeta = await getViewer();
  const visible =
    (entry.visibility === "public" ||
      entry.dialogue_open ||
      canView(entry.visibility, entry.ownerUserId, viewerForMeta)) &&
    canViewDraft(entry.isDraft, entry.ownerUserId, viewerForMeta);
  if (!visible) return { title: "Nicht gefunden · Neo Archive" };

  const desc = entry.metadata.summary ?? stripHtml(entry.content);
  // Kein erzwungenes noindex: öffentliche abgeschlossene Gespräche waren auch
  // unter /archive/<slug> indexierbar — dieses Ziel übernimmt ihr Platz.
  return {
    title: `${archiveTitle(entry)} · Gespräche · Neo Archive`,
    description: desc.slice(0, 160) || undefined,
  };
}

// Abgeschlossenes Gespräch als eigenständiger Inhalt. Gespräche sind
// Datenbank-Einträge der Kategorie „dialogue"; ihr Zuhause ist der
// Charaktere-Bereich (siehe /characters/dialogues), nicht die generische
// Datenbank-Detailseite. Offene Gespräche leben unter /dialogues/<slug>
// (Formular, Abschluss, Teilnehmer-Gate).
export default async function CharacterDialoguePage({ params }: Props) {
  const { slug } = await params;
  const [entry, viewer] = await Promise.all([
    getArchiveEntryBySlug(slug),
    getViewer(),
  ]);
  if (!entry || entry.category !== "dialogue") notFound();

  // Offenes Gespräch → Spielansicht. Der Teilnehmer-Gate dort ist die richtige
  // Zugriffsprüfung (jeder Teilnehmer, nicht nur der Ersteller).
  if (entry.dialogue_open) redirect(`/dialogues/${entry.slug}`);

  if (
    entry.visibility !== "public" &&
    !canView(entry.visibility, entry.ownerUserId, viewer)
  ) {
    notFound();
  }
  if (!canViewDraft(entry.isDraft, entry.ownerUserId, viewer)) notFound();

  const [messages, flowingTextPreferred] = await Promise.all([
    getDialogueMessages(entry.id),
    viewer ? getDialogueViewPreference(viewer.userId) : Promise.resolve(true),
  ]);

  const title = archiveTitle(entry);

  return (
    <article className="archive-entry">
      <PageMeta title={title} section="archive" />
      <MarkNewsSeen type="archive_entry" slug={entry.slug} />
      <LcarsReadingModeToggle />

      <DialogueHeader
        title={title}
        participants={entry.metadata.participants}
        location={entry.metadata.location}
        logDate={entry.metadata.logDate}
      />

      <DialogueContentView
        entry={entry}
        viewer={viewer}
        messages={messages}
        flowingTextPreferred={flowingTextPreferred}
        canModerate={viewerHasPermission(viewer, "dialogues.moderate")}
      />

      {viewerHasPermission(viewer, "dialogues.moderate") && (
        <div className="flex flex-wrap items-center gap-[8px]">
          {/* Metadaten (Titel/Datum/Ort/Tags) bearbeiten — nicht der
              Gesprächsverlauf. */}
          <Link
            href={`/gm/dialogues/${entry.slug}/edit`}
            className="lcars-pill-btn--outline"
          >
            Metadaten bearbeiten
          </Link>
          <DeleteDialogueButton entrySlug={entry.slug} />
        </div>
      )}
    </article>
  );
}
