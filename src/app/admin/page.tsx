import { redirect } from "next/navigation";
import { userCan } from "@/lib/permissions";
import { requireStaff, getRoleMap } from "@/lib/dal";

// /admin selbst zeigt keinen eigenen Inhalt — es leitet auf die erste
// Unterseite weiter, für die der Viewer berechtigt ist. requireStaff() (nicht
// requireAdmin()) — sonst kämen ein reiner db-admin (nur DB-Rechte) und ein
// reiner Rechte-Verwalter (users.manage) hier gar nicht durch, obwohl
// /admin/db bzw. /admin/permissions für sie offenstehen.
//
// Die Spielleitung landet hier nicht mehr: ihre Werkzeuge liegen unter /gm.
export default async function AdminIndexPage() {
  const viewer = await requireStaff();
  const roleMap = await getRoleMap();
  if (userCan(viewer, "admin.access", roleMap)) redirect("/admin/users");
  if (userCan(viewer, "users.manage", roleMap)) redirect("/admin/permissions");
  redirect("/admin/db");
}
