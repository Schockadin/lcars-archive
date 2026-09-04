"use server";
import { redirect } from "next/navigation";
import {
  verifySession,
  requireMatchingFormUserId,
  getRoleMap,
} from "@/lib/dal";
import { getUserById } from "@/lib/users";
import {
  createCharacter,
  updateOwnCharacterContent,
  getOwnCharacterForEdit,
  notifyCharacterSubscribers,
} from "@/lib/characters";
import { revalidateCharacter } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";
import { notifyContentChange } from "@/lib/follows";
import { getBaseUrl } from "@/lib/http";
import { synopsisExcerpt } from "@/lib/missionFormat";
import { userCan } from "@/lib/permissions";
import { readCharacterHead } from "./characterHead";

export interface CharacterFormState {
  error?: string;
}

// Vereint createCharacterAction + updateCharacterAction (vorher new/actions.ts
// + [characterId]/edit/actions.ts) zu einer Action für ContentEditor — Branch
// auf Vorhandensein von characterId statt zwei fast identischer Funktionen.
export async function characterAction(
  _state: CharacterFormState,
  formData: FormData,
): Promise<CharacterFormState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);

  const characterIdRaw = formData.get("characterId");
  const isEdit = characterIdRaw != null && characterIdRaw !== "";
  const characterId = isEdit ? Number(characterIdRaw) : null;
  if (isEdit && !Number.isInteger(characterId)) {
    return { error: "Ungültiger Charakter." };
  }

  // Gast-Check nur beim Anlegen (siehe createCharacterAction vorher) — die
  // Rolle wird frisch aus der DB geprüft, nicht aus dem Cookie, da eine
  // Selbstanlage player_id sofort auf den eigenen Account setzen würde.
  // Der geladene User wird weiter unten für notifyContentChange
  // wiederverwendet (authorName), statt ihn dafür ein zweites Mal zu laden.
  let currentUser = null;
  if (!isEdit) {
    currentUser = await getUserById(session.userId);
    if (
      !currentUser ||
      !userCan(currentUser, "content.create", await getRoleMap())
    ) {
      return { error: "Gast-Accounts können keine Charaktere anlegen." };
    }
  }

  // Stammdaten wie im Anlege-Assistenten lesen (siehe characterHead.ts) —
  // eine Auswertung für beide Wege statt zweier, die auseinanderlaufen.
  const headResult = await readCharacterHead(formData);
  if ("error" in headResult) return { error: headResult.error };
  const head = headResult.head;
  const name = head.name;

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();

  // Opt-in "Automatisch verlinken" — Selbstausschluss nur beim Bearbeiten
  // nötig (sonst könnte der eigene Name im Text auf sich selbst verlinken).
  let bioHtml: string | undefined;
  if (bodyMarkdown && formData.get("autoLink") === "on") {
    const selfExclusion = isEdit
      ? await getOwnCharacterForEdit(session.userId, characterId!)
      : null;
    const linked = await autoLinkMarkdown(
      bodyMarkdown,
      selfExclusion ? { type: "character", slug: selfExclusion.slug } : undefined,
    );
    bodyMarkdown = linked.sourceMd;
    bioHtml = linked.html;
  }

  // Im Entwurf-Modus (ContentEditor.tsx-Checkbox) — Charaktere haben ohnehin
  // schon immer eine optionale Bio (siehe Kommentar an updateOwnCharacterBio
  // in characters.ts), hier geht es also nur um Sichtbarkeit/Benachrichtigung.
  const isDraft = formData.get("isDraft") === "on";

  if (isEdit) {
    const result = await updateOwnCharacterContent(session.userId, characterId!, {
      ...head,
      bodyMarkdown,
      isDraft,
      bioHtml,
    });
    if (!result) {
      return { error: "Charakter nicht gefunden oder keine Berechtigung." };
    }
    revalidateCharacter(result.slug);

    // Solange der Charakter ein Entwurf bleibt, sieht ihn außer dem Owner
    // niemand — keine Benachrichtigung. Beim Veröffentlichen (wasDraft true,
    // isDraft jetzt false) gilt das wie ein Neuanlegen ("created" statt
    // "updated"), siehe notifyMissionParticipants in
    // missions/_shared/contentAction.ts für dieselbe Begründung.
    if (!isDraft) {
      const contentUrl = `${await getBaseUrl()}/characters/${result.slug}`;
      const preview = bodyMarkdown
        ? synopsisExcerpt(bodyMarkdown, 140)
        : "Die Akte wurde aktualisiert.";
      const author = await getUserById(session.userId);

      if (result.wasDraft) {
        await notifyContentChange({
          contentType: "character",
          event: "created",
          authorUserId: session.userId,
          authorName: author?.name ?? "Unbekannt",
          contentTypeLabel: "einen neuen Charakter",
          contentTitle: name,
          contentUrl,
          preview,
          notifyPublic: result.visibility === "public",
        });
      } else {
        await notifyCharacterSubscribers({
          characterSlug: result.slug,
          characterName: name,
          editingUserId: session.userId,
          bioMarkdown: bodyMarkdown || null,
        });
        await notifyContentChange({
          contentType: "character",
          event: "updated",
          authorUserId: session.userId,
          authorName: author?.name ?? "Unbekannt",
          contentTypeLabel: "einen Charakter",
          contentTitle: name,
          contentUrl,
          preview,
          notifyPublic: result.visibility === "public",
        });
      }
    }
    // Nach /user/characters, nicht nach /user/content: die Charakterliste ist
    // aus „Meine Inhalte" ausgezogen (siehe UserContentBrowser), der gerade
    // gespeicherte Charakter stünde dort also gar nicht mehr.
    redirect("/user/characters");
  }

  const result = await createCharacter({
    ...head,
    bodyMarkdown,
    isDraft,
    bioHtml,
    ownerUserId: session.userId,
  });
  revalidateCharacter(result.slug);

  if (!isDraft) {
    const contentUrl = `${await getBaseUrl()}/characters/${result.slug}`;
    const preview = bodyMarkdown
      ? synopsisExcerpt(bodyMarkdown, 140)
      : "Ein neuer Charakter wurde angelegt.";

    // Charaktere sind standardmäßig public (siehe scripts/schema.sql) — ein
    // neu angelegter Charakter benachrichtigt die Abonnenten des Erstellers
    // deshalb ungegated (keine separate visibility im createCharacter-Result).
    await notifyContentChange({
      contentType: "character",
      event: "created",
      authorUserId: session.userId,
      authorName: currentUser?.name ?? "Unbekannt",
      contentTypeLabel: "einen neuen Charakter",
      contentTitle: name,
      contentUrl,
      preview,
      notifyPublic: true,
    });
  }
  redirect(`/characters/${result.slug}`);
}
