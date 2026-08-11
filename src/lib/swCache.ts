// Fordert den Service Worker auf, seinen Laufzeit-Seiten-Cache zu leeren
// (siehe public/sw.js, message-Handler). Wird beim An- und Abmelden aufgerufen,
// damit personalisierte/authentifizierte Seiten nach einem Sitzungswechsel
// nicht offline aus dem Cache eines anderen Kontos wiederkehren.
//
// Bewusst NICHT nur an navigator.serviceWorker.controller gehängt: der
// Controller ist null, solange die AKTUELLE Seite noch nicht vom SW kontrolliert
// wird (frischer Tab / erster Load / harter Reload) — genau der Fall auf einem
// gerade erst geöffneten geteilten Gerät. Stattdessen über
// navigator.serviceWorker.ready den AKTIVEN Worker der Registrierung ansprechen
// (existiert unabhängig davon, ob er diese Seite schon übernommen hat); die
// eigentliche Cache-Löschung läuft per event.waitUntil im SW und überlebt die
// unmittelbar folgende Logout-/Login-Navigation. Fire-and-forget; ohne Service
// Worker ein stiller No-op.
export function clearServiceWorkerPageCache(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  const message = "neo-archive:clear-page-cache";
  // Sofort an den (evtl. vorhandenen) Controller — schnellster Weg.
  navigator.serviceWorker.controller?.postMessage(message);
  // Und robust an den aktiven Worker, sobald die Registrierung bereit ist —
  // greift auch, wenn der Controller (noch) null ist.
  navigator.serviceWorker.ready
    .then((registration) => registration.active?.postMessage(message))
    .catch(() => {
      // Kein aktiver Service Worker / nicht unterstützt — nichts zu tun.
    });
}
