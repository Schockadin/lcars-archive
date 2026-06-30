"use client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Character } from "@/types/character";
import { MissionLogPreview } from "@/types/missionLog";
import CharacterHero from "./CharacterHero";

export default function CharakterDetailPage({
  character,
  logs,
}: {
  character: Character;
  logs: MissionLogPreview[];
}) {
  usePageMeta(character.name, "characters");

  // Gespräche sind noch nicht modelliert — vorerst Platzhalter (0).
  const conversationCount = 0;

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
