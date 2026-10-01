"use server";
import { checkPermission } from "@/lib/dal";
import {
  getAllAutolinkableContent,
  renderContentHtml,
} from "@/lib/autolink";
import { applyGermanTypography } from "@/lib/typography";
import { saveAutolinkedContent } from "@/lib/autolinkWrite";
import { publishContentChanged } from "@/lib/realtimeServer";

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
  const check = await checkPermission("admin.access");
  if ("error" in check) return { error: check.error };

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
      await saveAutolinkedContent(content, newSource, html);
      changedInBatch += 1;
    }
    if (changedInBatch > 0) await publishContentChanged();

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
