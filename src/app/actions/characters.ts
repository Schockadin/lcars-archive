"use server";
import { getSession } from "@/lib/session";
import {
  updateOwnCharacterBio,
  getOwnCharacterForEdit,
  notifyCharacterSubscribers,
} from "@/lib/characters";
import { revalidateCharacter } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";

export interface CharacterBioEditState {
  error?: string;
  success?: boolean;
  updatedBio?: string | null;
}

// Inline-Bearbeitung der Biografie direkt auf /characters/[slug]
// (CharacterBioEditor) — schlanker als das volle Formular unter
// /user/[id]/characters/[characterId]/edit: nur die Biografie ändert sich,
// Name/Status/Metadaten bleiben unangetastet. Owner-only (analog
// updateOwnArchiveEntryAction in src/app/actions/archive.ts) —
// updateOwnCharacterBio scoped die Schreibung selbst auf player_id, ein
// Nicht-Owner trifft 0 Zeilen.
export async function updateOwnCharacterBioAction(
  _state: CharacterBioEditState,
  formData: FormData,
): Promise<CharacterBioEditState> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  const characterId = Number(formData.get("characterId"));
  if (!Number.isInteger(characterId)) {
    return { error: "Ungültiger Charakter." };
  }

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();

  // Opt-in "Automatisch verlinken" — Selbst-Ausschluss wie bei
  // updateOwnArchiveEntryAction, nur wenn überhaupt Text vorhanden ist.
  let bioHtml: string | undefined;
  if (bodyMarkdown && formData.get("autoLink") === "on") {
    const own = await getOwnCharacterForEdit(session.userId, characterId);
    const linked = await autoLinkMarkdown(
      bodyMarkdown,
      own ? { type: "character", slug: own.slug } : undefined,
    );
    bodyMarkdown = linked.sourceMd;
    bioHtml = linked.html;
  }

  const result = await updateOwnCharacterBio(
    session.userId,
    characterId,
    bodyMarkdown,
    bioHtml,
  );
  if (!result) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }

  revalidateCharacter(result.slug);
  await notifyCharacterSubscribers({
    characterSlug: result.slug,
    characterName: result.name,
    editingUserId: session.userId,
    bioMarkdown: bodyMarkdown || null,
  });

  return { success: true, updatedBio: result.bio };
}
