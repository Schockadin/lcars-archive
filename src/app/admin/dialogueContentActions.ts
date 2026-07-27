"use server";
import { requireAdmin } from "@/lib/dal";
import {
  regenerateDialogueContent,
  getDialoguesNeedingContentBatch,
  countDialoguesNeedingContent,
} from "@/lib/dialoguesCore";
import sql from "@/lib/db";
import { revalidateAllContent } from "@/lib/revalidate";

export interface RegenerateDialogueContentBatchResult {
  error?: string;
  // In DIESEM Batch tatsächlich erzeugte Fließtexte.
  changedInBatch?: number;
  // Wie viele Dialoge dieser Batch angefasst hat (= Batch-Größe bzw. Rest).
  processedInBatch?: number;
  // Noch offene Dialoge OHNE Fließtext NACH diesem Batch.
  remaining?: number;
}

// Backfill für Dialoge, die vor Einführung des Fließtext-Features abgeschlossen
// wurden (siehe regenerateDialogueContent in src/lib/dialoguesCore.ts) — neu
// geschlossene/bearbeitete Dialoge bekommen ihren Fließtext bereits
// automatisch, dieser Knopf ist nur für den historischen Bestand nötig.
//
// Arbeitet BATCH-weise für die Fortschrittsanzeige (siehe
// DialogueContentRegeneratePanel.tsx): der Client ruft die Action seriell auf,
// bis remaining 0 erreicht. So bleibt jeder Request klein (kein Timeout bei
// vielen Dialogen). Kein offset nötig — bearbeitete Dialoge verlassen die Menge
// „ohne Fließtext", die Auswahl greift also immer die nächsten offenen.
export async function regenerateDialogueContentBatchAction(
  batchSize: number,
): Promise<RegenerateDialogueContentBatchResult> {
  // admin.access (wie die /admin/scripts-Seite selbst und das Missionen-Panel)
  // — dies ist eine Bulk-WARTUNGSAKTION, nicht die feingranulare
  // Einzeldialog-Moderation (dialogues.moderate). Vorher auf dialogues.moderate
  // gegatet, was Admins ohne dieses (in eigenen Rollen entziehbare) Recht
  // aussperrte, obwohl sie die Seite betreten dürfen.
  await requireAdmin();

  const safeBatch =
    Number.isInteger(batchSize) && batchSize > 0 && batchSize <= 100
      ? batchSize
      : 20;

  try {
    const ids = await getDialoguesNeedingContentBatch(safeBatch);
    let changed = 0;
    for (const id of ids) {
      if (await regenerateDialogueContent(sql, id)) changed++;
    }
    const remaining = await countDialoguesNeedingContent();
    // Nur wenn tatsächlich etwas erzeugt wurde und der Bestand abgearbeitet ist,
    // einmalig die Inhalts-Caches invalidieren (nicht pro Batch).
    if (ids.length > 0 && remaining === 0) revalidateAllContent();
    return {
      changedInBatch: changed,
      processedInBatch: ids.length,
      remaining,
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
