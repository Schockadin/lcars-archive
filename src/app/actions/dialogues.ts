"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { getArchiveEntryBySlug } from "@/lib/archive";
import {
  getDialogueParticipant,
  getOtherParticipantContact,
  postDialogueMessage,
} from "@/lib/dialogues";
import { sendDialogueMessageEmail } from "@/lib/mail";
import { getBaseUrl } from "@/lib/http";
import { revalidateArchiveEntry } from "@/lib/revalidate";

export interface DialogueReplyState {
  loggedIn: boolean;
  canReply: boolean;
  characterId: number | null;
  characterName: string | null;
}

const NO_REPLY_STATE: DialogueReplyState = {
  loggedIn: false,
  canReply: false,
  characterId: null,
  characterName: null,
};

// Session-only (getSession, kein Redirect) — analog getFollowState in
// src/app/actions/follows.ts: anonyme Besucher und Nicht-Teilnehmer sollen
// einfach kein Antwortformular sehen, nicht auf /login umgeleitet werden.
export async function getDialogueReplyState(
  entrySlug: string,
): Promise<DialogueReplyState> {
  const session = await getSession();
  if (!session) return NO_REPLY_STATE;

  const entry = await getArchiveEntryBySlug(entrySlug);
  if (!entry || entry.category !== "dialogue") return NO_REPLY_STATE;

  const participant = await getDialogueParticipant(entry.id, session.userId);
  if (!participant) return { ...NO_REPLY_STATE, loggedIn: true };

  return {
    loggedIn: true,
    canReply: true,
    characterId: participant.characterId,
    characterName: participant.characterName,
  };
}

export interface DialogueMessageState {
  error?: string;
  success?: boolean;
}

// Jede Prüfung serverseitig, nie auf ausgeblendete UI verlassen — exakt
// das bestehende Prinzip aus src/app/users/actions.ts.
export async function postDialogueMessageAction(
  _state: DialogueMessageState,
  formData: FormData,
): Promise<DialogueMessageState> {
  const session = await getSession();
  if (!session) {
    return { error: "Bitte melde dich an." };
  }

  const entrySlug = String(formData.get("entrySlug") ?? "");
  const entry = await getArchiveEntryBySlug(entrySlug);
  if (!entry || entry.category !== "dialogue") {
    return { error: "Dieser Dialog existiert nicht." };
  }

  const participant = await getDialogueParticipant(entry.id, session.userId);
  if (!participant) {
    return { error: "Du bist kein Teilnehmer dieses Gesprächs." };
  }

  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) {
    return { error: "Bitte eine Nachricht eingeben." };
  }

  await postDialogueMessage({
    archiveEntryId: entry.id,
    characterId: participant.characterId,
    authorUserId: session.userId,
    bodyMarkdown,
  });

  revalidateArchiveEntry(entrySlug);
  revalidatePath(`/archive/${entrySlug}`);

  const other = await getOtherParticipantContact(
    entry.id,
    participant.characterSlug,
  );
  if (other) {
    const dialogueUrl = `${await getBaseUrl()}/archive/${entrySlug}`;
    await sendDialogueMessageEmail({
      to: other.email,
      name: other.name,
      fromCharacterName: participant.characterName,
      dialogueTitle: entry.title,
      dialogueUrl,
    });
  }

  return { success: true };
}
