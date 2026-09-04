"use client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Character } from "@/types/character";
import { MissionLogPreview } from "@/types/missionLog";
import CharacterHero from "./CharacterHero";
import type { Viewer } from "@/lib/visibility";
import type { FollowState } from "@/app/actions/follows";
import MentionsSection from "@/app/_shared/MentionsSection";
import type { Mention } from "@/lib/mentions";
import RelationsSection from "@/app/_shared/RelationsSection";
import type { Relation } from "@/lib/relations";

export default function CharakterDetailPage({
  character,
  logs,
  conversationCount,
  viewer,
  owners,
  displayAge,
  sourceMarkdown,
  followInitialState,
  mentions,
  relations,
}: {
  character: Character;
  logs: MissionLogPreview[];
  conversationCount: number;
  viewer: Viewer | null;
  owners: { id: number; name: string }[];
  // Aus Geburtsdatum + Ingame-Jahr abgeleitetes Alter (Fallback: metadata.age),
  // serverseitig berechnet (siehe page.tsx) — CharacterHero ist eine Client
  // Component und kann das server-only campaign.ts nicht selbst importieren.
  displayAge: number | null;
  // Nur gesetzt, wenn viewer === Owner (siehe page.tsx) — Grundlage für den
  // Inline-Bio-Editor in CharacterHero.tsx.
  sourceMarkdown: string | null;
  followInitialState?: FollowState;
  // Eingehende Verweise (siehe src/lib/mentions.ts).
  mentions: Mention[];
  // Verbindungen zu anderen Figuren (siehe src/lib/relations.ts).
  relations: Relation[];
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
        displayAge={displayAge}
        sourceMarkdown={sourceMarkdown}
        followInitialState={followInitialState}
      />
      <div className="lcars-text lcars-wide-column mt-[16px] flex flex-col gap-[16px]">
        <RelationsSection relations={relations} />
        <MentionsSection mentions={mentions} />
      </div>
    </div>
  );
}
