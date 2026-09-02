"use server";
import { redirect } from "next/navigation";
import {
  verifySession,
  requireMatchingFormUserId,
  getCurrentUserPermissions,
} from "@/lib/dal";
import {
  getCharactersForUser,
  getCharactersWithPlayers,
  getNpcCharacterOptions,
} from "@/lib/characters";
import { listGmUsers, getUserById } from "@/lib/users";
import {
  DialogueNpcSpeakerRequiredError,
  DialogueSlugCollisionError,
  createDialogue,
  getActiveGMs,
} from "@/lib/dialogues";
import { sendDialogueStartedEmail, sendNewDialogueGmNotificationEmail } from "@/lib/mail";
import { sendPushToUser } from "@/lib/push";
import { getBaseUrl } from "@/lib/http";
import { parseList } from "@/lib/formParsing";
import { logCaughtError } from "@/lib/errorLog";

export interface CreateDialogueState {
  error?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function createDialogueAction(
  _state: CreateDialogueState,
  formData: FormData,
): Promise<CreateDialogueState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Bitte einen Titel angeben." };

  const ownCharacterId = Number(formData.get("ownCharacterId"));
  const partnerCharacterIds = [
    ...new Set(
      formData.getAll("partnerCharacterIds").map((v) => Number(v)),
    ),
  ];
  if (
    !Number.isInteger(ownCharacterId) ||
    partnerCharacterIds.length === 0 ||
    partnerCharacterIds.some((id) => !Number.isInteger(id)) ||
    partnerCharacterIds.includes(ownCharacterId)
  ) {
    return {
      error: "Bitte den eigenen und mindestens einen weiteren Charakter auswählen.",
    };
  }

  // Nie den <select>-Werten aus dem Client blind vertrauen — wie
  // assignCharacterAction in src/app/admin/actions.ts.
  const isGm = (await getCurrentUserPermissions()).has("gm.access");
  // NPCs (Charaktere ohne Spieler) stehen als Gesprächspartner offen; als
  // EIGENER Sprecher-Charakter nur der Spielleitung (sie spielt die NPCs).
  const npcs = await getNpcCharacterOptions(isGm);
  const ownCharacters = await getCharactersForUser(session.userId);
  const ownIsNpc = npcs.some((c) => c.id === ownCharacterId);
  if (
    !ownCharacters.some((c) => c.id === ownCharacterId) &&
    !(isGm && ownIsNpc)
  ) {
    return { error: "Ungültiger eigener Charakter." };
  }
  const partnerCharacters = await getCharactersWithPlayers(session.userId);
  if (
    !partnerCharacterIds.every(
      (id) =>
        partnerCharacters.some((c) => c.id === id) ||
        npcs.some((c) => c.id === id),
    )
  ) {
    return { error: "Ungültiger Gesprächspartner." };
  }

  // Ist ein NPC beteiligt, muss ein GM-Konto benannt sein, das für ihn
  // schreibt. Die Spielleitung spielt ihre NPCs selbst; wählt eine
  // Spieler:in einen NPC als Gegenüber, kommt die Auswahl aus dem Formular
  // (bzw. bei genau einer Spielleitung automatisch diese).
  const npcInvolved =
    ownIsNpc || partnerCharacterIds.some((id) => npcs.some((c) => c.id === id));
  let npcSpeakerUserId: number | null = null;
  if (npcInvolved) {
    const gms = await listGmUsers();
    if (gms.length === 0) {
      return {
        error:
          "Für Gespräche mit NPCs muss es mindestens ein Konto mit Spielleitungs-Rechten geben.",
      };
    }
    if (isGm) {
      npcSpeakerUserId = session.userId;
    } else {
      const raw = Number(formData.get("npcSpeakerUserId"));
      const chosen = Number.isInteger(raw)
        ? gms.find((gm) => gm.id === raw)
        : gms.length === 1
          ? gms[0]
          : undefined;
      if (!chosen) {
        return { error: "Bitte die Spielleitung für die NPCs auswählen." };
      }
      npcSpeakerUserId = chosen.id;
    }
  }

  const setting = String(formData.get("setting") ?? "").trim() || null;
  const locationSlug =
    String(formData.get("locationSlug") ?? "").trim() || null;

  const logDateRaw = String(formData.get("logDate") ?? "").trim();
  if (logDateRaw && !DATE_RE.test(logDateRaw)) {
    return { error: "Ungültiges Datum." };
  }
  const logDate = logDateRaw || null;

  const tags = parseList(formData.get("tags"));

  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte eine erste Nachricht schreiben." };

  // Checkbox: nur bei angehaktem Feld in der FormData enthalten (Wert "on").
  const subscribeSelf = formData.get("subscribeSelf") === "on";

