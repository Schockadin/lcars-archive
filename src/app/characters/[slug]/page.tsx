// src/app/characters/[slug]/page.tsx
import {
  getCharacterBySlug,
  getLogsByCharacter,
  getCharacterSourceBySlug,
} from "@/lib/characters";
import { getDialogueCountByParticipant } from "@/lib/archive";
import { getIngameYear, inferAgeFromDateOfBirth } from "@/lib/campaign";
import { getViewer, canView, canViewDraft, viewerHasPermission } from "@/lib/visibility";
import { listAllUsers } from "@/lib/users";
import { notFound } from "next/navigation";
import CharakterDetailPage from "./CharacterDetailPage";
import MarkNewsSeen from "@/app/_shared/MarkNewsSeen";
interface Props {
  params: Promise<{ slug: string }>;
}

// Erzwungen dynamisch: der Sichtbarkeits-Guard unten braucht cookies() (via
// getViewer()), sobald ein Charakter nicht public ist. Next weist bei
// bedingtem cookies()-Zugriff auf einer Route mit generateStaticParams einen
// DYNAMIC_SERVER_USAGE-Fehler zurück (production build) statt zuverlässig
// dynamisch zu rendern — deshalb hier explizit statt implizit, exakt wie
// schon in src/app/dialogues/[slug]/page.tsx. Kostet die statische
// Vorrenderung für ALLE (auch public) Charakterseiten.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  // Auch der Seitentitel darf einen privaten/gm-Charakternamen nicht an
  // Betrachter ohne Zugriff verraten (sonst leakt er via <title>/Meta-Tags,
  // selbst wenn der eigentliche Seiteninhalt korrekt blockiert wird). Ein
  // Entwurf ist dabei noch strenger als "privat" — siehe canViewDraft.
  const viewerForMeta = await getViewer();
  const visible =
    character &&
    (character.visibility === "public" ||
      canView(character.visibility, character.player_id, viewerForMeta)) &&
    canViewDraft(character.is_draft, character.player_id, viewerForMeta);
  return {
    title: visible
      ? `${character.name} · Neo Archive`
      : "Nicht gefunden · Neo Archive",
  };
}

export default async function CharakterPage({ params }: Props) {
  const { slug } = await params;

  // Erst Charakter laden, dann parallel Logs dazu
  const character = await getCharacterBySlug(slug);
  if (!character) notFound();

  // Betrachter jetzt immer auflösen (nicht mehr nur bei nicht-public) — der
  // Admin-Owner-Block unten braucht die Rolle unabhängig von der
  // Sichtbarkeit dieses Charakters.
  const viewer = await getViewer();
  if (
    character.visibility !== "public" &&
    !canView(character.visibility, character.player_id, viewer)
  ) {
    notFound();
  }
  if (!canViewDraft(character.is_draft, character.player_id, viewer)) {
    notFound();
  }

  // Rohen Markdown-Body nur laden, wenn der Betrachter auch tatsächlich der
  // Owner ist (einzige Zielgruppe des Inline-Bio-Editors, siehe
  // CharacterHero.tsx) — spart die Extra-Query für alle anderen Aufrufe.
  const isOwner = viewer != null && viewer.userId === character.player_id;

  const [logs, conversationCount, allUsers, source, ingameYear] =
    await Promise.all([
      getLogsByCharacter(character.id),
      getDialogueCountByParticipant(character.slug),
      viewerHasPermission(viewer, "content.moderate") ? listAllUsers() : Promise.resolve([]),
      isOwner ? getCharacterSourceBySlug(character.slug) : Promise.resolve(null),
      getIngameYear(),
    ]);
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
        logs={logs}
        conversationCount={conversationCount}
        viewer={viewer}
        owners={owners}
        displayAge={displayAge}
        sourceMarkdown={isOwner ? (source?.sourceMarkdown ?? "") : null}
      />
    </div>
  );
}
