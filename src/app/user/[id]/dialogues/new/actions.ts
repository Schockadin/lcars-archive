"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import {
  getCharactersForUser,
  getCharactersWithPlayers,
} from "@/lib/characters";
import { DialogueSlugCollisionError, createDialogue } from "@/lib/dialogues";
import { sendDialogueStartedEmail } from "@/lib/mail";
import { sendPushToUser } from "@/lib/push";
import { getBaseUrl } from "@/lib/http";

export interface CreateDialogueState {
  error?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function createDialogueAction(
  _state: CreateDialogueState,
  formData: FormData,
): Promise<CreateDialogueState> {
  const session = await verifySession();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect(`/user/${session.userId}`);
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Bitte einen Titel angeben." };

  const ownCharacterId = Number(formData.get("ownCharacterId"));
  const partnerCharacterId = Number(formData.get("partnerCharacterId"));
  if (
    !Number.isInteger(ownCharacterId) ||
    !Number.isInteger(partnerCharacterId) ||
    ownCharacterId === partnerCharacterId
  ) {
    return { error: "Bitte zwei unterschiedliche Charaktere auswählen." };
  }

  // Nie den <select>-Werten aus dem Client blind vertrauen — wie
  // assignCharacterAction in src/app/admin/actions.ts.
  const ownCharacters = await getCharactersForUser(session.userId);
  if (!ownCharacters.some((c) => c.id === ownCharacterId)) {
    return { error: "Ungültiger eigener Charakter." };
  }
  const partnerCharacters = await getCharactersWithPlayers(session.userId);
  if (!partnerCharacters.some((c) => c.id === partnerCharacterId)) {
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

  const tags = [
    ...new Set(
      String(formData.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];

  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  if (!bodyMarkdown) return { error: "Bitte eine erste Nachricht schreiben." };

  // Checkbox: nur bei angehaktem Feld in der FormData enthalten (Wert "on").
  const subscribeSelf = formData.get("subscribeSelf") === "on";

  let slug: string;
  let partner: Awaited<ReturnType<typeof createDialogue>>["partner"];
  let fromCharacterName: string;
  try {
    const result = await createDialogue({
      title,
      ownCharacterId,
      partnerCharacterId,
      authorUserId: session.userId,
      setting,
      locationSlug,
      logDate,
      tags,
      bodyMarkdown,
      subscribeSelf,
    });
    slug = result.slug;
    partner = result.partner;
    fromCharacterName = result.fromCharacterName;
  } catch (err) {
    if (err instanceof DialogueSlugCollisionError) {
      return { error: err.message };
    }
    throw err;
  }

  // Der Gesprächspartner konnte dem Anlegen nicht zustimmen — anders als bei
  // neuen Nachrichten (postDialogueMessageAction) ist er hier noch nicht
  // "Abonnent" im Sinne einer eigenen Wahl, bekommt die Info-Mail also immer
  // (kein Opt-in nötig), sofern er E-Mail-Benachrichtigungen grundsätzlich
  // aktiviert hat.
  if (partner) {
    const dialogueUrl = `${await getBaseUrl()}/dialogues/${slug}`;
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
