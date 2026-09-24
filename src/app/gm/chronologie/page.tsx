import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { listStoredTimelineEvents } from "@/lib/timelineStoredEvents";
import TimelineStoredEventsPanel from "./TimelineStoredEventsPanel";
import HelpHeading from "@/components/help/HelpHeading";
import { GmTimelineGuide } from "@/components/help/guides/GmGuides";
import TimelineCsvImportPanel from "./TimelineCsvImportPanel";

export const metadata: Metadata = {
  title: "Chronologie",
  robots: { index: false, follow: false },
};

// Die Werkbank für freie Chronologie-Ereignisse: CSV importieren und bereits
// gespeicherte Events pflegen. Die frühere RAG-Ableitung wurde entfernt.
export default async function GmChronologiePage() {
  await requireGM();
  const events = await listStoredTimelineEvents();

  return (
    <>
      <PageMeta title="Chronologie" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <HelpHeading
          eyebrow="Zugriff · Spielleitung"
          title="Chronologie"
          helpTitle="Leitung · Chronologie"
          tutorial="spielleitung-admins"
        >
          <GmTimelineGuide />
        </HelpHeading>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-ink-contrast text-[13px]">
            Die{" "}
            <Link href="/chronologie" className="underline">
              Chronologie
            </Link>{" "}
            zieht ihre Ereignisse zuerst aus dem, was ohnehin gepflegt ist:
            Missionsdaten, Logbuch-Daten, das Datum eines Gesprächs, das
            Geburtsdatum einer Figur — und aus den Marken, die ihr mit dem
            Kalender-Knopf an den Textfeldern von Charakteren, Missionen,
            Logbüchern und Datenbank-Einträgen setzt. Was darüber hinaus zur
            Kampagne gehört, lässt sich hier gesammelt per CSV importieren.
          </p>
          <p className="text-lcars-ink-dim text-[13px]">
            Die frühere Anbindung an den Datenbank-Assistenten wurde entfernt:
            Sie fand praktisch nur Missionsbeginn und -ende, die bereits aus den
            gepflegten Missionsdaten in der Chronologie stehen.
          </p>

          <TimelineCsvImportPanel />

          <TimelineStoredEventsPanel events={events} />
        </div>
      </article>
    </>
  );
}
