import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { hasRagConfig } from "@/lib/rag";
import { listTimelineSources } from "@/lib/timelineSources";
import {
  countInferredBySource,
  listInferredEvents,
} from "@/lib/timelineInference";
import TimelineInferencePanel, {
  type SourceRow,
} from "./TimelineInferencePanel";

export const metadata: Metadata = {
  title: "Chronologie",
  robots: { index: false, follow: false },
};

// Die Werkbank hinter der Chronologie: aus einem Inhalt Ereignisse ableiten
// lassen und das Ergebnis pflegen.
//
// Bewusst je Inhalt auf Knopfdruck und nicht automatisch beim Speichern: ein
// Durchlauf kostet einen Modellaufruf, und was dabei herauskommt, gehört
// gelesen, bevor es in der Chronologie aller steht. Der Text selbst bleibt auf
// dem Server — die Liste im Browser kennt nur Titel, Art und Länge.
export default async function GmChronologiePage() {
  await requireGM();
  const [sources, events, counts] = await Promise.all([
    listTimelineSources(),
    listInferredEvents(),
    countInferredBySource(),
  ]);

  const rows: SourceRow[] = sources.map((source) => ({
    sourceType: source.sourceType,
    slug: source.slug,
    title: source.title,
    length: source.length,
    inferredCount: counts.get(`${source.sourceType}:${source.slug}`) ?? 0,
  }));

  return (
    <>
      <PageMeta title="Chronologie" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>Chronologie</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-ink-contrast text-[13px]">
            Die{" "}
            <Link href="/chronologie" className="underline">
              Chronologie
            </Link>{" "}
            zieht ihre Ereignisse zuerst aus dem, was ohnehin gepflegt ist:
            Missionsdaten, Logbuch-Daten, das Datum eines Gesprächs, das
            Geburtsdatum einer Figur — und aus den Marken, die ihr mit dem
            Kalender-Knopf in jedem Textfeld setzt. Hier kommt die dritte
            Quelle dazu: das Sprachmodell liest einen Text und schlägt die
            Ereignisse vor, die darin stecken, aber in keinem Feld stehen.
          </p>
          <p className="text-lcars-ink-dim text-[13px]">
            Ein Durchlauf kostet einen Modellaufruf. Was dabei herauskommt,
            landet sofort in der Chronologie und ist dort als abgeleitet
            gekennzeichnet — sieh es dir unten an und entferne, was nicht
            stimmt. Ein zweiter Durchlauf über denselben Inhalt legt nichts
            doppelt an.
          </p>

          <TimelineInferencePanel
            sources={rows}
            events={events}
            ragConfigured={hasRagConfig()}
          />
        </div>
      </article>
    </>
  );
}
