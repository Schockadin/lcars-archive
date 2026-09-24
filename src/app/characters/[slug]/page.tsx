// src/app/characters/[slug]/page.tsx
import { getCharacterBySlug } from "@/lib/characters";
import { resolveFollowState } from "@/lib/follows";
import { getIngameYear, inferAgeFromDateOfBirth } from "@/lib/campaign";
import { getViewer, canView, viewerHasPermission } from "@/lib/visibility";
import { getMentionsOf } from "@/lib/mentions";
import { getRelationsOf } from "@/lib/relations";
import { listAllUsers } from "@/lib/users";
import { notFound } from "next/navigation";
import CharakterDetailPage from "./CharacterDetailPage";
import MarkNewsSeen from "@/app/_shared/MarkNewsSeen";
import { listNotes } from "@/lib/contentNotes";
import { getTimeline } from "@/lib/timeline";
import { filterEvents, type TimelineScope } from "@/lib/timelineTypes";
interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  // Auch der Seitentitel darf den Namen eines Entwurfs nicht an Betrachter
  // ohne Zugriff verraten (sonst leakt er via <title>/Meta-Tags, selbst wenn
  // der eigentliche Seiteninhalt korrekt blockiert wird).
  const viewerForMeta = await getViewer();
  const visible =
    character &&
    canView(character.is_draft, character.player_id, viewerForMeta);
  return {
    title: visible
      ? `${character.name} · Neo Archive`
      : "Nicht gefunden · Neo Archive",
  };
}

export default async function CharakterPage({ params }: Props) {
  const { slug } = await params;

  // Charakter und Betrachter sind voneinander unabhängig — parallel laden.
  // getViewer() liest nur Cookies/Session, nicht den Charakter; früher lief es
  // sequenziell hinter getCharacterBySlug und verlängerte so jede Anfrage um
  // eine zusätzliche Round-Trip-Latenz. (Betrachter jetzt immer auflösen, nicht
  // nur bei nicht-public — der Admin-Owner-Block unten braucht die Rolle
  // unabhängig von der Sichtbarkeit dieses Charakters.)
  const [character, viewer] = await Promise.all([
    getCharacterBySlug(slug),
    getViewer(),
  ]);
  if (!character) notFound();

  if (!canView(character.is_draft, character.player_id, viewer)) notFound();

  const [
    timeline,
    allUsers,
    ingameYear,
    followInitialState,
    mentions,
    relations,
    notes,
  ] = await Promise.all([
    getTimeline({ renderManualDetails: false }),
    viewerHasPermission(viewer, "content.moderate")
      ? listAllUsers()
      : Promise.resolve([]),
    getIngameYear(),
    // Bookmark/Abo-Stand serverseitig vorlösen → an FollowButtons als
    // initialState durchgereicht (kein Client-Fetch nach der Hydration).
    resolveFollowState(viewer?.userId ?? null, "character", character.slug),
    // Wer verweist auf diesen Charakter? (Archiv-Verweisfelder + Wikilinks)
    getMentionsOf({ slug: character.slug, name: character.name }),
    // „Wer kennt wen" — aus gemeinsamen Missionen und Gesprächen abgeleitet.
    getRelationsOf(character.slug),
    listNotes("character", character.slug, viewer),
  ]);
  const countTimelineScope = (scope: TimelineScope) =>
    filterEvents(timeline, {
      query: "",
      category: null,
      year: null,
      scope,
      person: character.name,
    }).length;
  const chronologyCounts = {
    logs: countTimelineScope("logs"),
    dialogues: countTimelineScope("dialogues"),
    missions: countTimelineScope("missions"),
    events: countTimelineScope("events"),
  };
  // Angezeigtes Alter: aus Geburtsdatum + Ingame-Jahr abgeleitet, sonst das
  // manuell gepflegte metadata.age als Fallback (siehe campaign.ts).
  const displayAge =
    inferAgeFromDateOfBirth(character.metadata.dateOfBirth, ingameYear) ??
    character.metadata.age;
  // Nur {id,name} an die Client Component durchreichen — der volle
  // UserWithCharacters-Datensatz (E-Mail, Login-Zeitstempel, …) würde sonst
  // unnötig ins Client-Bundle dieser Seite wandern (ActionsMenu braucht nur
  // id/name für OwnerSelect).
  const owners = allUsers.map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="h-[90%]">
      <MarkNewsSeen type="character" slug={character.slug} />
      <CharakterDetailPage
        character={character}
        chronologyCounts={chronologyCounts}
        viewer={viewer}
        owners={owners}
        displayAge={displayAge}
        followInitialState={followInitialState}
        mentions={mentions}
        relations={relations}
        notes={notes}
        canWriteNotes={viewer != null}
      />
    </div>
  );
}
