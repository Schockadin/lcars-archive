"use client";
import { useState } from "react";
import DataRow from "./DataRow";

interface AccordionProps {
  value?: number | string;
  label?: string;
  color?: string;
  accentColor?: string;
  labelColor?: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

// Auf-/zuklappbare Gruppe mit LcarsDataRow als Kopfzeile (Klick öffnet/
// schließt den Inhalt darunter). Standardmäßig eingeklappt, siehe
// UserContentBrowser.tsx ("Meine Inhalte").
export default function Accordion({
  value,
  label,
  color,
  accentColor,
  labelColor,
  defaultOpen = false,
  className = "",
  children,
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`lcars-accordion ${className}`}>
      <button
        type="button"
        className="lcars-accordion-trigger"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <DataRow
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
