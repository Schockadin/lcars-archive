"use server";
import { checkPermission, getRoleMap } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { userCan } from "@/lib/permissions";
import {
  assignOwnerlessMissionsBatch,
  countOwnerlessMissions,
} from "@/lib/missions";
import { revalidateMission } from "@/lib/revalidate";

export interface AssignOwnerlessMissionsBatchResult {
  error?: string;
  // In DIESEM Batch zugeordnete Missionen.
  assignedInBatch?: number;
  // Noch besitzerlose Missionen NACH diesem Batch.
  remaining?: number;
}

// Admin-only (wie setOwnerAction in src/app/actions/owner.ts) — weist alle
// Missionen ohne Owner der ausgewählten Spielleitung zu. Arbeitet BATCH-weise
// für die Fortschrittsanzeige (siehe AssignOwnerlessMissionsPanel.tsx): der
// Client ruft die Action seriell auf, bis remaining 0 erreicht. So bleibt jeder
// Request klein (kein Timeout bei sehr vielen Missionen). Kein offset nötig —
// zugeordnete Missionen verlassen die Menge „owner_user_id IS NULL", die
// Auswahl greift also immer die nächsten offenen.
export async function assignOwnerlessMissionsBatchAction(
  ownerId: number,
  batchSize: number,
): Promise<AssignOwnerlessMissionsBatchResult> {
  const check = await checkPermission("admin.access");
  if ("error" in check) return { error: check.error };

  const owner = await getUserById(ownerId);
  if (!owner) {
    return { error: "Ungültiger User." };
  }
  if (!userCan(owner, "missions.manage", await getRoleMap())) {
    return { error: "Nur Spielleitung/Administration kann zugeordnet werden." };
  }

  const safeBatch =
    Number.isInteger(batchSize) && batchSize > 0 && batchSize <= 100
      ? batchSize
      : 20;

  const { slugs } = await assignOwnerlessMissionsBatch(ownerId, safeBatch);
  for (const slug of slugs) {
    revalidateMission(slug);
  }
  const remaining = await countOwnerlessMissions();

  return { assignedInBatch: slugs.length, remaining };
}
