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
// Bewusst ohne "use client": die Zeile ist reines Markup und wird von der
// Client-Komponente TimelineView mitgezogen.
export default function ChronoRow({
  date,
  color,
  children,
}: {
  // ISO-Datum des Eintrags. Ohne Datum bleibt die Spalte leer — der Punkt
  // steht trotzdem, sonst risse die Linie.
  date: string | null;
  // Farbe des Punktes; kommt aus der Kategorie bzw. dem Missionsstatus.
  color: string;
  children: React.ReactNode;
}) {
  const formatted = fmtDate(date);

  return (
    <article
      className="timeline-event"
      style={{ "--timeline-color": color } as React.CSSProperties}
    >
      {/* Aus der Karte heraus schon lesbar (dort steht das Datum in der
          Meta-Zeile) — hier ist es Orientierung, kein zweiter Vorleser. */}
      <div className="timeline-date" aria-hidden="true">
        {formatted.slice(0, 6)}
        <b>{formatted.slice(6)}</b>
      </div>
      <div className="timeline-rail" aria-hidden="true">
        <span className="timeline-dot" />
      </div>
      {children}
    </article>
  );
}
