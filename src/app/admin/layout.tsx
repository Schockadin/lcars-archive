import { Suspense } from "react";
import { requireStaff } from "@/lib/dal";
import PageSkeleton from "@/app/_shared/PageSkeleton";

// Gilt für /admin und alle Unterseiten (/admin/users, /admin/characters,
// /admin/db, /admin/scripts, /admin/content, /admin/audit-log,
// /admin/[id]/edit). requireGM() ist hier das gemeinsame Baseline-Gate
// (gm-oder-admin) für den ganzen Bereich und leitet Nicht-Privilegierte auf
// /login um — die admin-only-Unterseiten verschärfen das in ihrer eigenen
// Seite zusätzlich per requireAdmin() (Defense in Depth, gleiches Prinzip
// wie schon bei /admin/content und /admin/audit-log). Die Navigation
// zwischen den Unterseiten läuft über das Admin-Dropdown im Header
// (HeaderUserNav.tsx), nicht mehr über eine eigene Subnav hier.
//
// Das Session-Gate (requireStaff → cookies()) liegt unter cacheComponents in
// einer Suspense-Grenze: die statische Shell (LCARS-Chrome) wird sofort
// ausgeliefert, das rollenabhängige Gate und der gesamte darin gerenderte
// Seiteninhalt streamen zur Laufzeit nach.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[16px]">
      <Suspense fallback={<PageSkeleton />}>
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </div>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return <>{children}</>;
}
