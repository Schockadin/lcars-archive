import type { Metadata } from "next";
import { Suspense } from "react";
import PageMeta from "@/components/PageMeta";
import PageSkeleton from "@/app/_shared/PageSkeleton";
import TimelineView from "@/components/timeline/TimelineView";
import { getTimeline } from "@/lib/timeline";
import { getViewer } from "@/lib/visibility";

export const metadata: Metadata = {
  title: "Chronologie",
};

// Die Chronologie der Kampagne: alle Ereignisse in ihrer eigenen
// Zeitrechnung, zusammengetragen aus den Angaben der Inhalte, den Marken im
// Fließtext und dem, was die Spielleitung aus den Texten hat ableiten lassen
// (siehe src/lib/timeline.ts).
//
// Nicht gecacht — die Liste hängt an der Sichtbarkeit der betrachtenden
// Person (nicht-öffentliche Logbücher, Entwürfe), genau wie der
// Beziehungsgraph. Unter cacheComponents muss dieser Zugriff deshalb in einer
// Suspense-Grenze liegen, damit die statische Hülle sofort steht.
export default function ChronologiePage() {
  return (
    <>
      <PageMeta title="Chronologie" section="chronologie" />
      <Suspense fallback={<PageSkeleton />}>
        <ChronologieContent />
      </Suspense>
    </>
  );
}

async function ChronologieContent() {
  const viewer = await getViewer();
  const events = await getTimeline(viewer);
  return <TimelineView events={events} />;
}
