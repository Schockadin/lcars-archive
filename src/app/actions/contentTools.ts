"use server";
import { requireAdmin, requireGM } from "@/lib/dal";
import {
  applyAutolinks,
  getAutolinkTargets,
  resolveAutolinkedWikilinks,
  renderContentHtml,
  type AutolinkExclude,
  type AutolinkMatch,
} from "@/lib/autolink";
import { stripWikilinks, type WikilinkRemoval } from "@/lib/wikilinkCleanup";
import { markdownToHtml } from "@/lib/markdown";
import {
  getMissionBySlug,
  getMissionLogSourceBySlug,
  updateMissionSynopsisWithHtml,
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

export type ContentToolType =
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
  save: (newSourceMd: string, newHtml: string) => Promise<void>;
}

// Gemeinsame Grundlage für Autolinking UND Wikilink-Entfernung: liest den
// rohen Markdown-Quelltext eines Inhalts unabhängig von Sichtbarkeit/Owner
// (Admin-Zugriff) und liefert eine passende Speicherfunktion. save() nimmt
// das fertig gerenderte HTML als Parameter entgegen (statt es selbst zu
// rendern) — die Aufrufer unten müssen zwischen Rendern und Speichern noch
// frisch erstellte [[Wikilinks]] auflösen (siehe planAutolink).
async function getContentAccessor(
  contentType: ContentToolType,
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
        save: async (nextMd, nextHtml) => {
          await updateMissionSynopsisWithHtml(mission.id, nextMd, nextHtml);
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
        save: async (nextMd, nextHtml) => {
          await updateMissionLogSourceMd(log.id, nextMd, nextHtml);
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
        save: async (nextMd, nextHtml) => {
          await updateArchiveEntryContent(entry.id, nextMd, nextHtml);
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
        save: async (nextMd, nextHtml) => {
          await updateCharacterBio(character.id, nextMd, nextHtml);
          revalidateCharacter(slug);
        },
      };
    }
  }
}

// Mission-Logs sind selbst kein Autolinking-Ziel (siehe getAutolinkTargets),
// brauchen also keinen Selbst-Ausschluss.
function selfExcludeFor(
  contentType: ContentToolType,
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
  previewHtml: string;
  save: () => Promise<void>;
}

// Gemeinsame Grundlage für Vorschau UND Übernehmen: beide berechnen frisch
// (statt der Vorschau-Text würde vom Client übernommen), damit ein
// Übernehmen nie einen ungeprüften/manipulierten Text speichert und
// Änderungen zwischen Vorschau und Bestätigen (durch einen anderen Admin)
// nicht stillschweigend überschrieben werden.
//
// applyAutolinks() erzeugt [[Wikilinks]] statt direkter Markdown-Links,
// damit das Ergebnis mit "Wikilinks entfernen" symmetrisch bleibt.
// markdownToHtml() rendert diese zunächst als <a href="wikilink://…">
// (siehe remarkWikiLinks in lib/markdown.ts) — resolveAutolinkedWikilinks()
// löst direkt danach genau die hier neu erstellten anhand der bekannten
// Ziel-Pfade auf, damit sie sofort funktionieren statt erst beim nächsten
// Vault-Ingest.
async function planAutolink(
  contentType: ContentToolType,
  slug: string,
): Promise<AutolinkPlan | { error: string }> {
  const accessor = await getContentAccessor(contentType, slug);
  if ("error" in accessor) return accessor;

  const targets = await getAutolinkTargets(selfExcludeFor(contentType, slug));
  const { sourceMd, matches } = applyAutolinks(accessor.sourceMd, targets);
  const previewHtml = resolveAutolinkedWikilinks(
    await markdownToHtml(sourceMd),
    matches,
  );
  return {
    matches,
    previewHtml,
    save: () => accessor.save(sourceMd, previewHtml),
  };
}

// Leichtgewichtiger Vorab-Check für den Default-Modus von
// ContentLinkToolButton.tsx: nur die Treffer zählen, OHNE das HTML zu
// rendern (der teure Teil von planAutolink) — läuft beim Laden jeder der
// vier Inhalts-Detailseiten für GM/Admin-Betrachter einmal automatisch,
// damit der Button direkt den vermutlich sinnvolleren Modus zeigt (Autolink,
// wenn es noch etwas zu verknüpfen gibt, sonst Delink). requireGM() statt
// requireAdmin(), da der Button selbst schon für GM UND Admin sichtbar ist.
//
// Bewusst live berechnet statt als DB-Flag zwischengespeichert: ein Flag
// müsste bei JEDER Änderung an JEDEM potenziellen Autolink-Ziel (neuer/
// umbenannter Charakter, neue Mission, neuer Archiv-Eintrag) für ALLE
// bestehenden Inhalte neu berechnet werden, nicht nur für den gerade
// bearbeiteten — das wäre in Summe mehr Aufwand und eine zusätzliche
// Fehlerquelle (veraltetes Flag) gegenüber einer einzelnen Live-Prüfung des
// gerade angezeigten Inhalts.
export async function hasAutolinkMatchesAction(
  contentType: ContentToolType,
  slug: string,
): Promise<boolean> {
  await requireGM();

  const accessor = await getContentAccessor(contentType, slug);
  if ("error" in accessor) return false;

  const targets = await getAutolinkTargets(selfExcludeFor(contentType, slug));
  return applyAutolinks(accessor.sourceMd, targets).matches.length > 0;
}

export async function previewAutolinkAction(
  contentType: ContentToolType,
  slug: string,
): Promise<AutolinkPreviewResult | { error: string }> {
  await requireAdmin();

  const plan = await planAutolink(contentType, slug);
  if ("error" in plan) return plan;

  return { matches: plan.matches, previewHtml: plan.previewHtml };
}

export async function applyAutolinkAction(
  contentType: ContentToolType,
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
  previewHtml: string;
  save: () => Promise<void>;
}

async function planWikilinkCleanup(
  contentType: ContentToolType,
  slug: string,
): Promise<WikilinkCleanupPlan | { error: string }> {
  const accessor = await getContentAccessor(contentType, slug);
  if ("error" in accessor) return accessor;

  const { sourceMd, removed } = stripWikilinks(accessor.sourceMd);
  const previewHtml = await renderContentHtml(sourceMd);
  return {
    removed,
    previewHtml,
    save: () => accessor.save(sourceMd, previewHtml),
  };
}

export async function previewWikilinkCleanupAction(
  contentType: ContentToolType,
  slug: string,
): Promise<WikilinkCleanupPreviewResult | { error: string }> {
  await requireAdmin();

  const plan = await planWikilinkCleanup(contentType, slug);
  if ("error" in plan) return plan;

  return { removed: plan.removed, previewHtml: plan.previewHtml };
}

export async function applyWikilinkCleanupAction(
  contentType: ContentToolType,
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
