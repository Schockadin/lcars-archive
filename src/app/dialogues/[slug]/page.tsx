// src/app/dialogues/[slug]/page.tsx
import { userCan } from "@/lib/permissions";
import { notFound, redirect, forbidden } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import {
  getDialogueForPlay,
  getDialogueParticipantCharacters,
  getDialogueMessages,
  getDialogueLockStatus,
  hasRequestedDialogueReservationNotification,
} from "@/lib/dialogues";
import { getCharactersForParticipantPicker } from "@/lib/characters";
import { canReplyToDialogue } from "@/lib/dialogueLock";
import PageMeta from "@/components/PageMeta";
import DialogueHeader from "@/components/DialogueHeader";
import DialogueLiveView from "@/components/DialogueLiveView";

export const dynamic = "force-dynamic";

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
  const session = await verifySession();

  const entry = await getDialogueForPlay(slug);
  if (!entry) notFound();

  // Abgeschlossene Dialoge leben unter /archive — kein doppeltes Ziel.
  if (!entry.open) redirect(`/archive/${slug}`);

  const myParticipantCharacters = await getDialogueParticipantCharacters(
    entry.id,
    session.userId,
  );
  const isParticipant = myParticipantCharacters.length > 0;
  const viewer = await getUserById(session.userId);
  if (!isParticipant && !(viewer && userCan(viewer, "gm.access"))) {
    forbidden();
  }
  // Schlanke {id,name}-Liste für die Antwort-Charakter-Auswahl im Client.
  const myCharacters = myParticipantCharacters.map((c) => ({
    id: c.characterId,
    name: c.characterName,
  }));

  const messages = await getDialogueMessages(entry.id);

  // Antwort-Reservierung nur bei mehr als zwei Teilnehmenden relevant (siehe
  // DialogueLockPanel.tsx) — bei genau zwei bleibt das Selbstgespräch-Verbot
  // in postDialogueMessage der einzige Schutzmechanismus.
  const multiParty = entry.participants.length > 2;
  const lockStatus = multiParty ? await getDialogueLockStatus(entry.id) : null;
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

  const isOwner = entry.ownerUserId === session.userId;
  const inviteCandidates = isOwner
    ? (await getCharactersForParticipantPicker()).filter(
        (c) => !entry.participants.some((p) => p.slug === c.slug),
      )
    : [];

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
        canModerate={!!viewer && userCan(viewer, "dialogues.moderate")}
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
