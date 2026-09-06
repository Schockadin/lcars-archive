import TimelineView from "@/components/timeline/TimelineView";
import { getTimeline } from "@/lib/timeline";
import { categoryVisual } from "@/lib/timelineTypes";
import { getViewer } from "@/lib/visibility";

// Die Chronologie, auf eine Ereignisart eingeschränkt
// (/chronologie/[kategorie] und, weil ein statisches Segment das dynamische
// schlägt, /chronologie/mission als eigene Seite). Beide zeigen denselben
// Zeitstrahl wie /chronologie, nur mit vorgewählter Art.
//
// Gefiltert wird weiterhin im Browser — die Route ist der Einstieg und der
// teilbare Link, kein zweiter Datenzugriff.
export function categoryMetadata(category: string) {
  return { title: `Chronologie · ${categoryVisual(category).label}` };
}

// Nur der datenabhängige Teil: die Seiten rahmen ihn selbst in <Suspense>.
// Unter cacheComponents muss jeder Laufzeit-Zugriff (Cookies für den
// Betrachter, die Ereignisse selbst, und in der dynamischen Route auch das
// Auflösen von params) INNERHALB dieser Grenze liegen, sonst blockiert er die
// ganze Seite — der Build bricht darüber ab.
export default async function CategoryTimeline({
  category,
}: {
  category: string;
}) {
  const viewer = await getViewer();
  const events = await getTimeline(viewer);
  return <TimelineView events={events} initialCategory={category} syncUrl />;
}
