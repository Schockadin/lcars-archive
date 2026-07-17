"use server";
import { redirect } from "next/navigation";
import { verifySession, requireMatchingFormUserId } from "@/lib/dal";
import {
  getCharactersForUser,
  getCharactersWithPlayers,
} from "@/lib/characters";
import { DialogueSlugCollisionError, createDialogue } from "@/lib/dialogues";
import { sendDialogueStartedEmail } from "@/lib/mail";
import { sendPushToUser } from "@/lib/push";
import { getBaseUrl } from "@/lib/http";
import { parseList } from "@/lib/formParsing";

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
  const ownCharacters = await getCharactersForUser(session.userId);
  if (!ownCharacters.some((c) => c.id === ownCharacterId)) {
    return { error: "Ungültiger eigener Charakter." };
  }
  const partnerCharacters = await getCharactersWithPlayers(session.userId);
  if (
    !partnerCharacterIds.every((id) => partnerCharacters.some((c) => c.id === id))
  ) {
    return { error: "Ungültiger Gesprächspartner." };
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
      subscribeSelf,
    });
    slug = result.slug;
    partners = result.partners;
    fromCharacterName = result.fromCharacterName;
  } catch (err) {
    if (err instanceof DialogueSlugCollisionError) {
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
        console.error(
          `Gespräch-begonnen-Mail an ${partner.email} fehlgeschlagen: ${result.error}`,
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

  redirect(`/dialogues/${slug}`);
}
