import { getCharacterListItems } from "@/lib/characters";
import { getAllArchiveEntries } from "@/lib/archive";
import CharactersAndDialogues from "./CharactersAndDialogues";

export const metadata = {
  title: {
    default: "Charaktere",
  },
};

export default async function CharakterePage() {
  const [characters, entries] = await Promise.all([
    getCharacterListItems(),
    getAllArchiveEntries(),
  ]);
  const dialogueEntries = entries.filter((e) => e.category === "dialogue");

  return (
    <CharactersAndDialogues
      pageTitle="Charaktere"
      characters={characters}
      dialogueEntries={dialogueEntries}
      initialTab="characters"
    />
  );
}
