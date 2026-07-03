"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import {
  DialogueClosedError,
  DialogueMessageForbiddenError,
  DialogueMessageNotFoundError,
  getDialogueForPlay,
  getDialogueParticipant,
  getOtherParticipantContact,
  getCharacterSubscribers,
  getDialogueMessageForEdit,
  postDialogueMessage,
  editDialogueMessage,
  deleteDialogueMessage,
  completeDialogue,
} from "@/lib/dialogues";
import { sendDialogueMessageEmail, sendCharacterDialogueClosedEmail } from "@/lib/mail";
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

export interface EditMessageState {
  error?: string;
  success?: boolean;
}

export async function editDialogueMessageAction(
  _state: EditMessageState,
  formData: FormData,
): Promise<EditMessageState> {
  const session = await getSession();
  if (!session) {
    return { error: "Bitte melde dich an." };
  }

  const messageId = Number(formData.get("messageId"));
  const entrySlug = String(formData.get("entrySlug") ?? "");
  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!Number.isInteger(messageId)) return { error: "Ungültige Nachricht." };
  if (!bodyMarkdown) return { error: "Bitte eine Nachricht eingeben." };

  try {
    await editDialogueMessage({
      messageId,
      authorUserId: session.userId,
      bodyMarkdown,
    });
  } catch (err) {
    if (err instanceof DialogueMessageForbiddenError) {
      return { error: "Du kannst nur eigene Nachrichten bearbeiten." };
    }
    if (err instanceof DialogueMessageNotFoundError) {
      return { error: "Diese Nachricht existiert nicht mehr." };
    }
    if (err instanceof DialogueClosedError) {
      return { error: "Dieses Gespräch ist abgeschlossen." };
    }
    throw err;
  }

  revalidatePath(`/dialogues/${entrySlug}`);
  return { success: true };
}

export interface DeleteMessageState {
  error?: string;
}

export async function deleteDialogueMessageAction(
  _state: DeleteMessageState,
  formData: FormData,
): Promise<DeleteMessageState> {
  const session = await getSession();
  if (!session) {
    return { error: "Bitte melde dich an." };
  }

  const messageId = Number(formData.get("messageId"));
  const entrySlug = String(formData.get("entrySlug") ?? "");
  if (!Number.isInteger(messageId)) return { error: "Ungültige Nachricht." };

  try {
    await deleteDialogueMessage({ messageId, authorUserId: session.userId });
  } catch (err) {
    if (err instanceof DialogueMessageForbiddenError) {
      return { error: "Du kannst nur eigene Nachrichten löschen." };
    }
    if (err instanceof DialogueMessageNotFoundError) {
      return { error: "Diese Nachricht existiert nicht mehr." };
    }
    if (err instanceof DialogueClosedError) {
      return { error: "Dieses Gespräch ist abgeschlossen." };
    }
    throw err;
  }

  revalidatePath(`/dialogues/${entrySlug}`);
  return {};
}

export interface MessageSourceState {
  error?: string;
  sourceMd?: string;
}

// Kein useActionState-Formular — reiner, parameterloser Read, direkt aus
// einem Client-onClick aufgerufen (Grundlage für das Bearbeiten-Formular,
// das die Original-Markdown-Quelle statt des gerenderten HTML braucht).
export async function getDialogueMessageSourceAction(
  messageId: number,
): Promise<MessageSourceState> {
  const session = await getSession();
  if (!session) return { error: "Bitte melde dich an." };
  if (!Number.isInteger(messageId)) return { error: "Ungültige Nachricht." };

  const row = await getDialogueMessageForEdit(messageId);
  if (!row || row.deletedAt) return { error: "Diese Nachricht existiert nicht mehr." };
  if (row.authorUserId !== session.userId) {
    return { error: "Du kannst nur eigene Nachrichten bearbeiten." };
  }

  return { sourceMd: row.sourceMd };
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
    if (user?.role !== "gm" && user?.role !== "admin") {
      return { error: "Du darfst dieses Gespräch nicht abschließen." };
    }
  }

  await completeDialogue(entry.id);

  revalidateArchiveEntry(entrySlug);
  revalidatePath(`/archive/${entrySlug}`);

  // Charakter-Abonnenten benachrichtigen (nur beim Abschließen, nicht bei
  // Erstellung/pro Antwort — siehe getCharacterSubscribers/
  // sendCharacterDialogueClosedEmail). Map dedupliziert automatisch, falls
  // jemand beide Teilnehmer-Charaktere abonniert hat.
  const recipients = new Map<string, string>();
  for (const p of entry.participants) {
    for (const s of await getCharacterSubscribers(p.slug)) {
      recipients.set(s.email, s.name);
    }
  }
  if (recipients.size > 0) {
    const dialogueUrl = `${await getBaseUrl()}/archive/${entrySlug}`;
    const characterNames = entry.participants.map((p) => p.name).join(" & ");
    for (const [email, name] of recipients) {
      await sendCharacterDialogueClosedEmail({
        to: email,
        name,
        characterName: characterNames,
        dialogueTitle: entry.title,
        dialogueUrl,
      });
    }
  }

  redirect(`/archive/${entrySlug}`);
}
