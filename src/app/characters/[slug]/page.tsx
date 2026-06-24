// src/app/characters/[slug]/page.tsx
import { getCharacterBySlug, getLogsByCharacter } from "@/lib/characters";
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

  // Erst Charakter laden, dann parallel Logs dazu
  const character = await getCharacterBySlug(slug);
  if (!character) notFound();

  const logs = await getLogsByCharacter(character.id);

  return (
    <div className="h-[90%]">
      <CharakterDetailPage character={character} logs={logs} />
    </div>
  );
}
