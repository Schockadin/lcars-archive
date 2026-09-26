import { Suspense } from "react";
import { requireGM } from "@/lib/dal";
import PageSkeleton from "@/app/_shared/PageSkeleton";

// Gilt für /gm und alle Unterseiten (/gm/sessions, /gm/ap, /gm/talents).
// Anders als /admin (requireStaff = admin ODER gm ODER db-admin) ist das Gate
// hier eng: der Bereich enthält ausschließlich Spielleitungs-Werkzeuge, also
// gm.access. Die Unterseiten rufen requireGM zusätzlich selbst auf (Defense in
// Depth, gleiches Muster wie im Admin-Bereich).
//
// Dieses Gate leitet Anonyme auf /login und prüft zugleich das RECHT
// (gm.access) frisch aus der DB. Einen vorgelagerten Proxy gibt es nicht mehr
// (siehe src/app/user/layout.tsx).
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
