import "server-only";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { getUserForAdmin } from "@/lib/users";
import type { User } from "@/types/db";
import type { UserAdminDetail } from "@/lib/users";

export interface AdminEditTargetAccess {
  viewer: User;
  target: UserAdminDetail;
}

// Für /admin/[id]/edit: strikt admin-only (die Useraccount-Bearbeitung
// selbst ist admin-only, siehe requireAdmin in src/lib/dal.ts und der
// gleiche Grundsatz in src/app/admin/actions.ts; ein reiner gm darf hier
// nicht rein, auch nicht für sich selbst — dafür gibt es die eigene
// Profil-Seite unter /user/[id]). requireAdmin() prüft frisch aus der DB,
// nicht aus dem Cookie, damit ein gerade entzogenes Admin-Recht sofort
// greift.
export async function requireAdminEditTarget(
  idParam: string,
): Promise<AdminEditTargetAccess> {
  const viewer = await requireAdmin();

  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    redirect("/admin");
  }

  const target = await getUserForAdmin(id);
  if (!target) {
    redirect("/admin");
  }

  return { viewer, target };
}
