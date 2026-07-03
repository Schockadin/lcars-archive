"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

const STORAGE_KEY = "neo-cookie-notice-dismissed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

// SSR kennt kein localStorage — Server rendert deshalb immer "dismissed"
// (kein Banner im initialen HTML), useSyncExternalStore synchronisiert
// direkt nach der Hydration ohne Mismatch-Warnung auf den echten Wert.
function getServerSnapshot() {
  return true;
}

// Reiner Informations-Hinweis, keine Consent-Abfrage: die Website setzt nur
// das technisch notwendige neo_session-Cookie (siehe /datenschutz, Abschnitt
// 4) — dafür ist nach § 25 Abs. 2 Nr. 2 TTDSG keine Einwilligung nötig, es
// gibt also nichts zum Ablehnen/Annehmen. Dismiss-Status wird nur lokal im
// Browser gemerkt (localStorage), nicht serverseitig.
export default function CookieNotice() {
  const dismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (dismissed) return null;

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    // Ein "storage"-Event feuert nur in *anderen* Tabs — im eigenen Tab
    // muss der Store manuell zum Neulesen angestoßen werden.
    window.dispatchEvent(new Event("storage"));
  }

  return (
    <div className="lcars-cookie-notice" role="status">
      <p>
        Diese Website verwendet ein technisch notwendiges Cookie (
        <code>neo_session</code>), um den Login-Bereich bereitzustellen —
        keine Tracking- oder Analyse-Cookies. Details in der{" "}
        <Link href="/datenschutz" className="text-lcars-amber underline">
          Datenschutzerklärung
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="lcars-switch"
      >
        Verstanden
      </button>
    </div>
  );
}
