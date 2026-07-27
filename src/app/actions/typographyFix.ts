"use server";
import { requireAdmin } from "@/lib/dal";
import {
  getAllAutolinkableContent,
  renderContentHtml,
} from "@/lib/autolink";
import { applyGermanTypography } from "@/lib/typography";
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

export interface TypographyFixBatchResult {
  error?: string;
  // Gesamtzahl der zu prüfenden Inhalte (stabil über alle Batches).
  total?: number;
  // Wie viele Inhalte nach diesem Batch insgesamt geprüft wurden.
  processed?: number;
  // In DIESEM Batch tatsächlich korrigierte Inhalte.
  changedInBatch?: number;
  // true, sobald alle Inhalte abgearbeitet sind.
  done?: boolean;
}

// Admin-only Bulk-Typografie-Korrektur (/admin/scripts) — wendet
// applyGermanTypography (deutsche Anführungszeichen „…", siehe
// src/lib/typography.ts) auf den gespeicherten Quelltext (source_md) ALLER
// Inhalte an und rendert das HTML neu (renderContentHtml, inkl.
// Wikilink-Auflösung). Arbeitet BATCH-weise über die stabile, id-sortierte
// Inhaltsliste (gleiches Muster wie linkAllContentBatchAction): der Client ruft
// die Action seriell mit wachsendem offset auf und zeigt einen
// Fortschrittsbalken. Nur Inhalte, deren Quelltext sich tatsächlich ändert,
// werden gespeichert (idempotent — ein zweiter Lauf meldet 0).
export async function typographyFixBatchAction(
  offset: number,
  batchSize: number,
): Promise<TypographyFixBatchResult> {
  await requireAdmin();

  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const safeBatch =
    Number.isInteger(batchSize) && batchSize > 0 && batchSize <= 100
      ? batchSize
      : 20;

  try {
    const contents = await getAllAutolinkableContent();
    const total = contents.length;
    const slice = contents.slice(safeOffset, safeOffset + safeBatch);

    let changedInBatch = 0;
    for (const content of slice) {
      const newSource = applyGermanTypography(content.sourceMd);
      if (newSource === content.sourceMd) continue;

      const html = await renderContentHtml(newSource);
      switch (content.contentType) {
        case "character":
          await updateCharacterBio(content.id, newSource, html);
          revalidateCharacter(content.slug);
          break;
        case "mission":
          await updateMissionSynopsisWithHtml(content.id, newSource, html);
          revalidateMission(content.slug);
          break;
        case "missionLog":
          await updateMissionLogSourceMd(content.id, newSource, html);
          if (content.missionId != null) {
            revalidateLog(content.missionId, content.slug);
          }
          break;
        case "archiveEntry":
          await updateArchiveEntryContent(content.id, newSource, html);
          revalidateArchiveEntry(content.slug);
          break;
      }
      changedInBatch += 1;
    }

    const processed = Math.min(safeOffset + safeBatch, total);
    return {
      total,
      processed,
      changedInBatch,
      done: processed >= total,
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Typografie-Korrektur fehlgeschlagen: ${err.message}`
          : "Typografie-Korrektur fehlgeschlagen.",
    };
  }
}
