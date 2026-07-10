"use client";

import { useEffect, useState } from "react";

// Nicht Teil der Standard-DOM-Typen (nur Chromium-Browser feuern es).
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Wie lange auf beforeinstallprompt gewartet wird, bevor der Browser als
// nicht unterstützt gilt (z.B. Opera, Firefox Desktop — feuert das Event
// nie, auch nicht verzögert). Kein verlässliches Feature-Detect möglich
// (User-Agent-Sniffing wäre hier falsch: Opera z.B. gibt sich als Chrome
// aus, unterstützt das Event aber trotzdem nicht) — daher die pragmatische
// Wartezeit statt einer harten Prüfung.
const UNSUPPORTED_TIMEOUT_MS = 2000;

type Status = "checking" | "installed" | "ios" | "available" | "unsupported";

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

// Install-Button fürs eigene Dashboard/Settings (nur isSelf). Chrome/Edge/
// Android feuern beforeinstallprompt, das wir bis zum Klick zurückhalten
// (preventDefault). iOS Safari feuert das Event nie — dort stattdessen ein
// statischer Hinweistext, da es dort keine programmatische Installation
// gibt. Browser ohne Unterstützung (z.B. Opera, Firefox Desktop) bekommen
// nach kurzer Wartezeit ebenfalls einen Hinweis statt gar nichts.
//
// Initialstatus ist bewusst "checking" (kein window-Zugriff) — window
// existiert beim Server-Rendering nicht (anders als navigator, das Node
// seit v21 global bereitstellt), ein direkter Zugriff hier würde die Seite
// serverseitig crashen. Die eigentliche Erkennung läuft ausschließlich im
// Effect, in eine innere Funktion gekapselt, damit kein setState synchron
// beim Effect-Durchlauf selbst passiert.
export default function InstallPwaPrompt() {
  const [status, setStatus] = useState<Status>("checking");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function detect() {
      if (isStandalone()) {
        setStatus("installed");
        return true;
      }
      if (isIos()) {
        setStatus("ios");
        return true;
      }
      return false;
    }
    if (detect()) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setStatus("available");
    };
    const onAppInstalled = () => {
      setStatus("installed");
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    const timeout = setTimeout(() => {
      setStatus((current) =>
        current === "checking" ? "unsupported" : current,
      );
    }, UNSUPPORTED_TIMEOUT_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      clearTimeout(timeout);
    };
  }, []);

  if (status === "checking" || status === "installed") return null;

  if (status === "ios") {
    return (
      <p className="text-lcars-text-dim">
        Als App installieren: Teilen-Symbol antippen, dann „Zum
        Home-Bildschirm“.
      </p>
    );
  }

  if (status === "unsupported") {
    return (
      <p className="text-lcars-text-dim">
        Dieser Browser unterstützt die Installation als App nicht. Probiere z.B.
        Chrome, Edge oder Samsung Internet.
      </p>
    );
  }

  if (!deferredPrompt) return null;

  return (
    <button
      type="button"
      className="lcars-pill-btn--outline"
      onClick={async () => {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setStatus("installed");
        }
        setDeferredPrompt(null);
      }}
    >
      App installieren
    </button>
  );
}
