import { requireGM } from "@/lib/dal";

// Gilt für /admin und alle Unterseiten (/admin/users, /admin/characters,
// /admin/db, /admin/scripts, /admin/content, /admin/audit-log,
// /admin/[id]/edit). requireGM() ist hier das gemeinsame Baseline-Gate
// (gm-oder-admin) für den ganzen Bereich und leitet Nicht-Privilegierte auf
// /login um — die admin-only-Unterseiten verschärfen das in ihrer eigenen
// Seite zusätzlich per requireAdmin() (Defense in Depth, gleiches Prinzip
// wie schon bei /admin/content und /admin/audit-log). Die Navigation
// zwischen den Unterseiten läuft über das Admin-Dropdown im Header
// (HeaderUserNav.tsx), nicht mehr über eine eigene Subnav hier.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGM();

  return <div className="flex flex-col gap-[16px]">{children}</div>;
}
