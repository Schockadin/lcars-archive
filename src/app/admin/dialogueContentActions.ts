"use server";
import { requirePermission } from "@/lib/dal";
import { regenerateAllClosedDialogueContent } from "@/lib/dialoguesCore";
import { revalidateAllContent } from "@/lib/revalidate";

export interface RegenerateDialogueContentActionResult {
  count?: number;
  error?: string;
}

// Backfill für Dialoge, die vor Einführung des Fließtext-Features
// abgeschlossen wurden (siehe regenerateAllClosedDialogueContent in
// src/lib/dialoguesCore.ts) — neu geschlossene/bearbeitete Dialoge bekommen
// ihren Fließtext bereits automatisch, dieser Knopf ist nur für den
// historischen Bestand nötig.
export async function regenerateAllDialogueContentAction(): Promise<RegenerateDialogueContentActionResult> {
  await requirePermission("dialogues.moderate");

  try {
    const count = await regenerateAllClosedDialogueContent();
    revalidateAllContent();
    return { count };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Regenerierung fehlgeschlagen: ${err.message}`
          : "Regenerierung fehlgeschlagen.",
    };
  }
}
