"use client";

import { useEffect, useState } from "react";

// Nicht Teil der Standard-DOM-Typen (nur Chromium-Browser feuern es).
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari kennt kein display-mode: standalone, hat aber dieses
    // proprietäre Flag auf window.navigator.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

// Install-Button fürs eigene Dashboard (/users/[id], nur isSelf). Chrome/
// Edge/Android feuern beforeinstallprompt, das wir bis zum Klick
// zurückhalten (preventDefault). iOS Safari feuert das Event nie — dort
// stattdessen ein statischer Hinweistext, da es dort keine
// programmatische Installation gibt.
//
// Initialstatus ist bewusst überall "nichts anzeigen" (installed=false,
// showIosHint=false) — window existiert beim Server-Rendering nicht
// (anders als navigator, das Node seit v21 global bereitstellt), ein
// direkter Zugriff hier würde die Seite serverseitig crashen. Die
// eigentliche Erkennung läuft ausschließlich im Effect, in eine innere
// Funktion gekapselt, damit kein setState synchron beim Effect-Durchlauf
// selbst passiert.
export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    function detect() {
      if (isStandalone()) {
        setInstalled(true);
        return;
      }
      if (isIos()) {
        setShowIosHint(true);
      }
    }
    detect();

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (installed) return null;

  if (showIosHint) {
    return (
      <p className="text-lcars-text-dim">
        Als App installieren: Teilen-Symbol antippen, dann „Zum
        Home-Bildschirm“.
      </p>
    );
  }

  if (!deferredPrompt) return null;

  return (
    <button
      type="button"
      className="lcars-switch"
      onClick={async () => {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setInstalled(true);
        }
        setDeferredPrompt(null);
      }}
    >
      App installieren
    </button>
  );
}
