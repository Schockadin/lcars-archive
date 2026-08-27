import { getCharacterListItems } from "@/lib/characters";
import CharacterPage from "./CharacterPage";

export const metadata = {
  title: {
    default: "Charaktere",
  },
};

export default async function CharakterePage() {
  const characters = await getCharacterListItems();
  return <CharacterPage characters={characters} />;
}
