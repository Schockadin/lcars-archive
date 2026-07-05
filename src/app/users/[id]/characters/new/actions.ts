"use server";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { createCharacter } from "@/lib/characters";
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

// Jeder eingeloggte User außer Gast-Accounts darf Charaktere anlegen (siehe
// requireOwnUser-Kommentar in new/page.tsx) — die Rolle wird hier frisch aus
// der DB geprüft (nicht aus dem Cookie), da eine Selbstanlage player_id
// sofort auf den eigenen Account setzen würde und ein gerade erst auf
// "guest" herabgestuftes Cookie sonst noch kurz durchrutschen könnte.
export async function createCharacterAction(
  _state: CharacterFormState,
  formData: FormData,
): Promise<CharacterFormState> {
  const session = await verifySession();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId !== session.userId) {
    redirect(`/users/${session.userId}`);
  }

  const user = await getUserById(session.userId);
  if (!user || user.role === "guest") {
    return { error: "Gast-Accounts können keine Charaktere anlegen." };
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

  // Opt-in "Automatisch verlinken" (AutoLinkCheckbox.tsx) — kein
  // Selbst-Ausschluss nötig, der neue Charakter existiert noch nicht in der
  // DB. Läuft nur, wenn überhaupt ein Bio-Text geschrieben wurde.
  let bioHtml: string | undefined;
  if (bodyMarkdown && formData.get("autoLink") === "on") {
    const linked = await autoLinkMarkdown(bodyMarkdown);
    bodyMarkdown = linked.sourceMd;
    bioHtml = linked.html;
  }

  const result = await createCharacter({
    name,
    status: status as Character["status"],
    portrait,
    rank,
    species,
    homeworld,
    aliases,
    bodyMarkdown,
    bioHtml,
    ownerUserId: session.userId,
  });

  revalidateCharacter(result.slug);
  redirect(`/users/${session.userId}/content`);
}
