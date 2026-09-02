import { Suspense } from "react";
import { requireStaff } from "@/lib/dal";
import PageSkeleton from "@/app/_shared/PageSkeleton";

// Gilt für /admin und alle Unterseiten (/admin/users, /admin/permissions,
// /admin/db, /admin/scripts, /admin/content, /admin/audit-log,
// /admin/[id]/edit). requireStaff() ist hier das gemeinsame Baseline-Gate für
// den ganzen Bereich und leitet Nicht-Privilegierte auf /login um — die
// admin-only-Unterseiten verschärfen das in ihrer eigenen Seite zusätzlich
// per requireAdmin() (Defense in Depth). Die Navigation zwischen den
// Unterseiten läuft über das Admin-Dropdown im Header (HeaderUserNav.tsx),
// nicht mehr über eine eigene Subnav hier.
//
// Die Werkzeuge der Spielleitung liegen NICHT mehr hier, sondern unter /gm
// (eigenes Layout mit requireGM) — ein reiner GM kommt durch dieses Gate
// deshalb bewusst nicht mehr durch.
//
// Anonyme Besucher fängt bereits der Proxy (src/proxy.ts) ab und leitet sie
// auf /login um. Dieses Gate bleibt trotzdem: Es prüft ROLLEN/RECHTE
// (admin.access/users.manage/DB-Rechte), was der optimistische Proxy bewusst
// nicht tut (bräuchte DB-Zugriff). requireStaff ist damit die verbindliche
// Rechteprüfung (Source of Truth), der Proxy nur die vorgelagerte
// Session-Filterung.
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
