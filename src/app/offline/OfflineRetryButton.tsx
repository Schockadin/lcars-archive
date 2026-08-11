"use client";

// Kleiner Client-Button für die Offline-Ausweichseite: lädt die aktuelle URL
// neu (erneuter Netzversuch). Bewusst window.location.reload() statt
// router-Navigation — bei einem echten Reconnect soll die vollständige Seite
// frisch vom Netz kommen, nicht aus dem clientseitigen Router-Cache.
export default function OfflineRetryButton() {
  return (
    <button
      type="button"
      className="lcars-pill-btn--outline self-start"
      onClick={() => window.location.reload()}
    >
      Erneut versuchen
    </button>
  );
}
