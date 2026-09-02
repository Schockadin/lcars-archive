// src/app/characters/[slug]/logs/page.tsx
import { getCharacterBySlug, getLogsByCharacter } from "@/lib/characters";
import { notFound } from "next/navigation";
import { getViewer, canView } from "@/lib/visibility";
import PageMeta from "@/components/PageMeta";
import CharacterLogList from "./CharacterLogList";

interface Props {
  params: Promise<{ slug: string }>;
}


export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  const visible =
    character &&
    (character.visibility === "public" ||
      canView(character.visibility, character.player_id, await getViewer()));
  return {
    title: visible
      ? `Logs · ${character.name} · Neo Archive`
      : "Nicht gefunden · Neo Archive",
  };
}

export default async function CharacterLogsPage({ params }: Props) {
  const { slug } = await params;

  // Charakter und Betrachter parallel laden (getViewer liest nur die Session,
  // nicht den Charakter) — spart die Round-Trip-Latenz gegenüber dem früheren
  // sequenziellen Nachladen des Betrachters.
  const [character, viewer] = await Promise.all([
    getCharacterBySlug(slug),
    getViewer(),
  ]);
  if (!character) notFound();

  if (
    character.visibility !== "public" &&
    !canView(character.visibility, character.player_id, viewer)
  ) {
    notFound();
  }

  const logs = await getLogsByCharacter(character.id);

  return (
    <div className="w-full max-w-[640px]">
      <PageMeta title={character.name} section="characters" />
      <CharacterLogList
        characterName={character.name}
        characterSlug={character.slug}
        logs={logs}
      />
    </div>
  );
}
