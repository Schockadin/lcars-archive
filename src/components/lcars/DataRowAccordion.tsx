"use client";
import { useState } from "react";
import { DataRowPill, type DataRowPillProps } from "./DataRowPill";

export interface DataRowAccordionProps
  extends Omit<DataRowPillProps, "expanded" | "href"> {
  // Startzustand des Akkordeons.
  defaultOpen?: boolean;
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
  children,
}: DataRowAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`lcars-accordion ${className}`}>
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
