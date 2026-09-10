import { fmtDate } from "@/lib/missionFormat";

// Eine Zeile des Zeitstrahls: Datum · Schiene mit Punkt · Karte.
//
// Gebaut wurde sie für zwei Listen — die Chronologie und die frühere eigene
// Missions-Übersicht. Beide sind inzwischen dieselbe Seite (/chronologie
// zeigt in der Vorgabe die Missionsstarts), die Zeile bleibt trotzdem eine
// eigene Komponente: sie ist das Gerüst des Zeitstrahls, nicht ein Detail
// seiner Ansicht. Die Optik steckt in timeline.css (.timeline-event und
// Nachbarn).
//
// Dieselbe Zeile trägt die alphabetische Datenbank (/archive): dort steht
// statt der Monatsgruppe ein Buchstabe über der Gruppe und die Datumsspalte
// entfällt — die Schiene mit ihrem Punkt ist in beiden Listen dieselbe.
//
// Bewusst ohne "use client": die Zeile ist reines Markup und wird von der
// Client-Komponente TimelineView mitgezogen.
export default function ChronoRow({
  date,
  color,
  children,
}: {
  // ISO-Datum des Eintrags. null lässt die Spalte leer — der Punkt steht
  // trotzdem, sonst risse die Linie. Wird die Angabe ganz weggelassen
  // (Datenbank), entfällt die Datumsspalte komplett.
  date?: string | null;
  // Farbe des Punktes; kommt aus der Kategorie bzw. dem Missionsstatus.
  color: string;
  children: React.ReactNode;
}) {
  const dated = date !== undefined;
  const formatted = fmtDate(date ?? null);

  return (
    <article
      className={dated ? "timeline-event" : "timeline-event timeline-event-undated"}
      style={{ "--timeline-color": color } as React.CSSProperties}
    >
      {/* Aus der Karte heraus schon lesbar (dort steht das Datum in der
          Meta-Zeile) — hier ist es Orientierung, kein zweiter Vorleser. */}
      {dated && (
        <div className="timeline-date" aria-hidden="true">
          {formatted.slice(0, 6)}
          <b>{formatted.slice(6)}</b>
        </div>
      )}
      <div className="timeline-rail" aria-hidden="true">
        <span className="timeline-dot" />
      </div>
      {children}
    </article>
  );
}
