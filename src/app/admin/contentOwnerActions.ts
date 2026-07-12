"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { setOwnerAction, type OwnerContentType } from "@/app/actions/owner";

export interface BulkSetOwnerResult {
  count?: number;
  error?: string;
}

// Mass-Edit-Gegenstück zu setOwnerAction (src/app/actions/owner.ts) für die
// Admin-Inhaltsübersicht (/admin/content, AdminContentBrowser.tsx): statt
// eines einzelnen Inhalts eine per Checkbox ausgewählte, über alle vier
// Typen gemischte Liste — ruft setOwnerAction einfach pro Eintrag auf statt
// dessen contentType-Switch (samt den passenden Revalidate-Aufrufen) hier
// noch einmal zu duplizieren. requireAdmin() hier zusätzlich vorab, damit
// bei fehlender Berechtigung nicht erst nach dem ersten von evtl. vielen
// Items abgebrochen wird — setOwnerAction prüft die Rolle intern zwar
// erneut, das ist aber ein günstiger Rollen-Read und hält setOwnerAction als
// alleinige Quelle für die Content-Type-Logik.
export async function bulkSetContentOwnerAction(
  items: { contentType: OwnerContentType; id: number }[],
  ownerId: number | null,
): Promise<BulkSetOwnerResult> {
  await requireAdmin();

  if (ownerId != null && !(await getUserById(ownerId))) {
    return { error: "Ungültiger User." };
  }

  let count = 0;
  for (const item of items) {
    const result = await setOwnerAction(item.contentType, item.id, ownerId);
    if (!result.error) count++;
  }

  revalidatePath("/admin/content");
  return { count };
}
