import { getAllArchiveEntries } from "@/lib/archive";
import { CATEGORY_CONFIG, isArchiveCategory } from "@/lib/archiveFormat";
import PageMeta from "@/components/PageMeta";
import ArchiveEntryList from "./ArchiveEntryList";
import DialogueList from "./DialogueList";

export const metadata = {
  title: {
    default: "Archiv",
  },
};

// Rechte Spalte der Archiv-Übersicht: ohne ?cat= ein Hinweis, mit gültiger
// Kategorie die Liste ihrer Einträge (als Akten-Karten).
export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; participant?: string }>;
}) {
  const { cat, participant } = await searchParams;
  const entries = await getAllArchiveEntries();

  const category = cat && isArchiveCategory(cat) ? cat : null;
  const list = category ? entries.filter((e) => e.category === category) : [];

  return (
    <>
      <PageMeta title="Archiv" section="archive" />

      {category ? (
        <div>
          <h1 className="lcars-data-row-heading">
            {`${CATEGORY_CONFIG[category].plural}`}
          </h1>
          {list.length === 0 ? (
            <p className="lcars-empty-state">
              Keine Einträge in dieser Kategorie.
            </p>
          ) : category === "dialogue" ? (
            // Gespräche: Teilnehmer-Filter + Sortierung nach id. Der Filter
            // kann per ?participant=<slug> vorbelegt werden (Link von der
            // Charakter-Detailseite).
            <DialogueList
              key={participant ?? "all"}
              entries={list}
              initialParticipant={participant ?? null}
            />
          ) : (
            <ArchiveEntryList entries={list} />
          )}
        </div>
      ) : (
        <div className="archive-placeholder">
          {/* <h1 className="lcars-data-row-heading">Archiv</h1>
          <p className="lcars-eyebrow">Enzyklopädie der bekannten Welt</p> */}
        </div>
      )}
    </>
  );
}
