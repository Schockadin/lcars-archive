"use client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Character } from "@/types/character";
import CharacterHero from "./CharacterHero";
import type { Viewer } from "@/lib/visibility";
import type { FollowState } from "@/app/actions/follows";
import MentionsSection from "@/app/_shared/MentionsSection";
import type { Mention } from "@/lib/mentions";
import RelationsSection from "@/app/_shared/RelationsSection";
import type { Relation } from "@/lib/relations";
import NotesPanel from "@/app/_shared/NotesPanel";
import type { ContentNote } from "@/lib/contentNotes";
import { characterHref } from "@/lib/contentRoutes";
import type { CharacterChronologyCounts } from "./CharacterChronologyLinks";
import type { CharacterDocument } from "@/lib/characterDocumentTypes";

export default function CharakterDetailPage({
  character,
  documents,
  documentsReadOnly,
  chronologyCounts,
  viewer,
  owners,
  displayAge,
  followInitialState,
  mentions,
  relations,
  notes,
  canWriteNotes,
}: {
  character: Character;
  documents: CharacterDocument[];
  documentsReadOnly: boolean;
  chronologyCounts: CharacterChronologyCounts;
  viewer: Viewer | null;
  owners: { id: number; name: string }[];
  // Aus Geburtsdatum + Ingame-Jahr abgeleitetes Alter (Fallback: metadata.age),
  // serverseitig berechnet (siehe page.tsx) — CharacterHero ist eine Client
  // Component und kann das server-only campaign.ts nicht selbst importieren.
  displayAge: number | null;
  followInitialState?: FollowState;
  // Eingehende Verweise (siehe src/lib/mentions.ts).
  mentions: Mention[];
  // Verbindungen zu anderen Figuren (siehe src/lib/relations.ts).
  relations: Relation[];
  notes: ContentNote[];
  // Notizen gibt es nur für eingeloggte Personen.
  canWriteNotes: boolean;
}) {
  usePageMeta(character.name, "characters");

  return (
    <div className="h-full">
      <CharacterHero
        character={character}
        documents={documents}
        documentsReadOnly={documentsReadOnly}
        chronologyCounts={chronologyCounts}
        viewer={viewer}
        owners={owners}
        displayAge={displayAge}
        followInitialState={followInitialState}
      />
      <div className="lcars-text lcars-wide-column mt-[16px] flex flex-col gap-[16px]">
        {canWriteNotes && (
          <NotesPanel
            contentType="character"
            contentSlug={character.slug}
            path={characterHref(character.slug)}
            notes={notes}
          />
        )}
        <RelationsSection relations={relations} />
        <MentionsSection mentions={mentions} />
      </div>
    </div>
  );
}
