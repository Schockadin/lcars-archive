import { Suspense } from "react";
import { requireGM } from "@/lib/dal";
import PageSkeleton from "@/app/_shared/PageSkeleton";

// Gilt für /gm und alle Unterseiten (/gm/sessions, /gm/ap, /gm/talents).
// Anders als /admin (requireStaff = admin ODER gm ODER db-admin) ist das Gate
// hier eng: der Bereich enthält ausschließlich Spielleitungs-Werkzeuge, also
// gm.access. Die Unterseiten rufen requireGM zusätzlich selbst auf (Defense in
// Depth, gleiches Muster wie im Admin-Bereich).
//
// Anonyme Besucher fängt bereits der Proxy ab (src/proxy.ts kennt /gm als
// geschützten Präfix); dieses Gate prüft das RECHT, was der optimistische
// Proxy bewusst nicht tut (bräuchte DB-Zugriff).
//
// Navigation: über das Leitungs-/Admin-Dropdown im Header
// (HeaderUserNav.tsx), wie bei den /admin-Unterseiten.
export default function GmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[16px]">
      <Suspense fallback={<PageSkeleton />}>
        <GmGate>{children}</GmGate>
      </Suspense>
    </div>
  );
}

async function GmGate({ children }: { children: React.ReactNode }) {
  await requireGM();
  return <>{children}</>;
}
