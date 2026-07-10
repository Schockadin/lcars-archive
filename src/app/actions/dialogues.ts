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
  getDialogueSubscribers,
  getCharacterSubscribers,
  getDialogueParticipantPlayers,
  getDialogueMessageForEdit,
  postDialogueMessage,
  editDialogueMessage,
  deleteDialogueMessage,
  completeDialogue,
  deleteDialogue,
  type DialogueEmailTarget,
} from "@/lib/dialogues";
import {
  sendDialogueMessageEmail,
  sendCharacterDialogueClosedEmail,
  sendDialogueDeletedEmail,
} from "@/lib/mail";
import { sendPushToUser } from "@/lib/push";
import { getBaseUrl } from "@/lib/http";
import { revalidateArchiveEntry } from "@/lib/revalidate";
import { synopsisExcerpt } from "@/lib/missionFormat";

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

  // Nur wer diesen Dialog abonniert hat (Default beim Anlegen, dort und auf
  // der Dialog-Seite abbestellbar) bekommt eine Mail — statt bedingungslos
  // den anderen Teilnehmer zu benachrichtigen. Sequentiell statt Promise.all
  // (gleiches Muster wie scripts/ingest/notify.ts) — parallele Resend-Aufrufe
  // riskieren bei mehreren Empfängern gleichzeitig ein Rate-Limit, wodurch
  // einzelne Mails ohne Fehlermeldung verloren gehen könnten; das Ergebnis
  // wird jetzt außerdem geloggt statt stillschweigend verworfen.
  const subscribers = await getDialogueSubscribers(entrySlug, session.userId);
  if (subscribers.length > 0) {
    const dialogueUrl = `${await getBaseUrl()}/dialogues/${entrySlug}`;
    // Roher Markdown-Text statt gerendertem HTML — für eine kurze Vorschau
    // reicht der angerissene Rohtext, ein voller Markdown→Text-Parser wäre
    // hier unnötiger Aufwand (gleiches Prinzip wie stripHtml für HTML-Inhalte
    // an anderen Vorschau-Stellen).
    const preview = synopsisExcerpt(bodyMarkdown, 140);
    for (const subscriber of subscribers) {
      if (subscriber.emailNotificationsEnabled) {
        const result = await sendDialogueMessageEmail({
          to: subscriber.email,
          name: subscriber.name,
          fromCharacterName: participant.characterName,
          dialogueTitle: entry.title,
          dialogueUrl,
          preview,
        });
        if (!result.sent) {
          console.error(
            `Dialog-Nachrichten-Mail an ${subscriber.email} fehlgeschlagen: ${result.error}`,
          );
        }
      }
      if (subscriber.pushNotificationsEnabled) {
        await sendPushToUser(subscriber.id, {
          title: `Neue Nachricht in "${entry.title}"`,
          body: `${participant.characterName}: ${preview}`,
          url: dialogueUrl,
        });
      }
    }
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
  if (!row || row.deletedAt)
    return { error: "Diese Nachricht existiert nicht mehr." };
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

  // Sowohl Charakter-Abonnenten (Fans, die keinem der beiden Teilnehmer
  // selbst entsprechen müssen) als auch die tatsächlichen Teilnehmer-Spieler
  // benachrichtigen — letztere unabhängig von einem Charakter-Abo, sonst
  // bekäme der jeweils andere Teilnehmer nur dann eine Mail, wenn er
  // zufällig den eigenen oder den Partner-Charakter abonniert hat (Bug: bei
  // fehlendem Abo bekam so je nach abschließender Person mal niemand, mal
  // fälschlich der Abschließende selbst eine Mail). Wer selbst abschließt,
  // muss über die eigene Aktion nicht per Mail informiert werden. Map
  // dedupliziert automatisch, falls jemand beide Teilnehmer-Charaktere
  // abonniert hat oder zugleich Teilnehmer ist.
  const recipients = new Map<number, DialogueEmailTarget>();
  for (const p of entry.participants) {
    for (const s of await getCharacterSubscribers(p.slug)) {
      recipients.set(s.id, s);
    }
  }
  for (const player of await getDialogueParticipantPlayers(
    entry.participants.map((p) => p.slug),
  )) {
    recipients.set(player.id, player);
  }
  recipients.delete(session.userId);
  if (recipients.size > 0) {
    const dialogueUrl = `${await getBaseUrl()}/archive/${entrySlug}`;
    const characterNames = entry.participants.map((p) => p.name).join(" & ");
    for (const recipient of recipients.values()) {
      if (recipient.emailNotificationsEnabled) {
        const result = await sendCharacterDialogueClosedEmail({
          to: recipient.email,
          name: recipient.name,
          characterName: characterNames,
          dialogueTitle: entry.title,
          dialogueUrl,
        });
        if (!result.sent) {
          console.error(
            `Gespräch-abgeschlossen-Mail an ${recipient.email} fehlgeschlagen: ${result.error}`,
          );
        }
      }
      if (recipient.pushNotificationsEnabled) {
        await sendPushToUser(recipient.id, {
          title: `Gespräch mit ${characterNames} abgeschlossen`,
          body: entry.title,
          url: dialogueUrl,
        });
      }
    }
  }

  redirect(`/archive/${entrySlug}`);
}

export interface DeleteDialogueState {
  error?: string;
}

// Admin-only, unabhängig vom Open/Closed-Status (siehe deleteDialogue in
// src/lib/dialoguesCore.ts) — anders als completeDialogueAction dürfen
// Teilnehmer selbst nicht löschen, nur die Administration. Beide beteiligten
// Spieler bekommen eine Info-Mail, da ihr Gespräch komplett verschwindet
// (kein Push, das gibt es bisher nur für laufende Dialog-Ereignisse).
export async function deleteDialogueAction(
  _state: DeleteDialogueState,
  formData: FormData,
): Promise<DeleteDialogueState> {
  const session = await getSession();
  if (!session) {
    return { error: "Bitte melde dich an." };
  }

  const admin = await getUserById(session.userId);
  if (admin?.role !== "admin") {
    return { error: "Nur die Administration kann Gespräche löschen." };
  }

  const entrySlug = String(formData.get("entrySlug") ?? "");
  const entry = await getDialogueForPlay(entrySlug);
  if (!entry) {
    return { error: "Dieser Dialog existiert nicht." };
  }

  const deleted = await deleteDialogue(entry.id, session.userId);
  if (!deleted) {
    return { error: "Löschen fehlgeschlagen." };
  }

  revalidateArchiveEntry(entrySlug);
  revalidatePath(`/archive/${entrySlug}`);
  revalidatePath(`/dialogues/${entrySlug}`);

  const players = await getDialogueParticipantPlayers(deleted.participantSlugs);
  for (const player of players) {
    if (player.emailNotificationsEnabled) {
      const result = await sendDialogueDeletedEmail({
        to: player.email,
        name: player.name,
        dialogueTitle: deleted.title,
      });
      if (!result.sent) {
        console.error(
          `Gespräch-gelöscht-Mail an ${player.email} fehlgeschlagen: ${result.error}`,
        );
      }
    }
  }

  redirect("/archive?cat=dialogue");
}
