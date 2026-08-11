import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import OfflineRetryButton from "./OfflineRetryButton";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

// Statische Offline-Ausweichseite. Der Service Worker (public/sw.js) legt
// diese Seite beim Install ins Precache und liefert sie aus, wenn eine
// Navigation offline fehlschlägt UND keine zwischengespeicherte Version der
// Zielseite vorliegt. Bewusst vollständig statisch (kein Cookie-/DB-Zugriff),
// damit sie ohne Netz und ohne laufende Server-Komponenten funktioniert.
export default function OfflinePage() {
  return (
    <>
      <PageMeta title="Offline" section="home" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Verbindung</p>
        <h1>Offline</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p>
            Diese Seite ist gerade nicht verfügbar, weil keine
            Internetverbindung besteht. Bereits besuchte Seiten bleiben offline
            abrufbar — neue Inhalte, Anmeldung und das Speichern von Änderungen
            brauchen jedoch eine Verbindung.
          </p>
          <p className="text-lcars-amber">
            Sobald du wieder online bist, lädt die App automatisch die aktuellen
            Daten nach.
          </p>
          <OfflineRetryButton />
        </div>
      </article>
    </>
  );
}
