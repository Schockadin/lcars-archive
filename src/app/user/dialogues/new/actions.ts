"use server";
import { redirect } from "next/navigation";
import { verifySession, requireMatchingFormUserId } from "@/lib/dal";
import { canPlayNpcs, canView, getViewer } from "@/lib/visibility";
import {
  getCharactersForUser,
  getCharactersWithPlayers,
} from "@/lib/characters";
import { getNpcOptions } from "@/lib/archive";
import { parseSpeakerKey, sameSpeaker } from "@/lib/dialogueSpeaker";
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

  // Sprechende kommen als Schlüssel ("c12" = Charakter, "n7" =
  // NPC-Datenbank-Eintrag, siehe src/lib/dialogueSpeaker.ts) — Charaktere und
  // NPCs stehen in derselben Auswahl, ohne dass ihre IDs kollidieren können.
  const ownSpeaker = parseSpeakerKey(String(formData.get("ownSpeaker") ?? ""));
  const partnerSpeakers = [
    ...new Map(
      formData
        .getAll("partners")
        .map((v) => parseSpeakerKey(String(v)))
        .filter((sp): sp is NonNullable<typeof sp> => sp != null)
        .map((sp) => [`${sp.kind}:${sp.id}`, sp] as const),
    ).values(),
  ];
  if (
    !ownSpeaker ||
    partnerSpeakers.length === 0 ||
    partnerSpeakers.some((sp) => sameSpeaker(sp, ownSpeaker))
  ) {
    return {
      error: "Bitte den eigenen und mindestens einen weiteren Charakter auswählen.",
    };
  }

  // Nie den <select>-Werten aus dem Client blind vertrauen — wie
  // assignCharacterAction in src/app/admin/actions.ts.
  const viewer = await getViewer();
  const playsNpcs = canPlayNpcs(viewer);
  // NPCs (Datenbank-Einträge der Kategorie "npc") stehen als Gesprächspartner offen, soweit
  // diese Person sie überhaupt sehen darf; als EIGENER Sprecher-Charakter nur
  // denen, die NPCs spielen (Spielleitung/Administration).
  const npcs = (await getNpcOptions()).filter((npc) =>
    canView(npc.visibility, npc.ownerUserId, viewer),
  );
  const ownCharacters = await getCharactersForUser(session.userId);
  const ownIsNpc = ownSpeaker.kind === "npc";
  const isKnownNpc = (id: number) => npcs.some((n) => n.id === id);
  if (
    ownIsNpc
      ? !(playsNpcs && isKnownNpc(ownSpeaker.id))
      : !ownCharacters.some((c) => c.id === ownSpeaker.id)
  ) {
    return { error: "Ungültiger eigener Charakter." };
  }
  const partnerCharacters = await getCharactersWithPlayers(session.userId);
  if (
    !partnerSpeakers.every((sp) =>
      sp.kind === "npc"
        ? isKnownNpc(sp.id)
        : partnerCharacters.some((c) => c.id === sp.id),
    )
  ) {
    return { error: "Ungültiger Gesprächspartner." };
  }

  // Ist ein NPC beteiligt, muss ein GM-Konto benannt sein, das für ihn
  // schreibt. Die Spielleitung spielt ihre NPCs selbst; wählt eine
  // Spieler:in einen NPC als Gegenüber, kommt die Auswahl aus dem Formular
  // (bzw. bei genau einer Spielleitung automatisch diese).
  const npcInvolved = ownIsNpc || partnerSpeakers.some((sp) => sp.kind === "npc");
  let npcSpeakerUserId: number | null = null;
  if (npcInvolved) {
    if (playsNpcs) {
      // Wer NPCs selbst spielt, schreibt auch selbst für sie — dafür braucht
      // es keine weitere Spielleitung (canPlayNpcs schließt die
      // Administration ein, die in kleinen Runden dieselbe Person ist).
      npcSpeakerUserId = session.userId;
    } else {
      const gms = await listGmUsers();
      if (gms.length === 0) {
        return {
          error:
            "Für Gespräche mit NPCs muss es mindestens ein Konto mit Spielleitungs-Rechten geben.",
        };
      }
      // Nur eine echte ID (> 0) zählt als getroffene Wahl: fehlt das Feld,
      // ist Number(null) gleich 0 und damit eine ganze Zahl — der Fallback
      // „genau eine Spielleitung, also keine Wahl nötig" (siehe
      // CreateDialogueForm) wäre sonst unerreichbar und das Formular liefe
      // ohne Feld in eine Fehlermeldung.
      const raw = Number(formData.get("npcSpeakerUserId"));
      const chosen =
        Number.isInteger(raw) && raw > 0
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
      ownSpeaker,
      partners: partnerSpeakers,
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
