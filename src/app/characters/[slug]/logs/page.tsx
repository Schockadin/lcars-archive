// src/app/characters/[slug]/logs/page.tsx
import {
  getAllCharacters,
  getCharacterBySlug,
  getLogsByCharacter,
} from "@/lib/characters";
import { notFound } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import CrumbLabel from "@/components/CrumbLabel";
import CharacterLogList from "./CharacterLogList";

interface Props {
  params: Promise<{ slug: string }>;
}

// Bekannte Charaktere zur Build-Zeit vorrendern; neue Slugs on-demand.
export async function generateStaticParams() {
  const characters = await getAllCharacters();
  return characters.map((character) => ({ slug: character.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  return {
    title: character
      ? `Logs · ${character.name} · Neo Archive`
      : "Nicht gefunden · Neo Archive",
  };
}

export default async function CharacterLogsPage({ params }: Props) {
  const { slug } = await params;

  const character = await getCharacterBySlug(slug);
  if (!character) notFound();

  const logs = await getLogsByCharacter(character.id);

  return (
    <div className="w-full max-w-[640px]">
      <PageMeta title={character.name} section="characters" />
      {/* Breadcrumb-Override für das Slug-Segment; "logs" wird automatisch
          zu "Logs" formatiert. */}
      <CrumbLabel slug={character.slug} label={character.name} />
      <CharacterLogList
        characterName={character.name}
        characterSlug={character.slug}
        logs={logs}
      />
    </div>
  );
}
