"use client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Character } from "@/types/character";
import { MissionLogPreview } from "@/types/missionLog";
import CharacterHero from "./CharacterHero";
import { Viewer } from "@/lib/visibility";

export default function CharakterDetailPage({
  character,
  logs,
  conversationCount,
  viewer,
  owners,
  sourceMarkdown,
  ownColor,
  takenColors,
}: {
  character: Character;
  logs: MissionLogPreview[];
  conversationCount: number;
  viewer: Viewer | null;
  owners: { id: number; name: string }[];
  // Nur gesetzt, wenn viewer === Owner (siehe page.tsx) — Grundlage für den
  // Inline-Bio-Editor in CharacterHero.tsx.
  sourceMarkdown: string | null;
  // Nur gesetzt, wenn viewer === Owner — Grundlage für den Farbwähler
  // (CharacterColorForm) in CharacterHero.tsx.
  ownColor: string | null;
  takenColors: string[];
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
        sourceMarkdown={sourceMarkdown}
        ownColor={ownColor}
        takenColors={takenColors}
      />
    </div>
  );
}
