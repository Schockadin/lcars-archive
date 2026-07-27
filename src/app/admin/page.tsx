import { redirect } from "next/navigation";
import { userCan } from "@/lib/permissions";
import { requireGM } from "@/lib/dal";

// /admin selbst zeigt keinen eigenen Inhalt mehr — leitet direkt auf die
// erste erlaubte Unterseite weiter (Pill-Subnav siehe admin/layout.tsx).
export default async function AdminIndexPage() {
  const viewer = await requireGM();
  redirect(userCan(viewer, "admin.access") ? "/admin/users" : "/admin/campaign");
}
