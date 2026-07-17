// src/app/dialogues/[slug]/page.tsx
import { notFound, redirect, forbidden } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import {
  getDialogueForPlay,
  getDialogueParticipant,
  getDialogueMessages,
} from "@/lib/dialogues";
import PageMeta from "@/components/PageMeta";
import DialogueHeader from "@/components/DialogueHeader";
import DialogueThread from "@/components/DialogueThread";
import DialogueReplyForm from "@/components/DialogueReplyForm";
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
        {participant && <DialogueReplyForm entrySlug={entry.slug} />}
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
