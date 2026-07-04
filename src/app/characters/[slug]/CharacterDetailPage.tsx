"use client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Character } from "@/types/character";
import { MissionLogPreview } from "@/types/missionLog";
import CharacterHero from "./CharacterHero";
import { Viewer } from "@/lib/visibility";
import { UserWithCharacters } from "@/lib/users";

export default function CharakterDetailPage({
  character,
  logs,
  conversationCount,
  viewer,
  owners,
}: {
  character: Character;
  logs: MissionLogPreview[];
  conversationCount: number;
  viewer: Viewer | null;
  owners: UserWithCharacters[];
}) {
  usePageMeta(character.name, "characters");

  return (
    <div className="h-full">
      <CharacterHero
        character={character}
        logCount={logs.length}
        conversationCount={conversationCount}
        viewer={viewer}
        owners={owners}
      />
    </div>
  );
}
