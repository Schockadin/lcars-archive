"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import {
  DialogueClosedError,
  getDialogueForPlay,
  getDialogueParticipant,
  getOtherParticipantContact,
  postDialogueMessage,
  completeDialogue,
} from "@/lib/dialogues";
import { sendDialogueMessageEmail } from "@/lib/mail";
import { getBaseUrl } from "@/lib/http";
import { revalidateArchiveEntry } from "@/lib/revalidate";

export interface DialogueMessageState {
  error?: string;
  success?: boolean;
}

// Jede Prüfung serverseitig, nie auf ausgeblendete UI verlassen — exakt
// das bestehende Prinzip aus src/app/users/actions.ts. Sichtbarkeit des
// Formulars selbst entscheidet /dialogues/[slug] (Server-gated), kein
// Client-seitiger Vorab-Check mehr nötig.
export async function postDialogueMessageAction(
  _state: DialogueMessageState,
  formData: FormData,
): Promise<DialogueMessageState> {
  const session = await getSession();
  if (!session) {
    return { error: "Bitte melde dich an." };
  }

  const entrySlug = String(formData.get("entrySlug") ?? "");
  const entry = await getDialogueForPlay(entrySlug);
  if (!entry) {
    return { error: "Dieser Dialog existiert nicht." };
  }

  const participant = await getDialogueParticipant(entry.id, session.userId);
  if (!participant) {
    return { error: "Du bist kein Teilnehmer dieses Gesprächs." };
  }

  if (!entry.open) {
    return {
      error:
        "Dieses Gespräch ist abgeschlossen — neue Nachrichten sind nicht mehr möglich.",
    };
  }

  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) {
    return { error: "Bitte eine Nachricht eingeben." };
  }

  try {
    await postDialogueMessage({
      archiveEntryId: entry.id,
      characterId: participant.characterId,
      authorUserId: session.userId,
      bodyMarkdown,
    });
  } catch (err) {
    if (err instanceof DialogueClosedError) {
      return {
        error:
          "Dieses Gespräch ist abgeschlossen — neue Nachrichten sind nicht mehr möglich.",
      };
    }
    throw err;
  }

  // Offene Dialoge sind für keinen gecachten Leser sichtbar (siehe
  // src/lib/archive.ts) — nur die eigene, ungecachte Seite muss frisch sein.
  revalidatePath(`/dialogues/${entrySlug}`);

  const other = await getOtherParticipantContact(
    entry.id,
    participant.characterSlug,
  );
  if (other) {
    const dialogueUrl = `${await getBaseUrl()}/dialogues/${entrySlug}`;
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

export interface CompleteDialogueState {
  error?: string;
}

// Abschließen dürfen beide Teilnehmer oder der GM — Rollen-Check DB-frisch
// (analog requireSelfOrGM), da eine gerade entzogene GM-Rolle sonst bis zum
// nächsten Login weitergelten würde.
export async function completeDialogueAction(
  _state: CompleteDialogueState,
  formData: FormData,
): Promise<CompleteDialogueState> {
  const session = await getSession();
  if (!session) {
    return { error: "Bitte melde dich an." };
  }

  const entrySlug = String(formData.get("entrySlug") ?? "");
  const entry = await getDialogueForPlay(entrySlug);
  if (!entry) {
    return { error: "Dieser Dialog existiert nicht." };
  }
  if (!entry.open) {
    redirect(`/archive/${entrySlug}`);
  }

  const participant = await getDialogueParticipant(entry.id, session.userId);
  if (!participant) {
    const user = await getUserById(session.userId);
    if (user?.role !== "gm") {
      return { error: "Du darfst dieses Gespräch nicht abschließen." };
    }
  }

  await completeDialogue(entry.id);

  revalidateArchiveEntry(entrySlug);
  revalidatePath(`/archive/${entrySlug}`);

  redirect(`/archive/${entrySlug}`);
}
