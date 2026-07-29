"use server";
import { checkPermission } from "@/lib/dal";
import {
  regenerateDialogueContent,
  getClosedDialogueIds,
} from "@/lib/dialoguesCore";
import sql from "@/lib/db";
import { revalidateAllContent } from "@/lib/revalidate";

export interface RegenerateDialogueContentBatchResult {
  error?: string;
  // Gesamtzahl abgeschlossener Dialoge (stabil über alle Batches).
  total?: number;
  // Wie viele Dialoge nach diesem Batch insgesamt geprüft wurden.
  processed?: number;
  // In DIESEM Batch tatsächlich erzeugte Fließtexte.
  changedInBatch?: number;
  // true, sobald alle Dialoge abgearbeitet sind.
  done?: boolean;
}

// Backfill für Dialoge, die vor Einführung des Fließtext-Features abgeschlossen
// wurden (siehe regenerateDialogueContent in src/lib/dialoguesCore.ts) — neu
// geschlossene/bearbeitete Dialoge bekommen ihren Fließtext bereits
// automatisch, dieser Knopf ist nur für den historischen Bestand nötig.
//
// admin.access (wie die /admin/scripts-Seite selbst und das Missionen-Panel) —
// dies ist eine Bulk-WARTUNGSAKTION, nicht die feingranulare
// Einzeldialog-Moderation (dialogues.moderate).
//
// Arbeitet BATCH-weise über eine STABILE Liste (getClosedDialogueIds, ORDER BY
// id) mit wachsendem offset — analog zum Bulk-Autolinking (LinkAllContentPanel).
// Der offset garantiert die Terminierung unabhängig davon, ob ein Dialog
// tatsächlich Fließtext bekommt (inhaltslose Dialoge bleiben content = NULL und
// würden eine schrumpfende „ohne Fließtext"-Auswahl sonst nie leeren).
export async function regenerateDialogueContentBatchAction(
  offset: number,
  batchSize: number,
): Promise<RegenerateDialogueContentBatchResult> {
  const check = await checkPermission("admin.access");
  if ("error" in check) return { error: check.error };

  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const safeBatch =
    Number.isInteger(batchSize) && batchSize > 0 && batchSize <= 100
      ? batchSize
      : 20;

  try {
    const ids = await getClosedDialogueIds();
    const total = ids.length;
    const slice = ids.slice(safeOffset, safeOffset + safeBatch);

    let changed = 0;
    for (const id of slice) {
      if (await regenerateDialogueContent(sql, id)) changed++;
    }
    // Nur wenn in diesem Batch wirklich Fließtext erzeugt wurde, die
    // Inhalts-Caches invalidieren.
    if (changed > 0) revalidateAllContent();

    const processed = Math.min(safeOffset + safeBatch, total);
    return {
      total,
      processed,
      changedInBatch: changed,
      done: processed >= total,
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Regenerierung fehlgeschlagen: ${err.message}`
          : "Regenerierung fehlgeschlagen.",
    };
  }
}
