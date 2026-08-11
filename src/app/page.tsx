import { Suspense } from "react";
import LandingPage from "./LandingPage";
import Dashboard from "./Dashboard";
import LandingStats from "@/components/lcars/LandingStats";
import { LcarsSkeleton } from "@/components/lcars";
import PageSkeleton from "@/app/_shared/PageSkeleton";
import { APP_VERSION } from "@/lib/version";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/users";

// Platzhalter für die DB-Statistik, während getDBStats() lädt. Der Rest der
// Startseite rendert sofort, nur dieser Block streamt nach.
function StatsSkeleton() {
  return (
    <div className="mt-[8px] flex flex-col gap-[8px]">
      <LcarsSkeleton className="h-[16px] w-[180px] self-end" />
      {Array.from({ length: 5 }).map((_, i) => (
        <LcarsSkeleton
          key={i}
          className="h-lcars-datarow w-[320px]"
        />
      ))}
    </div>
  );
}

// "/" ist die einzige Seite, die sich je nach Login-Status unterschiedlich
// zeigt statt zu redirecten: eingeloggte User sehen ihr Dashboard (vorher
// auf /home, das jetzt wieder ein blanker Redirect hierher ist, siehe
// next.config.ts), anonyme Besucher weiterhin die Landingpage. Ein
// ungültiger Session-Cookie (User zwischenzeitlich gelöscht) fällt bewusst
// auf die Landingpage zurück statt auf /login zu redirecten — "/" selbst
// verlangt kein Login.
export default function Page() {
  // Der Login-Status kommt aus dem Session-Cookie (Laufzeit-Daten) — unter
  // cacheComponents muss dieser Zugriff in einer Suspense-Grenze liegen, damit
  // die statische Shell (LCARS-Chrome) sofort ausgeliefert werden kann und die
  // login-abhängige Startseite nachgestreamt wird.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const session = await getSession();
  const user = session ? await getUserById(session.userId) : null;

  if (user) {
    return <Dashboard user={user} />;
  }

  return (
    <LandingPage
      appVersion={APP_VERSION}
      stats={
        <Suspense fallback={<StatsSkeleton />}>
          <LandingStats />
        </Suspense>
      }
    />
  );
}
