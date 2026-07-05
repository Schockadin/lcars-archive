"use server";
import { requireAdmin } from "@/lib/dal";
import {
  applyAutolinks,
  getAutolinkTargets,
  type AutolinkExclude,
  type AutolinkMatch,
} from "@/lib/autolink";
import { stripWikilinks, type WikilinkRemoval } from "@/lib/wikilinkCleanup";
import { markdownToHtml } from "@/lib/markdown";
import {
  getMissionBySlug,
  getMissionLogSourceBySlug,
  updateMissionSynopsis,
  updateMissionLogSourceMd,
} from "@/lib/missions";
import {
  getArchiveEntrySourceBySlug,
  updateArchiveEntryContent,
} from "@/lib/archive";
import { getCharacterSourceBySlug, updateCharacterBio } from "@/lib/characters";
import {
  revalidateMission,
  revalidateLog,
  revalidateArchiveEntry,
  revalidateCharacter,
} from "@/lib/revalidate";

export type AutolinkContentType =
  | "mission"
  | "missionLog"
  | "archiveEntry"
  | "character";

export interface AutolinkPreviewResult {
  matches: AutolinkMatch[];
  previewHtml: string;
}

export interface AutolinkApplyResult {
  matchCount: number;
}

export interface WikilinkCleanupPreviewResult {
  removed: WikilinkRemoval[];
  previewHtml: string;
}

export interface WikilinkCleanupApplyResult {
  removedCount: number;
}

interface ContentAccessor {
  sourceMd: string;
  save: (newSourceMd: string) => Promise<void>;
}

// Gemeinsame Grundlage für Autolinking UND Wikilink-Entfernung: liest den
// rohen Markdown-Quelltext eines Inhalts unabhängig von Sichtbarkeit/Owner
// (Admin-Zugriff) und liefert eine passende Speicherfunktion — beide
// Admin-Actions unten transformieren nur den Text anders, das Lesen/
// Speichern je Inhaltstyp ist identisch.
async function getContentAccessor(
  contentType: AutolinkContentType,
  slug: string,
): Promise<ContentAccessor | { error: string }> {
  switch (contentType) {
    case "mission": {
      const mission = await getMissionBySlug(slug);
      if (!mission) return { error: "Mission nicht gefunden." };
      if (!mission.sourceMarkdown) {
        return { error: "Kein Markdown-Quelltext vorhanden." };
      }
      return {
        sourceMd: mission.sourceMarkdown,
        save: async (next) => {
          await updateMissionSynopsis(mission.id, next);
          revalidateMission(slug);
        },
      };
    }
    case "missionLog": {
      const log = await getMissionLogSourceBySlug(slug);
      if (!log) return { error: "Log nicht gefunden." };
      if (!log.sourceMarkdown) {
        return { error: "Kein Markdown-Quelltext vorhanden." };
      }
      return {
        sourceMd: log.sourceMarkdown,
        save: async (next) => {
          await updateMissionLogSourceMd(log.id, next);
          revalidateLog(log.missionId, slug);
        },
      };
    }
    case "archiveEntry": {
      const entry = await getArchiveEntrySourceBySlug(slug);
      if (!entry) return { error: "Archiv-Eintrag nicht gefunden." };
      if (!entry.sourceMarkdown) {
        return { error: "Kein Markdown-Quelltext vorhanden." };
      }
      return {
        sourceMd: entry.sourceMarkdown,
        save: async (next) => {
          await updateArchiveEntryContent(entry.id, next);
          revalidateArchiveEntry(slug);
        },
      };
    }
    case "character": {
      const character = await getCharacterSourceBySlug(slug);
      if (!character) return { error: "Charakter nicht gefunden." };
      if (!character.sourceMarkdown) {
        return { error: "Kein Markdown-Quelltext vorhanden." };
      }
      return {
        sourceMd: character.sourceMarkdown,
        save: async (next) => {
          await updateCharacterBio(character.id, next);
          revalidateCharacter(slug);
        },
      };
    }
  }
}

