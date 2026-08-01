import { redirect } from "next/navigation";
import { userCan } from "@/lib/permissions";
import { requireStaff, getRoleMap } from "@/lib/dal";

// /admin selbst zeigt keinen eigenen Inhalt mehr — leitet direkt auf die
// erste erlaubte Unterseite weiter (Pill-Subnav siehe admin/layout.tsx).
// requireStaff() (nicht requireGM()) — sonst käme ein reiner db-admin, der
// nur DB-Rechte, aber weder gm.access noch admin.access hat, hier gar nicht
// durch, obwohl /admin/db für ihn offensteht. Gestaffelte Weiterleitung auf
// die erste Unterseite, für die der Viewer berechtigt ist.
export default async function AdminIndexPage() {
  const viewer = await requireStaff();
  const roleMap = await getRoleMap();
  if (userCan(viewer, "admin.access", roleMap)) redirect("/admin/users");
  if (userCan(viewer, "gm.access", roleMap)) redirect("/admin/campaign");
  redirect("/admin/db");
}
