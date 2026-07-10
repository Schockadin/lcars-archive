"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import {
  createCharacter,
  updateOwnCharacterContent,
  getOwnCharacterForEdit,
  notifyCharacterSubscribers,
} from "@/lib/characters";
import { revalidateCharacter } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";
import { notifyUserSubscribers } from "@/lib/follows";
import { getBaseUrl } from "@/lib/http";
import { synopsisExcerpt } from "@/lib/missionFormat";
import type { Character } from "@/types/character";

export interface CharacterFormState {
  error?: string;
}

const VALID_STATUSES: Character["status"][] = ["active", "retired", "deceased"];

function parseList(value: FormDataEntryValue | null): string[] {
  return [
    ...new Set(
      String(value ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}

function parseNumberList(value: FormDataEntryValue | null): number[] {
  return parseList(value)
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));
}

// Vereint createCharacterAction + updateCharacterAction (vorher new/actions.ts
// + [characterId]/edit/actions.ts) zu einer Action für ContentEditor — Branch
// auf Vorhandensein von characterId statt zwei fast identischer Funktionen.
export async function characterAction(
  _state: CharacterFormState,
  formData: FormData,
): Promise<CharacterFormState> {
  const session = await verifySession();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect(`/user/${session.userId}`);
  }

  const characterIdRaw = formData.get("characterId");
  const isEdit = characterIdRaw != null && characterIdRaw !== "";
  const characterId = isEdit ? Number(characterIdRaw) : null;
  if (isEdit && !Number.isInteger(characterId)) {
    return { error: "Ungültiger Charakter." };
  }

  // Gast-Check nur beim Anlegen (siehe createCharacterAction vorher) — die
  // Rolle wird frisch aus der DB geprüft, nicht aus dem Cookie, da eine
  // Selbstanlage player_id sofort auf den eigenen Account setzen würde.
  if (!isEdit) {
    const user = await getUserById(session.userId);
    if (!user || user.role === "guest") {
      return { error: "Gast-Accounts können keine Charaktere anlegen." };
    }
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Bitte einen Namen angeben." };

  const status = String(formData.get("status") ?? "");
  if (!VALID_STATUSES.includes(status as Character["status"])) {
    return { error: "Ungültiger Status." };
  }

  const portrait = String(formData.get("portrait") ?? "").trim() || null;
  const rank = String(formData.get("rank") ?? "").trim() || null;
  const homeworld = String(formData.get("homeworld") ?? "").trim() || null;
  const species = parseList(formData.get("species"));
  const aliases = parseList(formData.get("aliases"));

  const ageRaw = String(formData.get("age") ?? "").trim();
  const age = ageRaw ? Number(ageRaw) : null;
  if (ageRaw && !Number.isInteger(age)) {
    return { error: "Ungültiges Alter." };
  }
  const generation = parseNumberList(formData.get("generation"));
  const factions = parseList(formData.get("factions"));
  const ships = parseList(formData.get("ships"));
  const division = String(formData.get("division") ?? "").trim() || null;
  const tags = parseList(formData.get("tags"));

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

  const statusValue = status as Character["status"];

  if (isEdit) {
    const result = await updateOwnCharacterContent(session.userId, characterId!, {
      name,
      status: statusValue,
      portrait,
      rank,
      species,
      homeworld,
      aliases,
      age,
      generation,
      factions,
      ships,
      division,
      tags,
      bodyMarkdown,
      bioHtml,
    });
    if (!result) {
      return { error: "Charakter nicht gefunden oder keine Berechtigung." };
    }
    revalidateCharacter(result.slug);
    await notifyCharacterSubscribers({
      characterSlug: result.slug,
      characterName: name,
      editingUserId: session.userId,
      bioMarkdown: bodyMarkdown || null,
    });
    if (result.visibility === "public") {
      await notifyUserSubscribers({
        authorUserId: session.userId,
        contentTypeLabel: "einen Charakter",
        contentTitle: name,
        contentUrl: `${await getBaseUrl()}/characters/${result.slug}`,
        preview: bodyMarkdown
          ? synopsisExcerpt(bodyMarkdown, 140)
          : "Die Akte wurde aktualisiert.",
      });
    }
    redirect(`/user/${session.userId}/content`);
  }

  const result = await createCharacter({
    name,
    status: statusValue,
    portrait,
    rank,
    species,
    homeworld,
    aliases,
    age,
    generation,
    factions,
    ships,
    division,
    tags,
    bodyMarkdown,
    bioHtml,
    ownerUserId: session.userId,
  });
  revalidateCharacter(result.slug);
  // Charaktere sind standardmäßig public (siehe scripts/schema.sql) — ein
  // neu angelegter Charakter benachrichtigt die Abonnenten des Erstellers
  // deshalb ungegated (keine separate visibility im createCharacter-Result).
  await notifyUserSubscribers({
    authorUserId: session.userId,
    contentTypeLabel: "einen neuen Charakter",
    contentTitle: name,
    contentUrl: `${await getBaseUrl()}/characters/${result.slug}`,
    preview: bodyMarkdown
      ? synopsisExcerpt(bodyMarkdown, 140)
      : "Ein neuer Charakter wurde angelegt.",
  });
  redirect(`/characters/${result.slug}`);
}
