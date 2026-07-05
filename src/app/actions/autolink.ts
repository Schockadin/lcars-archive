"use server";
import { requireAdmin } from "@/lib/dal";
import {
  applyAutolinks,
  getAutolinkTargets,
  type AutolinkMatch,
} from "@/lib/autolink";
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

interface AutolinkPlan {
  sourceMd: string;
  matches: AutolinkMatch[];
  save: () => Promise<void>;
}

// Gemeinsame Grundlage für Vorschau UND Übernehmen: beide rufen dieselbe
// Berechnung frisch auf (statt der Vorschau-Text würde vom Client
// übernommen), damit ein Übernehmen nie einen ungeprüften/manipulierten
// Text speichert und Änderungen zwischen Vorschau und Bestätigen (durch
// einen anderen Admin) nicht stillschweigend überschrieben werden.
async function planAutolink(
  contentType: AutolinkContentType,
  slug: string,
): Promise<AutolinkPlan | { error: string }> {
  switch (contentType) {
    case "mission": {
      const mission = await getMissionBySlug(slug);
      if (!mission) return { error: "Mission nicht gefunden." };
      if (!mission.sourceMarkdown) {
        return { error: "Kein Markdown-Quelltext vorhanden." };
      }
      const targets = await getAutolinkTargets({ type: "mission", slug });
      const { sourceMd, matches } = applyAutolinks(
        mission.sourceMarkdown,
        targets,
      );
      return {
        sourceMd,
        matches,
        save: async () => {
          await updateMissionSynopsis(mission.id, sourceMd);
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
      const targets = await getAutolinkTargets();
      const { sourceMd, matches } = applyAutolinks(log.sourceMarkdown, targets);
      return {
        sourceMd,
        matches,
        save: async () => {
          await updateMissionLogSourceMd(log.id, sourceMd);
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
      const targets = await getAutolinkTargets({ type: "archive", slug });
      const { sourceMd, matches } = applyAutolinks(
        entry.sourceMarkdown,
        targets,
      );
      return {
        sourceMd,
        matches,
        save: async () => {
          await updateArchiveEntryContent(entry.id, sourceMd);
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
      const targets = await getAutolinkTargets({ type: "character", slug });
      const { sourceMd, matches } = applyAutolinks(
        character.sourceMarkdown,
        targets,
      );
      return {
        sourceMd,
        matches,
        save: async () => {
          await updateCharacterBio(character.id, sourceMd);
          revalidateCharacter(slug);
        },
      };
    }
  }
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
