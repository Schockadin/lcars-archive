"use client";
import { useEffect, useRef, useState } from "react";
import { getDialogueSnapshotAction } from "@/app/actions/dialogues";
import type { DialogueMessage, DialogueLockStatus } from "@/lib/dialogues";
import type { ArchiveParticipant } from "@/types/archive";
import type { CharacterParticipantOption } from "@/lib/characters";
import DialogueThread from "./DialogueThread";
import DialogueReplyForm from "./DialogueReplyForm";
import DialogueLockPanel from "./DialogueLockPanel";
import InviteDialogueParticipantForm from "./InviteDialogueParticipantForm";
import CompleteDialogueButton from "./CompleteDialogueButton";
import DeleteDialogueButton from "./DeleteDialogueButton";
import FollowButtons from "./FollowButtons";

const POLL_INTERVAL_MS = 8000;

// Live-Aktualisierung offener Dialoge ohne manuelles Neuladen: pollt
// getDialogueSnapshotAction alle 8 Sekunden, pausiert bei unsichtbarem Tab
// (Page Visibility API) und holt beim Zurückkehren sofort frische Daten.
// Voller Snapshot statt Delta — deckt Bearbeitungen/Soft-Deletes an
// bestehenden Nachrichten automatisch mit ab, ohne eigene Diff-Logik. Übernimmt
// die gesamte bisherige Render-Logik von /dialogues/[slug]/page.tsx ab
// DialogueThread abwärts (statt nur Thread/ReplyForm/LockPanel einzeln zu
// wrappen), damit die bestehende JSX-Struktur/das Spacing unverändert bleibt
// — FollowButtons/InviteDialogueParticipantForm/Complete-/DeleteDialogueButton
// brauchen selbst keine Live-Daten, sind aber ohnehin schon Client-Komponenten
// und deshalb hier genauso gut aufgehoben. Stabile message.id-Keys in
// DialogueThread sorgen dafür, dass ein Re-Render mit neuen Props kein
// Remount der Kind-Komponenten auslöst (offene Bearbeitungsformulare in
// DialogueMessageActions bleiben unangetastet, das unkontrollierte Textarea
// in DialogueReplyForm bleibt gemountet).
export default function DialogueLiveView({
  entrySlug,
  title,
  participants,
  currentUserId,
  viewerRole,
  isParticipant,
  isOwner,
  inviteCandidates,
  initialMessages,
  initialLockStatus,
  initialCanReplyNow,
  alreadyRequestedNotify,
}: {
  entrySlug: string;
  title: string;
  participants: ArchiveParticipant[];
  currentUserId: number;
  viewerRole: "admin" | "gm" | "player" | "viewer" | "guest" | null;
  isParticipant: boolean;
  isOwner: boolean;
  inviteCandidates: CharacterParticipantOption[];
  initialMessages: DialogueMessage[];
  initialLockStatus: DialogueLockStatus | null;
  initialCanReplyNow: boolean;
  alreadyRequestedNotify: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [lockStatus, setLockStatus] = useState(initialLockStatus);
  const [canReplyNow, setCanReplyNow] = useState(initialCanReplyNow);
  // Immer true beim Mounten — /dialogues/[slug]/page.tsx redirected bereits
  // abgeschlossene/gelöschte Dialoge, bevor diese Komponente je gerendert
  // wird. Kann danach nur noch durch einen Poll auf false wechseln.
  const [open, setOpen] = useState(true);
  const stoppedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const snapshot = await getDialogueSnapshotAction(entrySlug);
      if (cancelled) return;
      if (!snapshot.open) {
        stoppedRef.current = true;
        setOpen(false);
        return;
      }
      setMessages(snapshot.messages);
      setLockStatus(snapshot.lockStatus);
      setCanReplyNow(snapshot.canReplyNow);
    }

    const intervalId = setInterval(() => {
      if (!stoppedRef.current && !document.hidden) poll();
    }, POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (!document.hidden && !stoppedRef.current) poll();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [entrySlug]);

  const multiParty = participants.length > 2;

  return (
    <>
      {messages.length > 0 ? (
        <DialogueThread
          messages={messages}
          participants={participants}
          currentUserId={currentUserId}
          dialogueOpen={open}
          entrySlug={entrySlug}
          viewerRole={viewerRole}
        />
      ) : (
        <p className="lcars-empty-state">Noch keine Nachrichten.</p>
      )}

      {!open && (
        <p className="text-lcars-amber text-[13px] mt-[8px]" role="status">
          Dieses Gespräch ist nicht mehr verfügbar — es wurde inzwischen
          abgeschlossen oder gelöscht.
        </p>
      )}

      <div className="flex flex-col gap-[12px]">
        {isParticipant && (
          <FollowButtons
            targetType="archive_entry"
            targetSlug={entrySlug}
            title={title}
            subscribeOnly
            showShare={!open}
          />
        )}
        {open && isParticipant && (
          <DialogueReplyForm entrySlug={entrySlug} canReplyNow={canReplyNow} />
        )}
        {open && isParticipant && multiParty && !canReplyNow && (
          <DialogueLockPanel
            entrySlug={entrySlug}
            lockStatus={lockStatus}
            currentUserId={currentUserId}
            alreadyRequestedNotify={alreadyRequestedNotify}
          />
        )}
        {isOwner && (
          <InviteDialogueParticipantForm
            entrySlug={entrySlug}
            candidates={inviteCandidates}
          />
        )}
        <div className="flex items-center gap-[8px]">
          <CompleteDialogueButton entrySlug={entrySlug} />
          {viewerRole === "admin" && (
            <DeleteDialogueButton entrySlug={entrySlug} />
          )}
        </div>
      </div>
    </>
  );
}
