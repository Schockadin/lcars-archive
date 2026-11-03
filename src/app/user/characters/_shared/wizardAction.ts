"use server";
import { redirect } from "next/navigation";
import {
  verifySession,
  requireMatchingFormUserId,
  getRoleMap,
} from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { createCharacter } from "@/lib/characters";
import { revalidateCharacter } from "@/lib/revalidate";
import { revalidatePathAndNotify } from "@/lib/realtimeServer";
import { autoLinkMarkdown } from "@/lib/autolink";
import { notifyContentChange } from "@/lib/follows";
import { getBaseUrl } from "@/lib/http";
import { synopsisExcerpt } from "@/lib/missionFormat";
import { userCan } from "@/lib/permissions";
import { parseStatsPayload } from "@/lib/characterStatsPayload";
import { checkOpenCreationStats } from "@/lib/characterStatsRules";
import { applySta2eLifepath, checkSta2eLifepath } from "@/lib/sta2eLifepath";
import { getAdvancementRules } from "@/lib/advancementSettings";
import { listTalents } from "@/lib/talents";
import { listFocuses } from "@/lib/focuses";
import { listCampaignRuleModules, moduleSupportsCharacterRole } from "@/lib/campaignRuleModules";
import { sanitizeRuleModuleCharacterData } from "@/lib/ruleModuleCharacterData";
import { readCharacterHead } from "./characterHead";
import {
  characterEditHref,
} from "@/lib/contentRoutes";

export interface CharacterWizardState {
  error?: string;
}

// Abschluss des Anlege-Assistenten (/user/characters/new): Stammdaten, Werte
// und Biografie kommen aus EINEM Formular — der Assistent blendet nur
// zwischen seinen Schritten um, alle Felder bleiben dabei im DOM. Angelegt
// wird deshalb auch alles in einem Zug: ein Charakter ohne die Werte, die man
// gerade eingetragen hat, wäre ein halbes Ergebnis.
//
// Die Werte reisen als ein JSON-Feld (statsJson) statt als vierzig einzelne
// Felder — der Editor führt sie ohnehin als zusammenhängenden Zustand, siehe
// characterStatsPayload.ts.
export async function createCharacterWizardAction(
  _state: CharacterWizardState,
  formData: FormData,
): Promise<CharacterWizardState> {
  const session = await verifySession();
  requireMatchingFormUserId(formData, session);

  // Rolle frisch aus der DB (nicht aus dem Cookie): eine Selbstanlage setzt
  // player_id sofort auf den eigenen Account.
  const currentUser = await getUserById(session.userId);
  if (
    !currentUser ||
    !userCan(currentUser, "content.create", await getRoleMap())
  ) {
    return { error: "Gast-Accounts können keine Charaktere anlegen." };
  }

  const headResult = await readCharacterHead(formData, undefined, session.userId);
  if ("error" in headResult) return { error: headResult.error };
  const head = headResult.head;

  const statsResult = parseStatsPayload(formData.get("statsJson"));
  if ("error" in statsResult) return { error: statsResult.error };
  let stats = statsResult.stats;
  // creationLocked kommt nie aus dem Formular: ein frisch angelegter Charakter
  // steht immer am Anfang seiner Erschaffung, abgeschlossen wird sie später
  // ausdrücklich (siehe lockCreationAction).
  stats.creationLocked = false;
  // Dasselbe gilt für die Notiz zurückgenommener Steigerungen: ein neuer
  // Charakter hat noch nichts gesteigert, das zurückgenommen sein könnte.
  stats.pendingAdvancements = [];

  if (stats.creationMethod === "sta2e-lifepath") {
    const lifepathErrors = checkSta2eLifepath(stats, head.species, head.rank);
    if (lifepathErrors.length > 0) return { error: lifepathErrors.join(" ") };
    stats = applySta2eLifepath(stats, head.species);
  }

  const [rules, catalog, focusCatalog, campaignModules] = await Promise.all([
    getAdvancementRules(),
    listTalents(),
    listFocuses(),
    listCampaignRuleModules(),
  ]);
  const statsError = checkOpenCreationStats(
    stats,
    rules,
    catalog.map((talent) => talent.name),
    [],
    focusCatalog.map((focus) => focus.name),
  );
  if (statsError) return { error: statsError };

  const matchingModules = new Map(
    campaignModules
      .filter((module) => module.enabled && moduleSupportsCharacterRole(module.definition, stats.characterRole))
      .map((module) => [module.definition.id, module.definition]),
  );
  stats.ruleModules = Object.fromEntries(
    Object.entries(stats.ruleModules).flatMap(([moduleId, data]) => {
      const definition = matchingModules.get(moduleId);
      return definition
        ? [[moduleId, sanitizeRuleModuleCharacterData(definition, data)]]
        : [];
    }),
  );

  let bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  let bioHtml: string | undefined;
  if (bodyMarkdown && formData.get("autoLink") === "on") {
    // Beim Anlegen gibt es noch keinen eigenen Slug, den man vom Autolinking
    // ausnehmen müsste — anders als beim Bearbeiten (panelActions.ts).
    const linked = await autoLinkMarkdown(bodyMarkdown);
    bodyMarkdown = linked.sourceMd;
    bioHtml = linked.html;
  }

  const isDraft = formData.get("isDraft") === "on";

  const result = await createCharacter({
    ...head,
    bodyMarkdown,
    isDraft,
    bioHtml,
    stats,
    ownerUserId: session.userId,
  });
  revalidateCharacter(result.slug);
  await revalidatePathAndNotify("/user/characters");

  if (!isDraft) {
    const contentUrl = `${await getBaseUrl()}/characters/${result.slug}`;
    await notifyContentChange({
      contentType: "character",
      event: "created",
      authorUserId: session.userId,
      authorName: currentUser.name,
      contentTypeLabel: "einen neuen Charakter",
      contentTitle: head.name,
      contentUrl,
      preview: bodyMarkdown
        ? synopsisExcerpt(bodyMarkdown, 140)
        : "Ein neuer Charakter wurde angelegt.",
      // Charaktere sind standardmäßig public (siehe scripts/schema.sql).
      notifyPublic: true,
    });
  }

  // Auf die eigene Charakterseite statt auf die öffentliche: von dort geht es
  // direkt weiter mit Steigern, Bearbeiten und der Bogen-Vorschau.
  redirect(characterEditHref(result.id));
}
