import { getAllArchiveEntries } from "@/lib/archive";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import PageMeta from "@/components/PageMeta";
import DialogueList from "./DialogueList";

export const metadata = {
  title: {
    default: "Gespräche · Charaktere",
  },
};

// Gesprächs-Übersicht, umgezogen aus dem Archiv (vormals /archive?cat=dialogue)
// in den Charaktere-Bereich, dem eigentlichen Bezugspunkt der Gespräche.
// Teilnehmer-Filter per ?participant=<slug> (Link von der
// Charakter-Detailseite, siehe CharacterHero.tsx).
export default async function CharacterDialoguesPage({
  searchParams,
}: {
  searchParams: Promise<{ participant?: string }>;
}) {
  const { participant } = await searchParams;
  const entries = await getAllArchiveEntries();
  const list = entries.filter((e) => e.category === "dialogue");

  return (
    <div className="w-full max-w-[640px]">
      <PageMeta title="Gespräche" section="characters" />
      <h1 className="lcars-data-row-heading">
        {CATEGORY_CONFIG.dialogue.plural}
      </h1>
      {list.length === 0 ? (
        <p className="lcars-empty-state">Keine Einträge in dieser Kategorie.</p>
      ) : (
        <DialogueList
          key={participant ?? "all"}
          entries={list}
          initialParticipant={participant ?? null}
        />
      )}
    </div>
  );
}
