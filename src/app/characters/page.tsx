import { getAllCharacters } from "@/lib/characters";
import CharacterPage from "./CharacterPage";

export const metadata = {
  title: {
    default: "Charaktere",
  },
};

export default async function CharakterePage() {
  const characters = await getAllCharacters();
  return <CharacterPage characters={characters} />;
}
