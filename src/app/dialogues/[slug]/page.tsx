// src/app/dialogues/[slug]/page.tsx
import { userCan } from "@/lib/permissions";
import { notFound, redirect, forbidden } from "next/navigation";
import { verifySession, getRoleMap } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import {
  getDialogueForPlay,
  getDialogueParticipantCharacters,
  getDialogueMessages,
  getDialogueLockStatus,
  hasRequestedDialogueReservationNotification,
} from "@/lib/dialogues";
import { getCharactersForParticipantPicker } from "@/lib/characters";
import { getNpcOptions } from "@/lib/archive";
import { speakerKey } from "@/lib/dialogueSpeaker";
import { canPlayNpcs, canView, resolveViewer } from "@/lib/visibility";
import { canReplyToDialogue } from "@/lib/dialogueLock";
import PageMeta from "@/components/PageMeta";
import DialogueHeader from "@/components/DialogueHeader";
import DialogueLiveView from "@/components/DialogueLiveView";


interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const entry = await getDialogueForPlay(slug);
  return {
    title: entry
      ? `${entry.title} · Neo Archive`
      : "Nicht gefunden · Neo Archive",
    robots: { index: false, follow: false },
  };
}

export default async function DialoguePlayPage({ params }: Props) {
  const { slug } = await params;
  // Session und Dialog sind voneinander unabhängig — parallel laden.
  const [session, entry] = await Promise.all([
    verifySession(),
    getDialogueForPlay(slug),
  ]);
  if (!entry) notFound();

  // Abgeschlossene Dialoge leben unter /archive — kein doppeltes Ziel.
  if (!entry.open) redirect(`/archive/${slug}`);

  // Teilnehmer-Charaktere, Viewer und Rollen-Map hängen alle nur an
  // session.userId/entry.id, nicht voneinander — in einem Batch laden statt
  // nacheinander. Muss VOR dem forbidden()-Gate stehen (der Gate braucht
  // isParticipant + viewer + roleMap); die schwereren Inhalts-Queries
  // (messages/lockStatus/invite) bleiben bewusst dahinter.
  const [myParticipantCharacters, viewer, roleMap] = await Promise.all([
    getDialogueParticipantCharacters(entry.id, session.userId),
    getUserById(session.userId),
    getRoleMap(),
  ]);
  const isParticipant = myParticipantCharacters.length > 0;
  if (!isParticipant && !(viewer && userCan(viewer, "gm.access", roleMap))) {
    forbidden();
  }
  // Schlanke {key,name}-Liste für die Antwort-Auswahl im Client — der
  // Schlüssel unterscheidet eigenen Charakter von NPC-Datenbank-Eintrag.
  const myCharacters = myParticipantCharacters.map((c) => ({
    key: speakerKey(c.speaker),
    name: c.characterName,
  }));

  // Ab hier ist der Zugriff bestätigt — Nachrichten, Sperr-Status und (nur für
  // den Owner) die Einladungs-Kandidaten sind voneinander unabhängig und
  // laufen parallel.
  // - lockStatus: Antwort-Reservierung nur bei mehr als zwei Teilnehmenden
  //   relevant (siehe DialogueLockPanel.tsx) — bei genau zwei bleibt das
  //   Selbstgespräch-Verbot in postDialogueMessage der einzige Schutz.
  const multiParty = entry.participants.length > 2;
  const isOwner = entry.ownerUserId === session.userId;
  // Der Owner kann nachträglich einladen: Charaktere mit Spieler immer,
  // NPCs nur, wenn er sie selbst spielen darf (er wird dann ihr Sprecher,
  // siehe inviteDialogueParticipantAction) und sie überhaupt sehen darf.
  const viewerForNpcs = viewer ? resolveViewer(viewer, roleMap) : null;
  const mayInviteNpcs = isOwner && canPlayNpcs(viewerForNpcs);
  const [messages, lockStatus, inviteCandidatesRaw, npcCandidatesRaw] =
    await Promise.all([
      getDialogueMessages(entry.id),
      multiParty ? getDialogueLockStatus(entry.id) : Promise.resolve(null),
      isOwner ? getCharactersForParticipantPicker() : Promise.resolve([]),
      mayInviteNpcs ? getNpcOptions() : Promise.resolve([]),
    ]);
  const inviteCandidates = isOwner
    ? [
        ...inviteCandidatesRaw.map((c) => ({
          key: speakerKey({ kind: "character" as const, id: c.id }),
          slug: c.slug,
          name: c.name,
          playerName: c.playerName,
        })),
        ...npcCandidatesRaw
          .filter((npc) => canView(npc.visibility, null, viewerForNpcs))
          .map((npc) => ({
            key: speakerKey({ kind: "npc" as const, id: npc.id }),
            slug: npc.slug,
            name: npc.name,
            // Statt eines Spielernamens der Hinweis, dass hier die
            // Spielleitung schreibt — die Auswahl zeigt beides in einer Liste.
            playerName: "NPC",
          })),
      ]
        .filter((c) => !entry.participants.some((p) => p.slug === c.slug))
        .sort((a, b) => a.name.localeCompare(b.name, "de"))
    : [];

  const canReplyNow = canReplyToDialogue(
    entry.participants.length,
    lockStatus,
    session.userId,
  );
  // Nur relevant, wenn DialogueLockPanel tatsächlich den "Informiere
  // mich"-Button zeigen könnte — nicht wenn der Viewer die Sperre selbst
  // hält (dort zeigt die Komponente nur den eigenen Status, ohne den Button).
  const alreadyRequestedNotify =
    lockStatus !== null && lockStatus.heldByUserId !== session.userId
      ? await hasRequestedDialogueReservationNotification(
          entry.id,
          session.userId,
        )
      : false;

  return (
    <article className="archive-entry pb-[5px]">
      <PageMeta title={entry.title} section="users" />

      <DialogueHeader
        title={entry.title}
        participants={entry.participants}
        location={entry.location}
        logDate={entry.logDate}
      />

      <DialogueLiveView
        entrySlug={entry.slug}
        title={entry.title}
        participants={entry.participants}
        currentUserId={session.userId}
        canModerate={!!viewer && userCan(viewer, "dialogues.moderate", roleMap)}
        isParticipant={isParticipant}
        myCharacters={myCharacters}
        isOwner={isOwner}
        inviteCandidates={inviteCandidates}
        initialMessages={messages}
        initialLockStatus={lockStatus}
        initialCanReplyNow={canReplyNow}
        alreadyRequestedNotify={alreadyRequestedNotify}
      />
    </article>
  );
}
