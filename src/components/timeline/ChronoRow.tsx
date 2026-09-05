import { fmtDate } from "@/lib/missionFormat";

// Eine Zeile des Zeitstrahls: Datum · Schiene mit Punkt · Karte.
//
// Dieselbe Schiene tragen die Chronologie (/chronologie) und die
// Missions-Übersicht (/missions) — es ist zweimal derselbe Gegenstand, eine
// Liste datierter Einträge, und zwei Schienen nebeneinander wären zwei
// Antworten auf dieselbe Frage. Die Optik steckt in timeline.css
// (.timeline-event und Nachbarn).
//
// Bewusst ohne "use client": die Zeile ist reines Markup und wird von
// Client-Komponenten (TimelineView, MissionsOverview) mitgezogen.
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
