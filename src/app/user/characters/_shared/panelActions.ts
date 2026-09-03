"use server";
import { verifySession, requireMatchingFormUserId } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import {
  getOwnCharacterForEdit,
  getOwnCharacterStats,
  notifyCharacterSubscribers,
  updateOwnCharacterContent,
  updateOwnCharacterStats,
} from "@/lib/characters";
import { revalidateCharacter } from "@/lib/revalidate";
import { revalidatePath } from "next/cache";
import { autoLinkMarkdown } from "@/lib/autolink";
import { notifyContentChange } from "@/lib/follows";
import { getBaseUrl } from "@/lib/http";
import { synopsisExcerpt } from "@/lib/missionFormat";
import { parseStatsPayload } from "@/lib/characterStatsPayload";
import { checkOpenCreationStats } from "@/lib/characterStatsRules";
import { validateCharacterStats } from "@/lib/characterStats";
import { getAdvancementRules } from "@/lib/advancementSettings";
import { listTalents } from "@/lib/talents";
import { readCharacterHead } from "./characterHead";

// Die drei Panels der eigenen Charakterseite speichern jeweils für sich:
// Stammdaten, Biografie und Werte. Der frühere ContentEditor schickte alles
// zusammen und sprang danach auf eine andere Seite — für ein Panel mit
// Bearbeiten-Knopf wäre beides falsch (man verlöre die anderen beiden Panels
// aus dem Blick und müsste zurücknavigieren).
//
// Jede Action liest nur ihren Teil und übernimmt den Rest aus dem
// gespeicherten Stand: updateOwnCharacterContent schreibt die Akte immer
// vollständig, ein weggelassenes Feld würde sonst geleert.

export interface CharacterPanelState {
  error?: string;
  success?: string;
}

// Info-Mails wie beim vollen Bearbeiten-Formular (siehe contentAction.ts):
// Abonnenten des Charakters und der eigenen Person. Entwürfe sind für
// niemanden außer dem Owner sichtbar und melden deshalb nichts.
async function notifyUpdated(input: {
  userId: number;
  slug: string;
  name: string;
  visibility: "private" | "gm" | "public";
  wasDraft: boolean;
  isDraft: boolean;
  bodyMarkdown: string;
}): Promise<void> {
  if (input.isDraft) return;

  const contentUrl = `${await getBaseUrl()}/characters/${input.slug}`;
  const preview = input.bodyMarkdown
    ? synopsisExcerpt(input.bodyMarkdown, 140)
    : "Die Akte wurde aktualisiert.";
  const author = await getUserById(input.userId);

  // Ein gerade veröffentlichter Entwurf zählt wie ein neuer Charakter (siehe
  // dieselbe Begründung in contentAction.ts).
  if (input.wasDraft) {
    await notifyContentChange({
      contentType: "character",
      event: "created",
      authorUserId: input.userId,
      authorName: author?.name ?? "Unbekannt",
      contentTypeLabel: "einen neuen Charakter",
      contentTitle: input.name,
      contentUrl,
      preview,
      notifyPublic: input.visibility === "public",
    });
    return;
  }

  await notifyCharacterSubscribers({
    characterSlug: input.slug,
    characterName: input.name,
    editingUserId: input.userId,
    bioMarkdown: input.bodyMarkdown || null,
  });
  await notifyContentChange({
    contentType: "character",
    event: "updated",
    authorUserId: input.userId,
    authorName: author?.name ?? "Unbekannt",
    contentTypeLabel: "einen Charakter",
    contentTitle: input.name,
    contentUrl,
    preview,
    notifyPublic: input.visibility === "public",
  });
}

function readCharacterId(formData: FormData): number | null {
  const raw = Number(formData.get("characterId"));
  return Number.isInteger(raw) && raw > 0 ? raw : null;
}

// ── Panel „Stammdaten" ────────────────────────────────────────────────
export async function updateCharacterHeadAction(
  _state: CharacterPanelState,
  formData: FormData,
): Promise<CharacterPanelState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);

  const characterId = readCharacterId(formData);
  if (characterId === null) return { error: "Ungültiger Charakter." };

  const headResult = await readCharacterHead(formData);
  if ("error" in headResult) return { error: headResult.error };

  // Biografie unverändert übernehmen — sie hat ihr eigenes Panel.
  const current = await getOwnCharacterForEdit(session.userId, characterId);
  if (!current) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }

  const isDraft = formData.get("isDraft") === "on";
  const result = await updateOwnCharacterContent(session.userId, characterId, {
    ...headResult.head,
    bodyMarkdown: current.sourceMarkdown,
    isDraft,
  });
  if (!result) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }

  revalidateCharacter(result.slug);
  revalidatePath(`/user/characters/${characterId}`);
  revalidatePath("/user/characters");

  await notifyUpdated({
    userId: session.userId,
    slug: result.slug,
    name: headResult.head.name,
    visibility: result.visibility,
    wasDraft: result.wasDraft,
    isDraft,
    bodyMarkdown: current.sourceMarkdown,
  });

  return { success: "Stammdaten gespeichert." };
}

