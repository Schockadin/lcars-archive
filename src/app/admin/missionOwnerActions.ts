"use server";
import { requireAdmin } from "@/lib/dal";
import { getUserById } from "@/lib/users";
import { userCan } from "@/lib/permissions";
import { assignOwnerlessMissionsToUser } from "@/lib/missions";
import { revalidateMission } from "@/lib/revalidate";

export interface AssignOwnerlessMissionsResult {
  count?: number;
  error?: string;
}

// Admin-only (wie setOwnerAction in src/app/actions/owner.ts) — im
// Gegensatz dazu keine einzelne Mission, sondern alle auf einen Schlag, die
// noch owner_user_id IS NULL haben (siehe assignOwnerlessMissionsToUser in
// src/lib/missions.ts).
export async function assignOwnerlessMissionsAction(
  ownerId: number,
): Promise<AssignOwnerlessMissionsResult> {
  await requireAdmin();

  const owner = await getUserById(ownerId);
  if (!owner) {
    return { error: "Ungültiger User." };
  }
  if (!userCan(owner, "missions.manage")) {
    return { error: "Nur Spielleitung/Administration kann zugeordnet werden." };
  }

  const { slugs } = await assignOwnerlessMissionsToUser(ownerId);
  for (const slug of slugs) {
    revalidateMission(slug);
  }

  return { count: slugs.length };
}
