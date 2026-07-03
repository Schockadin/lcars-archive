// src/app/dialogues/[slug]/page.tsx
import { notFound, redirect } from "next/navigation";
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
  if (!participant) {
    const user = await getUserById(session.userId);
    if (user?.role !== "gm" && user?.role !== "admin") {
      redirect(`/users/${session.userId}`);
    }
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
        />
      ) : (
        <p className="char-file-bio-empty">Noch keine Nachrichten.</p>
      )}

      <div className="flex flex-col gap-[12px]">
        {participant && <DialogueReplyForm entrySlug={entry.slug} />}
        <CompleteDialogueButton entrySlug={entry.slug} />
      </div>
    </article>
  );
}
