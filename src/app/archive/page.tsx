import { redirect } from "next/navigation";
import { getAllArchiveEntries } from "@/lib/archive";
import { isArchiveCategory } from "@/lib/archiveFormat";
import PageMeta from "@/components/PageMeta";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import { dialoguesHref } from "@/lib/contentRoutes";
import ArchiveEntryList from "./ArchiveEntryList";

export const metadata = {
  title: {
    default: "Datenbank",
  },
};

// Die Datenbank ist — wie die Chronologie — zuerst eine vollständige
// Übersicht. Kategorien bleiben als teilbare ?cat=-Auswahl erhalten, die
// eigentliche Filterung läuft aber im Browser ohne neuen Server-Request.
export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; participant?: string }>;
}) {
  const { cat, participant } = await searchParams;

  // Ein Gespräch eines bestimmten Teilnehmers sucht man nicht im Alphabet,
  // sondern in der Chronologie: dort gibt es den Personenfilter. Der alte
  // ?participant=<slug> lässt sich dort nicht weiterverwenden (gefiltert wird
  // über den Namen), also führt der Link auf die Gespräche insgesamt. Ohne
  // Teilnehmer bleibt „Gespräche" eine Kategorie der Datenbank wie jede
  // andere.
  if (cat === "dialogue" && participant) {
    redirect(dialoguesHref());
  }

  const [entries, viewer] = await Promise.all([
    getAllArchiveEntries(),
    getViewer(),
  ]);
  const initialCategory = cat && isArchiveCategory(cat) ? cat : null;
  const canCreate = viewerHasPermission(viewer, "content.create");
  const canAutoLink = viewerHasPermission(viewer, "content.autolink_tools");

  return (
    <>
      <PageMeta title="Datenbank" section="archive" />
      <div className="lcars-wide-column">
        <h1 className="lcars-data-row-heading">Datenbank</h1>
        <p className="lcars-eyebrow mb-2">Enzyklopädie der bekannten Welt</p>
        <ArchiveEntryList
          key={initialCategory ?? "all"}
          entries={entries}
          initialCategory={initialCategory}
          canCreate={canCreate}
          userId={viewer?.userId}
          canAutoLink={canAutoLink}
        />
      </div>
    </>
  );
}
