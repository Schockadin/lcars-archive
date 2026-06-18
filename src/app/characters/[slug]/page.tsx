import { getCharacterBySlug } from "@/lib/characters";
import { notFound } from "next/navigation";
import CharakterDetailPage from "./CharacterDetailPage";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);

  return {
    title: character
      ? `${character.name} · Neo Archive`
      : "Nicht gefunden · Neo Archive",
  };
}

export default async function CharakterPage({ params }: Props) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);

  if (!character) notFound();

  return <CharakterDetailPage character={character} />;
}
