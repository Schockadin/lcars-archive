import { Suspense } from "react";
import PageMeta from "@/components/PageMeta";
import PageSkeleton from "@/app/_shared/PageSkeleton";
import TimelineView from "@/components/timeline/TimelineView";
import { getTimeline } from "@/lib/timeline";
import { categoryVisual, latestEventDate, type TimelineScope } from "@/lib/timelineTypes";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import { listCharactersForEvents } from "@/lib/timelineManualEvents";
import HelpButton from "@/components/help/HelpButton";
import { PublicChronologyGuide } from "@/components/help/guides/PublicGuides";

// Das Gerüst und der Datenzugriff der Chronologie — geteilt von den drei
// Seiten, die sie zeigen: /chronologie, /chronologie/mission und
// /chronologie/[kategorie]. Sie unterscheiden sich nur in der vorgewählten
// Ereignisart; das Drumherum (Kopfzeile, Suspense-Grenze, Betrachter,
// Ereignisse) stand dreimal gleich da.
//
// Gefiltert wird weiterhin im Browser — die Kategorie-Route ist der Einstieg
// und der teilbare Link, kein zweiter Datenzugriff.

export function categoryMetadata(category: string) {
  return { title: `Chronologie · ${categoryVisual(category).label}` };
}

// Die Hülle: Kopfzeile plus Suspense-Grenze. Unter cacheComponents muss jeder
// Laufzeit-Zugriff INNERHALB dieser Grenze liegen — die Cookies des
// Betrachters, die Ereignisse, und in der dynamischen Route auch das Auflösen
// von params. Sonst blockiert er die ganze Seite und der Build bricht ab;
// deshalb reicht die Hülle `children` durch, statt selbst zu laden.
export function ChronologyShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageMeta title="Chronologie" section="chronologie" />
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </>
  );
}

// Der datenabhängige Teil. Ohne `category` die ungefilterte Chronologie.
export default async function CategoryTimeline({
  category = null,
  initialScope,
  initialPerson = null,
  help = false,
}: {
  category?: string | null;
  initialScope?: TimelineScope;
  initialPerson?: string | null;
  // Den Fragezeichen-Knopf trägt nur die Chronologie selbst (/chronologie).
  // Die Kategorie- und Missions-Routen zeigen dieselbe Ansicht mit
  // vorgewähltem Filter — dort erklärt derselbe Text nichts Neues, und die
  // Kopfzeile bliebe doppelt beknöpft, wenn man von dort weiterklickt.
  help?: boolean;
}) {
  const viewer = await getViewer();
  const events = await getTimeline();
  // Wer eigene Inhalte anlegen darf, darf auch ein Ereignis eintragen, das zu
  // keinem Inhalt gehört (siehe timelineManualEvents.ts).
  const canAddEvent = viewerHasPermission(viewer, "content.create");
  // Nur für die, die auch eintragen dürfen — sonst eine Abfrage für nichts.
  const characters = canAddEvent ? await listCharactersForEvents() : [];
  return (
    <TimelineView
      help={
        help ? (
          <HelpButton title="Chronologie" tutorial="seiten-im-ueberblick">
            <PublicChronologyGuide />
          </HelpButton>
        ) : undefined
      }
      events={events}
      initialCategory={category}
      initialScope={initialScope}
      initialPerson={initialPerson}
      canAddEvent={canAddEvent}
      characters={characters}
      latestEventDate={latestEventDate(events)}
      syncUrl
    />
  );
}
