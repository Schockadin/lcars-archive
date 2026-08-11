// Fordert den Service Worker auf, seinen Laufzeit-Seiten-Cache zu leeren
// (siehe public/sw.js, message-Handler). Wird beim An- und Abmelden aufgerufen,
// damit personalisierte/authentifizierte Seiten nach einem Sitzungswechsel
// nicht offline aus dem Cache eines anderen Kontos wiederkehren. Fire-and-
// forget und rein clientseitig — ohne Service Worker (nicht unterstützt / noch
// nicht aktiv) ein stiller No-op, der den normalen Logout/Login nicht behindert.
export function clearServiceWorkerPageCache(): void {
  if (typeof navigator === "undefined") return;
  navigator.serviceWorker?.controller?.postMessage(
    "neo-archive:clear-page-cache",
  );
}
