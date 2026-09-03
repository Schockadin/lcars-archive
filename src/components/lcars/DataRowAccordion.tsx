"use client";
import { useEffect, useRef, useState } from "react";
import { DataRowPill, type DataRowPillProps } from "./DataRowPill";

export interface DataRowAccordionProps extends Omit<
  DataRowPillProps,
  "expanded" | "href"
> {
  // Startzustand des Akkordeons.
  defaultOpen?: boolean;
  // Anker-id auf dem Wrapper: /pfad#<id> springt hierher und klappt den
  // Abschnitt beim Laden auf (Deep-Links aus dem Changelog, siehe
  // src/lib/tutorialSections.ts).
  htmlId?: string;
  children: React.ReactNode;
}

// Nur die Akkordeon-Variante von DataRow braucht Client-State (auf/zu) —
// ausgelagert, damit die weitaus häufigere, rein statische DataRow (siehe
// DataRow.tsx) keine Client Component sein muss und ohne Hydration-Kosten
// als Server Component gerendert werden kann.
export function DataRowAccordion({
  value,
  label,
  color,
  accentColor,
  labelColor,
  className,
  defaultOpen = false,
  htmlId,
  children,
}: DataRowAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Beim Laden mit passendem URL-Hash (/tutorial#<htmlId>) den Abschnitt
  // aufklappen und sanft heranscrollen — sonst würde ein Deep-Link nur auf
  // die eingeklappte Kopfzeile springen. Läuft einmalig; spätere Klicks
  // togglen wie gewohnt. Bewusst NACH dem Mount statt als abgeleiteter
  // Startzustand: window.location.hash steht beim SSR nicht zur Verfügung, ein
  // im Render abgeleiteter Wert würde beim Hydrieren abweichen (Mismatch).
  // Deshalb ist das setState im Effect hier korrekt, nicht der von der Regel
  // gemeinte „abgeleitete State"; ebenso ist das Lesen von htmlId/Hash hier
  // eine echte Mount-Reaktion auf den initialen URL-Hash, kein „Event-Handler
  // im Effect". Beide Regeln daher für diesen Effect bewusst deaktiviert.
  /* eslint-disable react-hooks/set-state-in-effect, react-you-might-not-need-an-effect/no-derived-state, react-you-might-not-need-an-effect/no-event-handler */
  useEffect(() => {
    if (!htmlId) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== `#${htmlId}`) return;
    setOpen(true);
    // Nach dem Aufklappen zum Abschnitt scrollen (der Layout-Sprung durch das
    // geöffnete Panel ist dann schon berücksichtigt).
    requestAnimationFrame(() => {
      wrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [htmlId]);
  /* eslint-enable react-hooks/set-state-in-effect, react-you-might-not-need-an-effect/no-derived-state, react-you-might-not-need-an-effect/no-event-handler */

  return (
    <div id={htmlId} ref={wrapperRef} className={`lcars-accordion ${className}`}>
      <button
        type="button"
        className="lcars-accordion-trigger"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <DataRowPill
          value={value}
          label={label}
          color={color}
          accentColor={accentColor}
          labelColor={labelColor}
          expanded={open}
          className="lcars-data-row--full"
        />
      </button>

      <div className="lcars-accordion-panel" data-open={open}>
        <div className="lcars-accordion-panel-inner">{children}</div>
      </div>
    </div>
  );
}
