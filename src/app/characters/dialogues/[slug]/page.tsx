import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getArchiveEntryBySlug } from "@/lib/archive";
import { archiveTitle } from "@/lib/archiveFormat";
import { stripHtml } from "@/lib/missionFormat";
import PageMeta from "@/components/PageMeta";
import { LcarsReadingModeToggle } from "@/components/lcars";
import DialogueHeader from "@/components/DialogueHeader";
import DeleteDialogueButton from "@/components/DeleteDialogueButton";
import ShareMenu from "@/components/ShareMenu";
import { getDialogueMessages } from "@/lib/dialogues";
import {
  getViewer,
  canView,
  viewerHasPermission,
} from "@/lib/visibility";
import { getDialogueViewPreference } from "@/lib/users";
import MarkNewsSeen from "@/app/_shared/MarkNewsSeen";
import DialogueContentView from "./DialogueContentView";
import { dialogueHref, dialoguesHref } from "@/lib/contentRoutes";

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
    entry.dialogue_open ||
    canView(entry.isDraft, entry.ownerUserId, viewerForMeta);
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
  if (entry.dialogue_open) redirect(dialogueHref(entry.slug));

  if (!canView(entry.isDraft, entry.ownerUserId, viewer)) notFound();

  const [messages, flowingTextPreferred] = await Promise.all([
    getDialogueMessages(entry.id),
    viewer ? getDialogueViewPreference(viewer.userId) : Promise.resolve(true),
  ]);

  const title = archiveTitle(entry);
  const canModerateDialogue = viewerHasPermission(viewer, "dialogues.moderate");

  return (
    <article className="archive-entry">
      <PageMeta title={title} section="archive" />
      <MarkNewsSeen type="archive_entry" slug={entry.slug} />

      {/* Zurück-Knopf oben links, der Lesemodus-Icon darunter (nur mobil
          sichtbar) — beide linksbündig gestapelt. */}
      <div className="flex flex-col items-start gap-[8px]">
        {/* Die Gesprächs-Übersicht ist die Chronologie (Ereignisart
            „Gespräch"); die frühere Seite /characters/dialogues gibt es nicht
            mehr — der Link lief ins Leere. */}
        <Link href={dialoguesHref()} className="lcars-back-link">
          ‹ Gespräche
        </Link>
        <LcarsReadingModeToggle />
      </div>

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
        canModerate={canModerateDialogue}
      />

      {/* Die Leiste unter dem Verlauf. Seit hier auch Teilen/Export steht,
          sieht sie jeder Betrachter (vorher nur die Moderation) — deshalb ein
          eigener Abstand nach oben, statt bündig am letzten Absatz des
          Gesprächs zu kleben. */}
      <div className="mt-[16px] flex flex-wrap items-center gap-[8px]">
        {/* Teilen/Export wie bei jedem anderen Inhalt (Datenbank-Eintrag,
            Mission, Missionslog, Charakter): ein abgeschlossenes Gespräch IST
            ein Datenbank-Eintrag der Kategorie „dialogue", der Export-Typ ist
            deshalb archive_entry — loadArchiveEntryExport (contentExport.ts)
            baut daraus den Gesprächsverlauf als Markdown bzw. PDF. Für alle
            sichtbar, nicht nur für die Moderation: Wer die Seite sehen darf,
            darf sie auch teilen und exportieren (die Export-Route prüft
            dieselbe Sichtbarkeit noch einmal selbst). */}
        <ShareMenu
          title={title}
          exportType="archive_entry"
          exportSlug={entry.slug}
        />
        {canModerateDialogue && (
          <>
            {/* Metadaten (Titel/Datum/Ort/Tags) bearbeiten — nicht der
                Gesprächsverlauf. */}
            <Link
              href={`/gm/dialogues/${entry.slug}/edit`}
              className="lcars-pill-btn--outline"
            >
              Metadaten bearbeiten
            </Link>
            <DeleteDialogueButton entrySlug={entry.slug} />
          </>
        )}
      </div>
    </article>
  );
}
