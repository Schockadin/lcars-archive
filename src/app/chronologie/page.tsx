import type { Metadata } from "next";
import CategoryTimeline, {
  ChronologyShell,
} from "@/app/chronologie/_shared/CategoryChronology";

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
// Beziehungsgraph. Gerüst und Datenzugriff teilt sie sich mit den
// Kategorie-Seiten (siehe _shared/CategoryChronology.tsx).
export default function ChronologiePage() {
  return (
    <ChronologyShell>
      <CategoryTimeline />
    </ChronologyShell>
  );
}
