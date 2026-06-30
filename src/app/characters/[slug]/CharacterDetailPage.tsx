"use client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Character } from "@/types/character";
import { MissionLogPreview } from "@/types/missionLog";
import CharacterHero from "./CharacterHero";

export default function CharakterDetailPage({
  character,
  logs,
  conversationCount,
}: {
  character: Character;
  logs: MissionLogPreview[];
  conversationCount: number;
}) {
  usePageMeta(character.name, "characters");

  return (
    <div className="h-full">
      <CharacterHero
        character={character}
        logCount={logs.length}
        conversationCount={conversationCount}
      />
    </div>
  );
}
