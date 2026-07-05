"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import {
  getCharactersForUser,
  getCharactersWithPlayers,
} from "@/lib/characters";
import { DialogueSlugCollisionError, createDialogue } from "@/lib/dialogues";
import { MAX_TITLE_LENGTH } from "@/lib/validation";

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
    redirect(`/users/${session.userId}`);
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Bitte einen Titel angeben." };
  if (title.length > MAX_TITLE_LENGTH) {
    return {
      error: `Titel darf höchstens ${MAX_TITLE_LENGTH} Zeichen lang sein.`,
    };
  }

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
  // assignCharacterAction in src/app/users/actions.ts.
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
  } catch (err) {
    if (err instanceof DialogueSlugCollisionError) {
      return { error: err.message };
    }
    throw err;
  }

  redirect(`/dialogues/${slug}`);
}
