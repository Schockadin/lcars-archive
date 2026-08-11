import { Suspense } from "react";
import { verifySession } from "@/lib/dal";
import PageSkeleton from "@/app/_shared/PageSkeleton";

// Gilt für /user (Profil + Settings zusammengeführt) und /user/content
// (eigene Inhalte, Charaktere, Missionen, Follows etc.).
// Die eigentliche Navigation zeigt jetzt der Header (HeaderUserNav) — dieses
// Layout bleibt reines Session-Gate: anonyme Besucher werden zu /login
// umgeleitet, bevor irgendeine Unterseite rendert. Sicherheitsrelevant ist
// das nicht: die tatsächliche Zugriffskontrolle bleibt in jeder Seite selbst
// (requireGM/requireOwnUser/requireOwnCharacters/requireOwnGM).
//
// Das Session-Gate (verifySession → cookies()) liegt unter cacheComponents in
// einer Suspense-Grenze, damit die statische Shell sofort ausgeliefert werden
// kann; das Gate und der darin gerenderte Seiteninhalt streamen nach.
export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[16px]">
      <Suspense fallback={<PageSkeleton />}>
        <SessionGate>{children}</SessionGate>
      </Suspense>
    </div>
  );
}

async function SessionGate({ children }: { children: React.ReactNode }) {
  await verifySession();
  return <>{children}</>;
}
