import { redirect } from "next/navigation";
import { userCan } from "@/lib/permissions";
import { requireGM, getRoleMap } from "@/lib/dal";

// /admin selbst zeigt keinen eigenen Inhalt mehr — leitet direkt auf die
// erste erlaubte Unterseite weiter (Pill-Subnav siehe admin/layout.tsx).
export default async function AdminIndexPage() {
  const viewer = await requireGM();
  const roleMap = await getRoleMap();
  redirect(
    userCan(viewer, "admin.access", roleMap) ? "/admin/users" : "/admin/campaign",
  );
}
