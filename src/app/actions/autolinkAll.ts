"use server";
import { requireAdmin } from "@/lib/dal";
import {
  applyAutolinks,
  getAutolinkTargets,
  getAllAutolinkableContent,
  resolveAutolinkedWikilinks,
  type AutolinkContentType,
  type AutolinkTarget,
} from "@/lib/autolink";
import { markdownToHtml } from "@/lib/markdown";
import { updateCharacterBio } from "@/lib/characters";
import {
  updateMissionSynopsisWithHtml,
  updateMissionLogSourceMd,
} from "@/lib/missions";
import { updateArchiveEntryContent } from "@/lib/archive";
import {
  revalidateCharacter,
  revalidateMission,
  revalidateLog,
  revalidateArchiveEntry,
} from "@/lib/revalidate";

export interface LinkAllBatchResult {
  error?: string;
  // Gesamtzahl der zu prüfenden Inhalte (stabil über alle Batches).
  total?: number;
  // Wie viele Inhalte nach diesem Batch insgesamt geprüft wurden.
  processed?: number;
  // In DIESEM Batch geänderte Inhalte bzw. gesetzte Verknüpfungen.
  changedInBatch?: number;
  linksInBatch?: number;
  // true, sobald alle Inhalte abgearbeitet sind.
  done?: boolean;
}

// Self-Ausschluss: ein Inhalt darf nicht auf sich selbst verlinken.
// Mission-Logs sind selbst kein Autolink-Ziel (siehe getAutolinkTargets).
function selfKey(
  contentType: AutolinkContentType,
  slug: string,
): { type: AutolinkTarget["type"]; slug: string } | null {
  switch (contentType) {
    case "character":
      return { type: "character", slug };
    case "mission":
      return { type: "mission", slug };
    case "archiveEntry":
      return { type: "archive", slug };
    case "missionLog":
      return null;
  }
}

// Admin-only Bulk-Autolinking (/admin/scripts) — arbeitet BATCH-weise: der
// Client ruft diese Action seriell mit wachsendem offset auf und zeigt einen
// Fortschrittsbalken (siehe LinkAllContentPanel.tsx). So bleibt jeder einzelne
// Server-Request klein (batchSize Inhalte), was Timeouts bei vielen Inhalten
// verhindert. Die Inhaltsliste hat eine stabile Reihenfolge (ORDER BY id je
// Typ, siehe getAllAutolinkableContent), damit die offset-Slices über die
// Aufrufe hinweg konsistent sind. Nur Inhalte mit tatsächlich neuen
// [[Wikilinks]] werden gespeichert.
export async function linkAllContentBatchAction(
  offset: number,
  batchSize: number,
): Promise<LinkAllBatchResult> {
  await requireAdmin();

  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const safeBatch =
    Number.isInteger(batchSize) && batchSize > 0 && batchSize <= 100
      ? batchSize
      : 20;

  const [allTargets, contents] = await Promise.all([
    getAutolinkTargets(),
    getAllAutolinkableContent(),
  ]);

  const total = contents.length;
  const slice = contents.slice(safeOffset, safeOffset + safeBatch);

  let changedInBatch = 0;
  let linksInBatch = 0;

  for (const content of slice) {
    const self = selfKey(content.contentType, content.slug);
    const targets = self
      ? allTargets.filter(
          (t) => !(t.type === self.type && t.slug === self.slug),
        )
      : allTargets;

    const { sourceMd, matches } = applyAutolinks(content.sourceMd, targets);
    if (matches.length === 0) continue;

    const html = resolveAutolinkedWikilinks(
      await markdownToHtml(sourceMd),
      matches,
    );

    switch (content.contentType) {
      case "character":
        await updateCharacterBio(content.id, sourceMd, html);
        revalidateCharacter(content.slug);
        break;
      case "mission":
        await updateMissionSynopsisWithHtml(content.id, sourceMd, html);
        revalidateMission(content.slug);
        break;
      case "missionLog":
        await updateMissionLogSourceMd(content.id, sourceMd, html);
        if (content.missionId != null) {
          revalidateLog(content.missionId, content.slug);
        }
        break;
      case "archiveEntry":
        await updateArchiveEntryContent(content.id, sourceMd, html);
        revalidateArchiveEntry(content.slug);
        break;
    }

    changedInBatch += 1;
    linksInBatch += matches.length;
  }

  const processed = Math.min(safeOffset + safeBatch, total);
  return {
    total,
    processed,
    changedInBatch,
    linksInBatch,
    done: processed >= total,
  };
}
