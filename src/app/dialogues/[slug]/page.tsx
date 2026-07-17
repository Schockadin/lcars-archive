// src/app/dialogues/[slug]/page.tsx
import { notFound, redirect, forbidden } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import {
  getDialogueForPlay,
  getDialogueParticipant,
  getDialogueMessages,
  getDialogueLockStatus,
  hasRequestedDialogueReservationNotification,
} from "@/lib/dialogues";
import { getCharactersForParticipantPicker } from "@/lib/characters";
import { canReplyToDialogue } from "@/lib/dialogueLock";
import PageMeta from "@/components/PageMeta";
import DialogueHeader from "@/components/DialogueHeader";
import DialogueThread from "@/components/DialogueThread";
import DialogueReplyForm from "@/components/DialogueReplyForm";
import DialogueLockPanel from "@/components/DialogueLockPanel";
import InviteDialogueParticipantForm from "@/components/InviteDialogueParticipantForm";
import CompleteDialogueButton from "@/components/CompleteDialogueButton";
import DeleteDialogueButton from "@/components/DeleteDialogueButton";
import FollowButtons from "@/components/FollowButtons";

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

  const participant = await getDialogueParticipant(entry.id, session.userId);
  const viewer = await getUserById(session.userId);
  if (!participant && viewer?.role !== "gm" && viewer?.role !== "admin") {
    forbidden();
  }

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

      {messages.length > 0 ? (
        <DialogueThread
          messages={messages}
          participants={entry.participants}
          currentUserId={session.userId}
          dialogueOpen={entry.open}
          entrySlug={entry.slug}
          viewerRole={viewer?.role ?? null}
        />
      ) : (
        <p className="lcars-empty-state">Noch keine Nachrichten.</p>
      )}

      <div className="flex flex-col gap-[12px]">
        {participant && (
          <FollowButtons
            targetType="archive_entry"
            targetSlug={entry.slug}
            subscribeOnly
          />
        )}
        {participant && (
          <DialogueReplyForm entrySlug={entry.slug} canReplyNow={canReplyNow} />
        )}
        {participant && multiParty && !canReplyNow && (
          <DialogueLockPanel
            entrySlug={entry.slug}
            lockStatus={lockStatus}
            currentUserId={session.userId}
            alreadyRequestedNotify={alreadyRequestedNotify}
          />
        )}
        {isOwner && (
          <InviteDialogueParticipantForm
            entrySlug={entry.slug}
            candidates={inviteCandidates}
          />
        )}
        <div className="flex items-center gap-[8px]">
          <CompleteDialogueButton entrySlug={entry.slug} />
          {viewer?.role === "admin" && (
            <DeleteDialogueButton entrySlug={entry.slug} />
          )}
        </div>
      </div>
    </article>
  );
}