// Mission-Logs sind selbst kein Autolinking-Ziel (siehe getAutolinkTargets),
// brauchen also keinen Selbst-Ausschluss.
function selfExcludeFor(
  contentType: AutolinkContentType,
  slug: string,
): AutolinkExclude | undefined {
  switch (contentType) {
    case "mission":
      return { type: "mission", slug };
    case "archiveEntry":
      return { type: "archive", slug };
    case "character":
      return { type: "character", slug };
    case "missionLog":
      return undefined;
  }
}

interface AutolinkPlan {
  matches: AutolinkMatch[];
  sourceMd: string;
  save: () => Promise<void>;
}

// Gemeinsame Grundlage für Vorschau UND Übernehmen: beide berechnen frisch
// (statt der Vorschau-Text würde vom Client übernommen), damit ein
// Übernehmen nie einen ungeprüften/manipulierten Text speichert und
// Änderungen zwischen Vorschau und Bestätigen (durch einen anderen Admin)
// nicht stillschweigend überschrieben werden.
async function planAutolink(
  contentType: AutolinkContentType,
  slug: string,
): Promise<AutolinkPlan | { error: string }> {
  const accessor = await getContentAccessor(contentType, slug);
  if ("error" in accessor) return accessor;

  const targets = await getAutolinkTargets(selfExcludeFor(contentType, slug));
  const { sourceMd, matches } = applyAutolinks(accessor.sourceMd, targets);
  return { sourceMd, matches, save: () => accessor.save(sourceMd) };
}

export async function previewAutolinkAction(
  contentType: AutolinkContentType,
  slug: string,
): Promise<AutolinkPreviewResult | { error: string }> {
  await requireAdmin();

  const plan = await planAutolink(contentType, slug);
  if ("error" in plan) return plan;

  const previewHtml = await markdownToHtml(plan.sourceMd);
  return { matches: plan.matches, previewHtml };
}

export async function applyAutolinkAction(
  contentType: AutolinkContentType,
  slug: string,
): Promise<AutolinkApplyResult | { error: string }> {
  await requireAdmin();

  const plan = await planAutolink(contentType, slug);
  if ("error" in plan) return plan;
  if (plan.matches.length === 0) {
    return { error: "Keine neuen Verknüpfungen gefunden." };
  }

  await plan.save();
  return { matchCount: plan.matches.length };
}

interface WikilinkCleanupPlan {
  removed: WikilinkRemoval[];
  sourceMd: string;
  save: () => Promise<void>;
}

async function planWikilinkCleanup(
  contentType: AutolinkContentType,
  slug: string,
): Promise<WikilinkCleanupPlan | { error: string }> {
  const accessor = await getContentAccessor(contentType, slug);
  if ("error" in accessor) return accessor;

  const { sourceMd, removed } = stripWikilinks(accessor.sourceMd);
  return { sourceMd, removed, save: () => accessor.save(sourceMd) };
}

export async function previewWikilinkCleanupAction(
  contentType: AutolinkContentType,
  slug: string,
): Promise<WikilinkCleanupPreviewResult | { error: string }> {
  await requireAdmin();

  const plan = await planWikilinkCleanup(contentType, slug);
  if ("error" in plan) return plan;

  const previewHtml = await markdownToHtml(plan.sourceMd);
  return { removed: plan.removed, previewHtml };
}

export async function applyWikilinkCleanupAction(
  contentType: AutolinkContentType,
  slug: string,
): Promise<WikilinkCleanupApplyResult | { error: string }> {
  await requireAdmin();

  const plan = await planWikilinkCleanup(contentType, slug);
  if ("error" in plan) return plan;
  if (plan.removed.length === 0) {
    return { error: "Keine Wikilinks gefunden." };
  }

  await plan.save();
  return { removedCount: plan.removed.length };
}
