"use client";
import { useEffect, useState } from "react";

// Zieh-Distanz, ab der Loslassen ein Reload auslöst, bzw. visuelle Deckelung
// des Zieh-Indikators (px). Bewusst deutlich über einem beiläufigen
// Scroll-Ruck (vorher 70px, fühlte sich zu leicht auslösbar an) — Reload
// soll nur bei einem entschiedenen, langen Ziehen passieren, erkennbar
// daran, dass der Pfeil vollständig auf Amber umgefärbt ist (siehe
// RingArrow: colorProgress erreicht 1 exakt bei TRIGGER_DISTANCE, an
// dieselbe Distanz gekoppelt wie readyToRefresh unten).
const TRIGGER_DISTANCE = 110;
const MAX_PULL = 140;

// Blass (--lcars-text-dim) -> Amber (--lcars-amber), siehe tokens.css.
// Feste RGB-Werte statt CSS-Variablen, weil die Zwischenfarbe während des
// Ziehens per JS interpoliert wird (keine reine CSS-Transition zwischen zwei
// benannten Farben, da der Fortschritt kontinuierlich aus dem Touch-Move
// kommt, nicht aus einem diskreten Zustandswechsel).
const DIM_RGB: [number, number, number] = [163, 156, 201];
const AMBER_RGB: [number, number, number] = [255, 154, 0];

function lerpColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(DIM_RGB[0] + (AMBER_RGB[0] - DIM_RGB[0]) * clamped);
  const g = Math.round(DIM_RGB[1] + (AMBER_RGB[1] - DIM_RGB[1]) * clamped);
  const b = Math.round(DIM_RGB[2] + (AMBER_RGB[2] - DIM_RGB[2]) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

// Ringförmiger Pfeil (offener Kreisbogen + Pfeilspitze) statt Text — dreht
// sich proportional zur Zieh-Distanz und färbt sich dabei von blass nach
// Amber ein (voll eingefärbt sobald TRIGGER_DISTANCE erreicht ist).
function RingArrow({ pull }: { pull: number }) {
  const colorProgress = Math.min(pull / TRIGGER_DISTANCE, 1);
  const rotation = (pull / MAX_PULL) * 360;
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      style={{ transform: `rotate(${rotation}deg)`, color: lerpColor(colorProgress) }}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="34 22"
      />
      <path d="M12 1 L16.5 4 L12 7 Z" fill="currentColor" />
    </svg>
  );
}

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
        return;
      }
      const delta = e.touches[0].clientY - startY;
      if (delta <= 0) {
        readyToRefresh = false;
        setPull(0);
        return;
      }
      readyToRefresh = delta >= TRIGGER_DISTANCE;
      setPull(Math.min(delta, MAX_PULL));
    }

    function onTouchEnd() {
      if (readyToRefresh) {
        window.location.reload();
      }
      startY = null;
      readyToRefresh = false;
      setPull(0);
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
    <div className="pull-to-refresh" style={{ height: pull }} aria-hidden={pull === 0}>
      <RingArrow pull={pull} />
    </div>
  );
}
