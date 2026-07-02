import { Suspense } from "react";
import LandingPage from "./LandingPage";
import LandingStats from "@/components/lcars/LandingStats";
import { LcarsSkeleton } from "@/components/lcars";
import { APP_VERSION } from "@/lib/version";

// Platzhalter für die DB-Statistik, während getDBStats() lädt. Der Rest der
// Startseite rendert sofort, nur dieser Block streamt nach.
function StatsSkeleton() {
  return (
    <div className="mt-[8px] flex flex-col gap-[8px]">
      <LcarsSkeleton className="h-[16px] w-[180px] self-end" />
      {Array.from({ length: 5 }).map((_, i) => (
        <LcarsSkeleton
          key={i}
          className="h-[var(--lcars-datarow-h)] w-[320px]"
        />
      ))}
    </div>
  );
}

export default function Page() {
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
