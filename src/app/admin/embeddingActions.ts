"use server";
import { checkPermission } from "@/lib/dal";
import sql from "@/lib/db";
import { hasEmbeddingConfig } from "@/lib/embeddings";
import { embedOne, listEmbeddableTargets } from "@/lib/embeddingSync";

export interface EmbedAllBatchResult {
  error?: string;
  // Gesamtzahl embedding-fähiger Inhalte (stabil über alle Batches).
  total?: number;
  // Wie viele Inhalte nach diesem Batch insgesamt verarbeitet wurden.
  processed?: number;
  // In DIESEM Batch tatsächlich (neu) embeddete Inhalte.
  embeddedInBatch?: number;
  // In DIESEM Batch entfernte/leere Inhalte (kein verwertbarer Text).
  removedInBatch?: number;
  // true, sobald alle Inhalte abgearbeitet sind.
  done?: boolean;
}

// Voll-Backfill des RAG-Vektor-Index (content_embeddings) aus dem
// Admin-Panel — dieselbe Logik wie scripts/embed-all.ts (embedOne aus
// src/lib/embeddingSync.ts), nur batch-weise über eine STABILE Ziel-Liste
// (listEmbeddableTargets, ORDER BY id je Typ) mit wachsendem offset —
// exakt das Muster von regenerateDialogueContentBatchAction, damit auch ein
// größerer Korpus nicht in ein (Serverless-)Timeout läuft.
//
// admin.access (wie die /admin/scripts-Seite selbst) — eine
// Bulk-Wartungsaktion. Bricht sofort ab, wenn kein OPENAI_API_KEY gesetzt ist
// (sonst würde jeder Datensatz einzeln beim OpenAI-Aufruf scheitern).
//
// Ein erneuter Lauf ist gefahrlos: upsertEmbeddings ist idempotent
// (ON CONFLICT), bereits embeddete Inhalte werden nur aktualisiert.
export async function embedAllBatchAction(
  offset: number,
  batchSize: number,
): Promise<EmbedAllBatchResult> {
  const check = await checkPermission("admin.access");
  if ("error" in check) return { error: check.error };

  if (!hasEmbeddingConfig()) {
    return {
      error:
        "OPENAI_API_KEY ist nicht gesetzt — Embeddings können nicht erzeugt werden.",
    };
  }

  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  // Kleine Batches: jeder Inhalt löst (mind.) einen OpenAI-Embedding-Aufruf
  // aus, ein zu großer Batch würde die Serverless-Laufzeit sprengen.
  const safeBatch =
    Number.isInteger(batchSize) && batchSize > 0 && batchSize <= 25
      ? batchSize
      : 5;

  try {
    const targets = await listEmbeddableTargets(sql);
    const total = targets.length;
    const slice = targets.slice(safeOffset, safeOffset + safeBatch);

    let embedded = 0;
    let removed = 0;
    for (const t of slice) {
      const outcome = await embedOne(sql, t.contentType, t.contentId);
      if (outcome === "embedded") embedded++;
      else removed++;
    }

    const processed = Math.min(safeOffset + safeBatch, total);
    return {
      total,
      processed,
      embeddedInBatch: embedded,
      removedInBatch: removed,
      done: processed >= total,
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Backfill fehlgeschlagen: ${err.message}`
          : "Backfill fehlgeschlagen.",
    };
  }
}
