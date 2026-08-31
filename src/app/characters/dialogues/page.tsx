import { getAllArchiveEntries } from "@/lib/archive";
import { getCharacterListItems } from "@/lib/characters";
import CharactersAndDialogues from "../CharactersAndDialogues";

export const metadata = {
  title: {
    default: "Gespräche · Charaktere",
  },
};

// Gesprächs-Übersicht, umgezogen aus dem Archiv (vormals /archive?cat=dialogue)
// in den Charaktere-Bereich, dem eigentlichen Bezugspunkt der Gespräche.
// Teilnehmer-Filter per ?participant=<slug> (Link von der
// Charakter-Detailseite, siehe CharacterHero.tsx). Rendert dieselbe
// Zwei-Spalten/Umschalter-Ansicht wie /characters, nur mit der
// Gespräche-Spalte/dem Gespräche-Tab initial aktiv.
export default async function CharacterDialoguesPage({
  searchParams,
}: {
  searchParams: Promise<{ participant?: string }>;
}) {
  const { participant } = await searchParams;
  const [characters, entries] = await Promise.all([
    getCharacterListItems(),
    getAllArchiveEntries(),
  ]);
  const dialogueEntries = entries.filter((e) => e.category === "dialogue");

  return (
    <CharactersAndDialogues
      pageTitle="Gespräche"
      characters={characters}
      dialogueEntries={dialogueEntries}
      initialTab="dialogues"
      initialParticipant={participant ?? null}
    />
  );
}