// ── Panel „Biografie" ─────────────────────────────────────────────────
export async function updateCharacterBioAction(
  _state: CharacterPanelState,
  formData: FormData,
): Promise<CharacterPanelState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);

  const characterId = readCharacterId(formData);
  if (characterId === null) return { error: "Ungültiger Charakter." };

  const current = await getOwnCharacterForEdit(session.userId, characterId);
  if (!current) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  let bioHtml: string | undefined;
  if (bodyMarkdown && formData.get("autoLink") === "on") {
    // Den Charakter selbst vom Autolinking ausnehmen — sonst verlinkt sein
    // Name im eigenen Text auf die eigene Seite.
    const linked = await autoLinkMarkdown(bodyMarkdown, {
      type: "character",
      slug: current.slug,
    });
    bodyMarkdown = linked.sourceMd;
    bioHtml = linked.html;
  }

  const result = await updateOwnCharacterContent(session.userId, characterId, {
    name: current.name,
    status: current.status,
    portrait: current.portrait,
    rank: current.rank,
    species: current.species,
    homeworld: current.homeworld,
    aliases: current.aliases,
    age: current.age,
    dateOfBirth: current.dateOfBirth,
    generation: current.generation,
    factions: current.factions,
    ships: current.ships,
    division: current.division,
    tags: current.tags,
    bodyMarkdown,
    isDraft: current.isDraft,
    bioHtml,
  });
  if (!result) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }

  revalidateCharacter(result.slug);
  revalidatePath(`/user/characters/${characterId}`);

  await notifyUpdated({
    userId: session.userId,
    slug: result.slug,
    name: current.name,
    visibility: result.visibility,
    wasDraft: result.wasDraft,
    isDraft: current.isDraft,
    bodyMarkdown,
  });

  return { success: "Biografie gespeichert." };
}

// ── Panel „Werte" ─────────────────────────────────────────────────────
// Nimmt den kompletten Wertesatz als ein JSON-Feld entgegen (siehe
// characterStatsPayload.ts). Was nach dem Festschreiben der Erschaffung nur
// noch über AP wächst, wird dabei aus dem gespeicherten Stand übernommen —
// maßgeblich ist immer die Datenbank, nicht das Formular.
export async function saveCharacterStatsAction(
  _state: CharacterPanelState,
  formData: FormData,
): Promise<CharacterPanelState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);

  const characterId = readCharacterId(formData);
  if (characterId === null) return { error: "Ungültiger Charakter." };

  const payload = parseStatsPayload(formData.get("statsJson"));
  if ("error" in payload) return { error: payload.error };
  const stats = payload.stats;

  const current = await getOwnCharacterStats(session.userId, characterId);
  if (!current) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }

  stats.creationLocked = current.stats.creationLocked;
  if (current.stats.creationLocked) {
    stats.attributes = current.stats.attributes;
    stats.departments = current.stats.departments;
    stats.talents = current.stats.talents;
    stats.focuses = current.stats.focuses;

    // Die übrigen Felder bleiben frei pflegbar; nur die Verteilungsregeln
    // gelten weiterhin (sie prüfen die gerade übernommenen Werte).
    const ruleErrors = validateCharacterStats(stats);
    if (ruleErrors.length > 0) return { error: ruleErrors.join(" ") };
  } else {
    const [rules, catalog] = await Promise.all([
      getAdvancementRules(),
      listTalents(),
    ]);
    const error = checkOpenCreationStats(
      stats,
      rules,
      catalog.map((talent) => talent.name),
      current.stats.talents,
    );
    if (error) return { error };
  }

  const result = await updateOwnCharacterStats(
    session.userId,
    characterId,
    stats,
  );
  if (!result) {
    return { error: "Charakter nicht gefunden oder keine Berechtigung." };
  }

  // Die Werte hängen an der Charakter-Akte (metadata) — deren Cache-Tags
  // müssen mit, damit z.B. die Charakterseite frische Daten bekommt.
  revalidateCharacter(result.slug);
  revalidatePath(`/user/characters/${characterId}`);
  revalidatePath("/user/characters");

  // Bewusst KEINE Abonnenten-Benachrichtigung: Werte ändern sich im
  // Spielbetrieb ständig (Stress, Entschlossenheit) — jede Änderung zu melden
  // wäre Spam.
  return { success: "Werte gespeichert." };
}
