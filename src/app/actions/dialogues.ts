"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { getUserById, updateDialogueViewPreference } from "@/lib/users";
import {
  DialogueClosedError,
  DialogueMessageForbiddenError,
  DialogueMessageNotFoundError,
  DialogueSelfReplyError,
  DialogueLockActiveError,
  DialogueReservationRequiredError,
  getDialogueForPlay,
  getDialogueParticipant,
  getDialogueSubscribers,
  getCharacterSubscribers,
  getDialogueParticipantPlayers,
  getDialogueMessageForEdit,
  getDialogueMessages,
  getDialogueLockStatus,
  postDialogueMessage,
  editDialogueMessage,
  deleteDialogueMessage,
  completeDialogue,
  deleteDialogue,
  inviteDialogueParticipants,
  reserveDialogueReply,
  requestDialogueReservationNotification,
  type DialogueEmailTarget,
  type ReleasedReservationInfo,
  type DialogueMessage,
  type DialogueLockStatus,
} from "@/lib/dialogues";
import { canReplyToDialogue } from "@/lib/dialogueLock";
import {
  sendDialogueMessageEmail,
  sendCharacterDialogueClosedEmail,
  sendDialogueDeletedEmail,
  sendDialogueInvitedEmail,
  sendDialogueReservationEndedEmail,
} from "@/lib/mail";
import { sendPushToUser } from "@/lib/push";
import { getBaseUrl } from "@/lib/http";
import { revalidateArchiveEntry } from "@/lib/revalidate";
import { synopsisExcerpt } from "@/lib/missionFormat";
import { logCaughtError } from "@/lib/errorLog";

export interface DialogueMessageState {
  error?: string;
  success?: boolean;
}

