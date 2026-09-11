import { getCharacterListItems } from "@/lib/characters";
import PageMeta from "@/components/PageMeta";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import CharacterPage from "./CharacterPage";

export const metadata = {
  title: {
    default: "Charaktere",
  },
};

// Nur noch die Charakterliste: die Gespräche sind aus dem Charaktere-Bereich
// in die Chronologie umgezogen (Ereignisart „Gespräch", siehe
// dialoguesHref in contentRoutes.ts) — dort stehen sie zwischen den übrigen
// datierten Inhalten der Kampagne, statt in einer zweiten Spalte daneben.
export default async function CharakterePage() {
  const [characters, viewer] = await Promise.all([
    getCharacterListItems(),
    getViewer(),
  ]);
  // Ohne das Recht „content.create" (Gast-Accounts, Ausgeloggte) führt der
  // „+"-Knopf nur auf eine Absage — dann gar nicht erst anbieten, wie in der
  // Datenbank.
  const canCreate = viewerHasPermission(viewer, "content.create");

  return (
    <>
      <PageMeta title="Charaktere" section="characters" />
      <CharacterPage characters={characters} canCreate={canCreate} />
    </>
  );
}
