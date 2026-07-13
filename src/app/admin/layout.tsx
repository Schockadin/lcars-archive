import { requireGM } from "@/lib/dal";
import AdminSubNav from "./AdminSubNav";

// Gilt für /admin und alle Unterseiten (/admin/users, /admin/characters,
// /admin/db, /admin/scripts, /admin/content, /admin/audit-log,
// /admin/[id]/edit). requireGM() ist hier das gemeinsame Baseline-Gate
// (gm-oder-admin) für den ganzen Bereich und leitet Nicht-Privilegierte auf
// /login um — die admin-only-Unterseiten verschärfen das in ihrer eigenen
// Seite zusätzlich per requireAdmin() (Defense in Depth, gleiches Prinzip
// wie schon bei /admin/content und /admin/audit-log). Rendert außerdem die
// Pill-Subnav (AdminSubNav) einmal für den ganzen Bereich statt pro Seite.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireGM();

  return (
    <div className="flex flex-col gap-[16px]">
      <AdminSubNav isAdmin={viewer.role === "admin"} />
      {children}
    </div>
  );
}