// Jede Prüfung serverseitig, nie auf ausgeblendete UI verlassen — exakt
// das bestehende Prinzip aus src/app/admin/actions.ts. Sichtbarkeit des
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
    if (err instanceof DialogueSelfReplyError) {
      return { error: err.message };
    }
    if (
      err instanceof DialogueLockActiveError ||
      err instanceof DialogueReservationRequiredError
    ) {
      return { error: err.message };
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
          const message = `Dialog-Nachrichten-Mail an ${subscriber.email} fehlgeschlagen: ${result.error}`;
          console.error(message);
          void logCaughtError(
            new Error(message),
            "actions/dialogues.ts:postDialogueMessageAction",
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

  // Rollen-Check DB-frisch (analog completeDialogueAction) — nur Admins
  // dürfen als Moderation auch fremde und Nachrichten in bereits
  // abgeschlossenen Dialogen bearbeiten (GM ausdrücklich nicht, anders als
  // bei completeDialogueAction).
  const user = await getUserById(session.userId);
  const isModerator = user?.role === "admin";

  try {
    await editDialogueMessage({
      messageId,
      authorUserId: session.userId,
      bodyMarkdown,
      isModerator,
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

  // Ein offener Dialog lebt unter /dialogues, ein geschlossener unter
  // /archive (siehe Redirect in beiden Seiten) — welcher zutrifft, ist hier
  // nicht bekannt, deshalb werden vorsichtshalber beide invalidiert (nötig
  // erst seit Moderations-Edits auch auf geschlossenen Dialogen möglich sind).
  revalidatePath(`/dialogues/${entrySlug}`);
  revalidateArchiveEntry(entrySlug);
  revalidatePath(`/archive/${entrySlug}`);
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

  const user = await getUserById(session.userId);
  const isModerator = user?.role === "admin";

  try {
    await deleteDialogueMessage({
      messageId,
      authorUserId: session.userId,
      isModerator,
    });
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
  revalidateArchiveEntry(entrySlug);
  revalidatePath(`/archive/${entrySlug}`);
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
    const user = await getUserById(session.userId);
    if (user?.role !== "admin") {
      return { error: "Du kannst nur eigene Nachrichten bearbeiten." };
    }
  }

  return { sourceMd: row.sourceMd };
}

export interface DialogueSnapshot {
  open: boolean;
  messages: DialogueMessage[];
  lockStatus: DialogueLockStatus | null;
  canReplyNow: boolean;
}

const CLOSED_SNAPSHOT: DialogueSnapshot = {
  open: false,
  messages: [],
  lockStatus: null,
  canReplyNow: false,
};

// Grundlage für das Polling in DialogueLiveView.tsx (Live-Aktualisierung
// offener Dialoge ohne manuelles Neuladen, siehe dortiger Kommentar) — ein
// kompletter Snapshot statt Delta, damit Bearbeitungen/Soft-Deletes an
// bestehenden Nachrichten automatisch mit abgedeckt sind. Bewusst OHNE
// alreadyRequestedNotify (ändert sich selten, würde jeden Poll unnötig
// verteuern — bleibt ein reiner SSR-Initialwert in DialogueLockPanel).
// open: false deckt sowohl "Dialog während des Betrachtens gelöscht" als
// auch "kein Teilnehmer (mehr)" ab — DialogueLiveView stoppt das Polling in
// beiden Fällen und zeigt einen Hinweis.
export async function getDialogueSnapshotAction(
  entrySlug: string,
): Promise<DialogueSnapshot> {
  const session = await getSession();
  if (!session) return CLOSED_SNAPSHOT;

  const entry = await getDialogueForPlay(entrySlug);
  if (!entry || !entry.open) return CLOSED_SNAPSHOT;

  const participant = await getDialogueParticipant(entry.id, session.userId);
  const viewer = await getUserById(session.userId);
  if (!participant && viewer?.role !== "gm" && viewer?.role !== "admin") {
    return CLOSED_SNAPSHOT;
  }

  const multiParty = entry.participants.length > 2;
  const [messages, lockStatus] = await Promise.all([
    getDialogueMessages(entry.id),
    multiParty ? getDialogueLockStatus(entry.id) : Promise.resolve(null),
  ]);
  const canReplyNow = canReplyToDialogue(
    entry.participants.length,
    lockStatus,
    session.userId,
  );

  return { open: true, messages, lockStatus, canReplyNow };
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
          const message = `Gespräch-abgeschlossen-Mail an ${recipient.email} fehlgeschlagen: ${result.error}`;
          console.error(message);
          void logCaughtError(
            new Error(message),
            "actions/dialogues.ts:completeDialogueAction",
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
        const message = `Gespräch-gelöscht-Mail an ${player.email} fehlgeschlagen: ${result.error}`;
        console.error(message);
        void logCaughtError(new Error(message), "actions/dialogues.ts:deleteDialogueAction");
      }
    }
  }

  redirect("/archive?cat=dialogue");
}

// Globale Präferenz (nicht pro Dialog, siehe DialogueViewToggle.tsx) —
// direkt aus einem Client-onClick aufgerufen, kein useActionState-Formular
// nötig (keine Fehleranzeige gebraucht: nicht eingeloggt heißt einfach
// no-op, der Umschalter wird eingeloggten Betrachtern ohnehin nur
// angezeigt).
export async function setDialogueViewPreferenceAction(
  flowingTextEnabled: boolean,
  entrySlug: string,
): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await updateDialogueViewPreference(session.userId, flowingTextEnabled);
  revalidatePath(`/archive/${entrySlug}`);
}

// Verschickt Mail/Push an alle, die "informiere mich, wenn die Sperre
// endet" angeklickt hatten (siehe dialogueReservationNotifyAction) — genutzt
// von reserveDialogueReplyAction, wenn dabei nebenbei eine abgelaufene
// fremde Reservierung aufgeräumt wird (siehe
// releaseExpiredDialogueReservation in dialoguesCore.ts).
async function notifyReservationReleased(
  released: ReleasedReservationInfo | null,
): Promise<void> {
  if (!released || released.notifyTargets.length === 0) return;

  const dialogueUrl = `${await getBaseUrl()}/dialogues/${released.dialogueSlug}`;
  for (const target of released.notifyTargets) {
    if (target.emailNotificationsEnabled) {
      const result = await sendDialogueReservationEndedEmail({
        to: target.email,
        name: target.name,
        dialogueTitle: released.dialogueTitle,
        dialogueUrl,
      });
      if (!result.sent) {
        const message = `Sperre-aufgehoben-Mail an ${target.email} fehlgeschlagen: ${result.error}`;
        console.error(message);
        void logCaughtError(
          new Error(message),
          "actions/dialogues.ts:notifyReservationReleased",
        );
      }
    }
    if (target.pushNotificationsEnabled) {
      await sendPushToUser(target.id, {
        title: `Antwort-Sperre in "${released.dialogueTitle}" aufgehoben`,
        body: "Du kannst jetzt antworten.",
        url: dialogueUrl,
      });
    }
  }
}

export interface InviteParticipantState {
  error?: string;
}

// Nur der Owner (wer den Dialog begonnen hat, siehe createDialogue) darf
// weitere Personen einladen — jederzeit, auch in einem bereits laufenden
// Dialog. Direkt-Hinzufügen ohne Annehmen/Ablehnen, nur eine Info-Mail an
// die neu Eingeladenen. Direkt aus einem Client-onClick aufgerufen
// (useTransition), kein useActionState-Formular nötig.
export async function inviteDialogueParticipantAction(
  entrySlug: string,
  characterIds: number[],
): Promise<InviteParticipantState> {
  const session = await getSession();
  if (!session) return { error: "Bitte melde dich an." };

  const entry = await getDialogueForPlay(entrySlug);
  if (!entry) return { error: "Dieser Dialog existiert nicht." };
  if (entry.ownerUserId !== session.userId) {
    return { error: "Nur der Ersteller kann weitere Personen einladen." };
  }
  if (characterIds.length === 0) return {};

  const inviter = await getUserById(session.userId);
  let title: string;
  let invited: DialogueEmailTarget[];
  try {
    ({ title, invited } = await inviteDialogueParticipants(
      entry.id,
      characterIds,
    ));
  } catch {
    // TOCTOU: der Dialog wurde zwischen dem obigen getDialogueForPlay-Check
    // und diesem Aufruf gelöscht (siehe deleteDialogueAction) — kein
    // ungefangener 500er, sondern eine normale Formular-Fehlermeldung.
    return { error: "Dieser Dialog existiert nicht mehr." };
  }

  revalidatePath(`/dialogues/${entrySlug}`);
  revalidateArchiveEntry(entrySlug);
  revalidatePath(`/archive/${entrySlug}`);

  if (invited.length > 0) {
    const dialogueUrl = `${await getBaseUrl()}/dialogues/${entrySlug}`;
    for (const target of invited) {
      if (target.emailNotificationsEnabled) {
        const result = await sendDialogueInvitedEmail({
          to: target.email,
          name: target.name,
          invitedByName: inviter?.name ?? "Die Administration",
          dialogueTitle: title,
          dialogueUrl,
        });
        if (!result.sent) {
          const message = `Einladungs-Mail an ${target.email} fehlgeschlagen: ${result.error}`;
          console.error(message);
          void logCaughtError(
            new Error(message),
            "actions/dialogues.ts:inviteDialogueParticipantAction",
          );
        }
      }
      if (target.pushNotificationsEnabled) {
        await sendPushToUser(target.id, {
          title: `Zum Gespräch "${title}" hinzugefügt`,
          body: `${inviter?.name ?? "Die Administration"} hat dich hinzugefügt.`,
          url: dialogueUrl,
        });
      }
    }
  }

  return {};
}

export interface ReserveReplyState {
  error?: string;
}

// Reserviert für 2 Stunden exklusiv das Antwortrecht in einem Dialog mit
// mehr als zwei Teilnehmenden (siehe DialogueLockPanel.tsx). Nur Teilnehmer
// dürfen reservieren. Der >2-Teilnehmenden-Check spiegelt exakt die Regel in
// postDialogueMessage — ohne ihn ließe sich diese Action direkt (am UI
// vorbei) auch für einen 2-Personen-Dialog aufrufen und eine Reservierung
// anlegen, die postDialogueMessage dort nie prüft und die deshalb nie mehr
// aufgeräumt würde (dead state).
export async function reserveDialogueReplyAction(
  entrySlug: string,
): Promise<ReserveReplyState> {
  const session = await getSession();
  if (!session) return { error: "Bitte melde dich an." };

  const entry = await getDialogueForPlay(entrySlug);
  if (!entry) return { error: "Dieser Dialog existiert nicht." };
  if (entry.participants.length <= 2) {
    return { error: "Für dieses Gespräch ist keine Reservierung nötig." };
  }

  const participant = await getDialogueParticipant(entry.id, session.userId);
  if (!participant) {
    return { error: "Du bist kein Teilnehmer dieses Gesprächs." };
  }

  try {
    const { released } = await reserveDialogueReply(entry.id, session.userId);
    await notifyReservationReleased(released);
  } catch (err) {
    if (err instanceof DialogueLockActiveError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath(`/dialogues/${entrySlug}`);
  return {};
}

// Einmal-Opt-in "informiere mich, wenn die aktuelle Antwort-Sperre endet"
// (siehe DialogueLockPanel.tsx) — direkt aus einem Client-onClick
// aufgerufen, kein Fehlerzustand in der UI vorgesehen, deshalb weiterhin
// Promise<void>. Teilnehmer-Check UND >2-Teilnehmenden-Check trotzdem nötig
// (nicht nur UI-Kosmetik): ohne sie könnte jede eingeloggte Person über
// diese Action für einen ihr fremden Dialog Mail/Push-Benachrichtigungen
// (inkl. Titel/Link) abonnieren, auch wenn sie gar nicht teilnimmt.
export async function dialogueReservationNotifyAction(
  entrySlug: string,
): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const entry = await getDialogueForPlay(entrySlug);
  if (!entry || entry.participants.length <= 2) return;

  const participant = await getDialogueParticipant(entry.id, session.userId);
  if (!participant) return;

  await requestDialogueReservationNotification(entry.id, session.userId);
  revalidatePath(`/dialogues/${entrySlug}`);
}
