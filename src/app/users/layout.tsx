import { Suspense } from "react";
import { requireNonGuest } from "@/lib/dal";
import PageSkeleton from "@/app/_shared/PageSkeleton";

// Gilt für /users (Userübersicht) und /users/[id] (öffentliches Profil).
// requireNonGuest() sperrt Gast-Accounts komplett aus (siehe dal.ts) —
// admin/gm sehen auf /users zusätzlich Admin-Aktionen (siehe page.tsx),
// player/viewer bekommen dort nur die Subscribe-Aktion.
//
// Anonyme Besucher fängt bereits der Proxy (src/proxy.ts) ab und leitet sie
// auf /login um. Dieses Gate bleibt trotzdem: Es prüft ein RECHT
// (users.browse), was der optimistische Proxy bewusst nicht tut (bräuchte
// DB-Zugriff). requireNonGuest ist damit die verbindliche Rechteprüfung
// (Source of Truth), der Proxy nur die vorgelagerte Session-Filterung.
//
// Das Gate (requireNonGuest → cookies()) liegt unter cacheComponents in einer
// Suspense-Grenze, damit die statische Shell sofort erscheint und der
// rechtegeprüfte Inhalt nachstreamt.
export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[16px]">
      <Suspense fallback={<PageSkeleton />}>
        <NonGuestGate>{children}</NonGuestGate>
      </Suspense>
    </div>
  );
}

async function NonGuestGate({ children }: { children: React.ReactNode }) {
  await requireNonGuest();
  return <>{children}</>;
}
