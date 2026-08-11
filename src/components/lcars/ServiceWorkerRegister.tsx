"use client";

import { useEffect } from "react";

// Registriert den Service Worker (Web Push, Laufzeit-Asset-Caching und
// Offline-Betrieb, siehe public/sw.js) site-weit im Root-Layout, unabhängig
// davon, welche Seite zuerst geladen wird — Push-Zustellung/-Klicks und der
// Offline-Fallback müssen unabhängig vom Einstiegspunkt funktionieren.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registrierung fehlgeschlagen (z.B. nicht unterstützter Browser) —
        // kein hartes Fehlverhalten nötig, Push ist ein optionaler Kanal.
      });
    }
  }, []);

  return null;
}
