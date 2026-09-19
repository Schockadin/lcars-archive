"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  getDialogueSnapshotAction,
  releaseDialogueReservationAction,
} from "@/app/actions/dialogues";
import type { DialogueMessage, DialogueLockStatus } from "@/lib/dialogues";
import type { ArchiveParticipant } from "@/types/archive";

import DialogueThread from "./DialogueThread";
import DialogueReplyForm from "./DialogueReplyForm";
import DialogueLockPanel from "./DialogueLockPanel";
import InviteDialogueParticipantForm from "./InviteDialogueParticipantForm";
import CompleteDialogueButton from "./CompleteDialogueButton";
import DeleteDialogueButton from "./DeleteDialogueButton";
import FollowButtons from "./FollowButtons";
import type { InviteCandidate } from "./InviteDialogueParticipantForm";
import type { GmContact } from "@/lib/users";
import { speakerKey } from "@/lib/dialogueSpeaker";
import {
  readReplyDockSticky,
  writeReplyDockSticky,
} from "@/lib/replyDockPreference";

export interface DialogueReplyCharacter {
  // Sprecher-Schlüssel ("c12"/"n7", siehe src/lib/dialogueSpeaker.ts) —
  // eigener Charakter oder ein NPC, für den diese Person hier schreibt.
  key: string;
  name: string;
}

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
  canModerate,
  isParticipant,
  myCharacters,
  isOwner,
  inviteCandidates,
  inviteGms,
  inviterPlaysNpcs,
  dialogueNpcSpeakerUserId,
  initialMessages,
  initialLockStatus,
  initialCanReplyNow,
  alreadyRequestedNotify,
}: {
  entrySlug: string;
  title: string;
  participants: ArchiveParticipant[];
  currentUserId: number;
  // Darf fremde Nachrichten/Reservierungen moderieren (dialogues.moderate).
  canModerate: boolean;
  isParticipant: boolean;
  // Teilnehmer-Charaktere DIESER Person (für die Antwort-Charakter-Auswahl) —
  // leer, wenn Nicht-Teilnehmer (Admin/GM-Betrachter).
  myCharacters: DialogueReplyCharacter[];
  isOwner: boolean;
  inviteCandidates: InviteCandidate[];
  // Nur für das Einladen durchgereicht (siehe InviteDialogueParticipantForm):
  // wer für nachträglich eingeladene NPCs schreiben kann, ob die einladende
  // Person das selbst darf und wer es in diesem Gespräch schon tut.
  inviteGms: GmContact[];
  inviterPlaysNpcs: boolean;
  dialogueNpcSpeakerUserId: number | null;
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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Eigenständig (useCallback statt nur im Interval-Effect definiert), damit
  // DialogueReplyForm/DialogueLockPanel nach einer eigenen Aktion (Antwort
  // gesendet, Antwortrecht reserviert) sofort denselben Poll auslösen können,
  // statt bis zu 8 Sekunden auf den nächsten Intervall-Tick zu warten — die
  // eigene Nachricht bzw. der neue Sperr-Status erscheint sonst erst mit
  // spürbarer Verzögerung.
  const poll = useCallback(async () => {
    const snapshot = await getDialogueSnapshotAction(entrySlug);
    if (!mountedRef.current) return;
    if (!snapshot.open) {
      stoppedRef.current = true;
      setOpen(false);
      return;
    }
    setMessages(snapshot.messages);
    setLockStatus(snapshot.lockStatus);
    setCanReplyNow(snapshot.canReplyNow);
  }, [entrySlug]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!stoppedRef.current && !document.hidden) poll();
    }, POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (!document.hidden && !stoppedRef.current) poll();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [poll]);

  const multiParty = participants.length > 2;

  // Zuletzt am Zug gewesener Charakter (aus den bereits vorliegenden, per Poll
  // aktuellen Nachrichten) — die nächste Nachricht darf nicht von ihm kommen
  // (Selbstgespräch-Verbot). Daraus leiten sich die für DIESE Person aktuell
  // antwortberechtigten Charaktere ab.
  // findLast statt [...messages].reverse().find(...) — letzteres kopierte den
  // gesamten Nachrichtenverlauf bei jedem Render, und diese Komponente
  // rendert durch den 8-Sekunden-Poll dauerhaft neu.
  const lastSpeaker = messages.findLast((m) => !m.deletedAt)?.speaker ?? null;
  const lastSpeakerKey = lastSpeaker ? speakerKey(lastSpeaker) : null;
  const eligibleReplyCharacters = myCharacters.filter(
    (c) => c.key !== lastSpeakerKey,
  );
  // Wer keinen antwortberechtigten Charakter hat, darf auch nicht reservieren
  // (der Reserve-Button wird gesperrt, Server-Guard zusätzlich).
  const canReserve = eligibleReplyCharacters.length > 0;

  // Klebt das Antwortfeld am unteren Rand? Die Wahl steht im localStorage
  // (siehe src/lib/replyDockPreference.ts) und gehört hierher, weil der
  // Sprung ans Verlaufsende sie ebenfalls braucht. Erster Aufbau immer mit
  // der Vorgabe, damit Server-Render und Hydration übereinstimmen — den
  // Speicher gibt es erst im Effekt darunter.
  const [stickyReply, setStickyReply] = useState(true);
  const threadRef = useRef<HTMLDivElement>(null);

  // Beim Öffnen ans Ende des Verlaufs springen — wie in einem Chat, statt
  // ihn von oben lesen zu müssen. Lag bis v1.45 in DialogueThread und ist
  // hierher gewandert, weil der Sprung seit dem klebenden Antwortfeld beides
  // kennen muss: Ein Sprung auf die letzte Nachricht („block: end") legt
  // deren Unterkante auf die Unterkante der Inhaltsfläche — und genau dort
  // steht jetzt das Feld. Die letzte Nachricht wäre also ausgerechnet nach
  // dem Sprung verdeckt. scroll-margin-bottom in Höhe des Kastens hält sie
  // frei; ohne Kasten (Zuschauer, fremde Reservierung) bleibt es bei 0.
  //
  // Nur beim ersten Aufbau (leere Deps): Spätere Polls dürfen die
  // Leseposition nicht nach unten reißen, während jemand ältere Nachrichten
  // liest. Geschlossene Gespräche kommen hier nie an — die Seite leitet sie
  // vorher um (siehe /dialogues/[slug]/page.tsx).
  useEffect(() => {
    const preferred = readReplyDockSticky();
    // Bewusst im Mount-Effect statt als Initialwert: localStorage gibt es
    // beim SSR nicht, das erste Client-Render muss aber zum Server-Render
    // passen (Hydration). Gelesen wird genau einmal, es gibt also auch
    // nichts zu abonnieren — kein Fall für useSyncExternalStore.
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-you-might-not-need-an-effect/no-initialize-state
    setStickyReply(preferred);

    const thread = threadRef.current;
    if (!thread) return;
    // Die Höhe des Kastens steht schon jetzt fest (sie hängt nicht am
    // Kleben), die gewählte Einstellung aber erst seit dieser Zeile — also
    // beides hier, vor dem einen Sprung. Klebt der Kasten nicht, verdeckt er
    // auch nichts und es braucht keinen Abstand. Nachführen muss man ihn
    // später nicht: Gesprungen wird nur dieses eine Mal.
    const dock = preferred
      ? thread.parentElement?.querySelector(".dialogue-reply-dock")
      : null;
    thread.style.scrollMarginBottom = dock
      ? `${Math.round(dock.getBoundingClientRect().height)}px`
      : "";
    thread.scrollIntoView({ behavior: "instant", block: "end" });
  }, []);

  function handleStickyChange(next: boolean) {
    setStickyReply(next);
    writeReplyDockSticky(next);
  }

  const [releasePending, startRelease] = useTransition();
  function handleRelease() {
    startRelease(async () => {
      await releaseDialogueReservationAction(entrySlug);
      poll();
    });
  }

  return (
    <>
      {/* Verlauf und Antwortfeld gehören in EINEN Block: Das Feld klebt per
          position: sticky am unteren Rand (.dialogue-reply-dock), und kleben
          kann es nur, solange sein umschließender Block im Bild ist. Stünde
          es wie früher unten im Bedienteil, wäre dieser Block erst am Ende
          des Verlaufs zu sehen — also genau dann, wenn man es ohnehin sieht. */}
      <div className="dialogue-play">
        <div ref={threadRef}>
          {messages.length > 0 ? (
            <DialogueThread
              messages={messages}
              participants={participants}
              currentUserId={currentUserId}
              dialogueOpen={open}
              entrySlug={entrySlug}
              canModerate={canModerate}
            />
          ) : (
            <p className="lcars-empty-state">Noch keine Nachrichten.</p>
          )}
        </div>

        {open && isParticipant && (
          <DialogueReplyForm
            entrySlug={entrySlug}
            canReplyNow={canReplyNow}
            replyCharacters={eligibleReplyCharacters}
            hasOnlyBlockedCharacter={
              myCharacters.length > 0 && eligibleReplyCharacters.length === 0
            }
            onSent={poll}
            sticky={stickyReply}
            onStickyChange={handleStickyChange}
          />
        )}
      </div>

      {!open && (
        <p className="text-lcars-primary-ink text-[13px] mt-[8px]" role="status">
          Dieses Gespräch ist nicht mehr verfügbar — es wurde inzwischen
          abgeschlossen oder gelöscht.
        </p>
      )}

      <div className="flex flex-col gap-[12px] mt-[5px]">
        {isParticipant && (
          <FollowButtons
            targetType="archive_entry"
            targetSlug={entrySlug}
            title={title}
            subscribeOnly
            showShare={!open}
          />
        )}
        {open && isParticipant && multiParty && !canReplyNow && (
          <DialogueLockPanel
            entrySlug={entrySlug}
            lockStatus={lockStatus}
            currentUserId={currentUserId}
            canReserve={canReserve}
            alreadyRequestedNotify={alreadyRequestedNotify}
            onReserved={poll}
          />
        )}
        {/* Admin-Rettungsanker: eine aktive Reservierung sofort freigeben,
            falls sie hängt (auch für Nicht-Teilnehmer-Admins sichtbar). */}
        {open && canModerate && multiParty && lockStatus && (
          <button
            type="button"
            onClick={handleRelease}
            disabled={releasePending}
            className="lcars-pill-btn--outline self-start disabled:opacity-50"
            title="Die aktive Antwort-Reservierung dieses Gesprächs sofort freigeben"
          >
            {releasePending
              ? "Wird freigegeben…"
              : `Reservierung von ${lockStatus.heldByName} freigeben`}
          </button>
        )}
        {isOwner && (
          <InviteDialogueParticipantForm
            entrySlug={entrySlug}
            candidates={inviteCandidates}
            gms={inviteGms}
            inviterPlaysNpcs={inviterPlaysNpcs}
            npcSpeakerUserId={dialogueNpcSpeakerUserId}
          />
        )}
        <div className="flex items-center gap-[8px]">
          <CompleteDialogueButton entrySlug={entrySlug} />
          {canModerate && <DeleteDialogueButton entrySlug={entrySlug} />}
        </div>
      </div>
    </>
  );
}
