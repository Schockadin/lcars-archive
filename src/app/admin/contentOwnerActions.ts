"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { assignCharacterToUser } from "@/lib/characters";
import { setMissionOwner, setMissionLogOwner } from "@/lib/missions";
import { setArchiveEntryOwner } from "@/lib/archive";
import {
  revalidateCharacter,
  revalidateMission,
  revalidateLog,
  revalidateArchiveEntry,
} from "@/lib/revalidate";
import type { OwnerContentType } from "@/app/actions/owner";

export interface BulkSetOwnerResult {
  count?: number;
  error?: string;
}

// Mass-Edit-Gegenstück zu setOwnerAction (src/app/actions/owner.ts) für die
// Admin-Inhaltsübersicht (/admin/content, AdminContentBrowser.tsx): statt
// eines einzelnen Inhalts eine per Checkbox ausgewählte, über alle vier
// Typen gemischte Liste. Admin-only (requireAdmin, wie
// assignOwnerlessMissionsAction) — anders als dort wird die Rolle des
// Ziel-Owners hier NICHT geprüft (gleiches Prinzip wie setOwnerAction für
// einzelne Inhalte: jeder aktive User kann Owner werden).
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
    if (item.contentType === "character") {
      const character = await assignCharacterToUser(item.id, ownerId);
      if (character) {
        revalidateCharacter(character.slug);
        count++;
      }
    } else if (item.contentType === "mission") {
      const mission = await setMissionOwner(item.id, ownerId);
      if (mission) {
        revalidateMission(mission.slug);
        count++;
      }
    } else if (item.contentType === "mission_log") {
      const log = await setMissionLogOwner(item.id, ownerId);
      if (log) {
        revalidateLog(log.missionId, log.slug);
        count++;
      }
    } else {
      const entry = await setArchiveEntryOwner(item.id, ownerId);
      if (entry) {
        revalidateArchiveEntry(entry.slug);
        count++;
      }
    }
  }

  revalidatePath("/admin/content");
  return { count };
}