  let slug: string;
  let partners: Awaited<ReturnType<typeof createDialogue>>["partners"];
  let fromCharacterName: string;
  let participantNames: string[];
  try {
    const result = await createDialogue({
      title,
      ownCharacterId,
      partnerCharacterIds,
      authorUserId: session.userId,
      setting,
      locationSlug,
      logDate,
      tags,
      bodyMarkdown,
      npcSpeakerUserId,
      subscribeSelf,
    });
    slug = result.slug;
    partners = result.partners;
    fromCharacterName = result.fromCharacterName;
    participantNames = result.participantNames;
  } catch (err) {
    if (
      err instanceof DialogueSlugCollisionError ||
      err instanceof DialogueNpcSpeakerRequiredError
    ) {
      return { error: err.message };
    }
    throw err;
  }

  // Kein Partner konnte dem Anlegen zustimmen — anders als bei neuen
  // Nachrichten (postDialogueMessageAction) sind sie hier noch keine
  // "Abonnenten" im Sinne einer eigenen Wahl, bekommen die Info-Mail also
  // immer (kein Opt-in nötig), sofern E-Mail-Benachrichtigungen grundsätzlich
  // aktiviert sind. Sequentiell statt Promise.all (gleiches Muster wie
  // postDialogueMessageAction) — parallele Resend-Aufrufe riskieren bei
  // mehreren Empfängern gleichzeitig ein Rate-Limit.
  const dialogueUrl = `${await getBaseUrl()}/dialogues/${slug}`;
  for (const partner of partners) {
    if (partner.emailNotificationsEnabled) {
      const result = await sendDialogueStartedEmail({
        to: partner.email,
        name: partner.name,
        fromCharacterName,
        dialogueTitle: title,
        dialogueUrl,
      });
      if (!result.sent) {
        const message = `Gespräch-begonnen-Mail an ${partner.email} fehlgeschlagen: ${result.error}`;
        console.error(message);
        void logCaughtError(
          new Error(message),
          "user/dialogues/new/actions.ts:createDialogueAction",
        );
      }
    }
    if (partner.pushNotificationsEnabled) {
      await sendPushToUser(partner.id, {
        title: `Neues Gespräch: "${title}"`,
        body: `${fromCharacterName} hat ein Gespräch mit dir begonnen.`,
        url: dialogueUrl,
      });
    }
  }

  // Die Spielleitung, die hier für einen NPC schreibt, ist Gegenüber und
  // nicht bloß Aufsicht — sie bekommt dieselbe Info wie ein Partner-Spieler
  // (die GM-Oversight-Mail unten erreicht nur `role = 'gm'` und lässt z.B.
  // ein Admin-Konto mit Rechte-Override aus). Wer selbst angelegt hat, wird
  // über die eigene Aktion nicht benachrichtigt.
  if (npcSpeakerUserId != null && npcSpeakerUserId !== session.userId) {
    const speaker = await getUserById(npcSpeakerUserId);
    if (speaker?.email_notifications_enabled) {
      const result = await sendDialogueStartedEmail({
        to: speaker.email,
        name: speaker.name,
        fromCharacterName,
        dialogueTitle: title,
        dialogueUrl,
      });
      if (!result.sent) {
        const message = `Gespräch-begonnen-Mail an ${speaker.email} fehlgeschlagen: ${result.error}`;
        console.error(message);
        void logCaughtError(
          new Error(message),
          "user/dialogues/new/actions.ts:createDialogueAction",
        );
      }
    }
    if (speaker?.push_notifications_enabled) {
      await sendPushToUser(speaker.id, {
        title: `Neues Gespräch: "${title}"`,
        body: `${fromCharacterName} hat ein Gespräch mit einem deiner NPCs begonnen.`,
        url: dialogueUrl,
      });
    }
  }

  // GM-Oversight: alle aktiven GM-Accounts bekommen unabhängig von eigener
  // Teilnahme eine Info (siehe getAllOpenDialoguesForGM/"Gespräche" im
  // GM-Menü) — bereits als Partner benachrichtigte GMs (partnerIds) nicht
  // ein zweites Mal.
  const partnerIds = new Set(partners.map((p) => p.id));
  if (npcSpeakerUserId != null) partnerIds.add(npcSpeakerUserId);
  for (const gm of await getActiveGMs(session.userId)) {
    if (partnerIds.has(gm.id)) continue;
    if (gm.emailNotificationsEnabled) {
      const result = await sendNewDialogueGmNotificationEmail({
        to: gm.email,
        name: gm.name,
        participantNames,
        dialogueTitle: title,
        dialogueUrl,
      });
      if (!result.sent) {
        const message = `Neues-Gespräch-GM-Mail an ${gm.email} fehlgeschlagen: ${result.error}`;
        console.error(message);
        void logCaughtError(
          new Error(message),
          "user/dialogues/new/actions.ts:createDialogueAction",
        );
      }
    }
    if (gm.pushNotificationsEnabled) {
      await sendPushToUser(gm.id, {
        title: `Neues Gespräch: "${title}"`,
        body: `${participantNames.join(", ")} haben ein Gespräch begonnen.`,
        url: dialogueUrl,
      });
    }
  }

  redirect(`/dialogues/${slug}`);
}
