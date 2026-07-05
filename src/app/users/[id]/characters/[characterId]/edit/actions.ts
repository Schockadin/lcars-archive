"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import {
  updateOwnCharacterContent,
  getOwnCharacterForEdit,
} from "@/lib/characters";
import { revalidateCharacter } from "@/lib/revalidate";
import { autoLinkMarkdown } from "@/lib/autolink";
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

export async function updateCharacterAction(
  _state: CharacterFormState,
  formData: FormData,
): Promise<CharacterFormState> {
  const session = await verifySession();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect(`/users/${session.userId}`);
  }

  const characterId = Number(formData.get("characterId"));
  if (!Number.isInteger(characterId)) {
    return { error: "Ungültiger Charakter." };
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

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();

  // Opt-in "Automatisch verlinken" — der Charakter selbst muss dabei als
  // Autolinking-Ziel ausgeschlossen werden (sonst könnte sein eigener Name
  // im Text auf sich selbst verlinken), dafür wird sein aktueller Slug
  // vorab geladen (gleiches Prinzip wie updateArchiveEntryAction).
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

  const result = await updateOwnCharacterContent(session.userId, characterId, {
    name,
    status: status as Character["status"],
    portrait,
    rank,
    species,
    homeworld,
    aliases,
    bodyMarkdown,
    bioHtml,
  });
  if (!result) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }

  revalidateCharacter(result.slug);
  redirect(`/users/${session.userId}/content`);
}
