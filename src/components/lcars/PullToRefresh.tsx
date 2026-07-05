"use client";
import { useEffect, useState } from "react";

// Zieh-Distanz, ab der Loslassen ein Reload auslöst, bzw. visuelle Deckelung
// des Zieh-Indikators (px).
const TRIGGER_DISTANCE = 70;
const MAX_PULL = 100;

// Natives Pull-to-Refresh reagiert auf ein Scrollen des Dokuments selbst —
// hier scrollt aber ausschließlich .lcars-main-content (siehe globals.css:
// html/body haben bewusst overflow:clip, damit die AppShell fix bleibt),
// wodurch Mobil-Browser die Geste nie sehen. Dieser Effekt hört stattdessen
// direkt auf .lcars-main-content und emuliert dieselbe Geste: nach unten
// ziehen bei scrollTop 0, ab TRIGGER_DISTANCE beim Loslassen ein echter
// Reload (kein router.refresh() — soll sich exakt wie das native "Ziehen zum
// Aktualisieren" anfühlen, inklusive frischem Server-Rendering).
export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = document.querySelector<HTMLElement>(".lcars-main-content");
    if (!container) return;

    let startY: number | null = null;
    let readyToRefresh = false;

    function onTouchStart(e: TouchEvent) {
      startY = container!.scrollTop <= 0 ? e.touches[0].clientY : null;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY === null) return;
      // Zwischenzeitlich weggescrollt (z.B. Geste beginnt am oberen Rand,
      // wandert aber über Inhalt, der währenddessen selbst scrollt) — Geste
      // abbrechen statt einen falschen Pull-Stand anzuzeigen.
      if (container!.scrollTop > 0) {
        startY = null;
        readyToRefresh = false;
        setPull(0);
        setReady(false);
        return;
      }
      const delta = e.touches[0].clientY - startY;
      if (delta <= 0) {
        readyToRefresh = false;
        setPull(0);
        setReady(false);
        return;
      }
      readyToRefresh = delta >= TRIGGER_DISTANCE;
      setPull(Math.min(delta, MAX_PULL));
      setReady(readyToRefresh);
    }

    function onTouchEnd() {
      if (readyToRefresh) {
        window.location.reload();
      }
      startY = null;
      readyToRefresh = false;
      setPull(0);
      setReady(false);
    }

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <div
      className={`pull-to-refresh${ready ? " pull-to-refresh--ready" : ""}`}
      style={{ height: pull }}
      aria-hidden={pull === 0}
    >
      <span className="pull-to-refresh-label">
        {ready ? "Loslassen zum Aktualisieren" : "Ziehen zum Aktualisieren"}
      </span>
    </div>
  );
}
