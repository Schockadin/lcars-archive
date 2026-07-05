"use client";
import { useState } from "react";
import Link from "next/link";

interface DataRowProps {
  value?: number | string;
  label?: string;
  color?: string;
  accentColor?: string;
  labelColor?: string;
  href?: string | null;
  width?: string;
  className?: string;
  // Undefined = kein Chevron (normale DataRow). Gesetzt (true/false) =
  // Auf-/Zuklapp-Chevron am rechten Rand der Pill, Rotation je nach Wert —
  // siehe Akkordeon-Zweig unten. Lebt in der Pill selbst statt daneben, damit
  // Akkordeon-Trigger und normale DataRows exakt gleich breit bleiben.
  expanded?: boolean;
  // Nur relevant mit children (Akkordeon-Modus) — Startzustand, siehe unten.
  defaultOpen?: boolean;
  // Undefined = normale (ggf. verlinkte) DataRow. Gesetzt = Akkordeon: die
  // Zeile wird zum Auf-/Zuklapp-Trigger, children erscheinen darunter.
  children?: React.ReactNode;
}

function DataRowPill({
  value,
  label,
  color,
  accentColor,
  labelColor,
  href,
  className,
  expanded,
}: Omit<DataRowProps, "defaultOpen" | "children">) {
  const content = (
    <>
      <div className="lcars-data-row-label-text flex-1 h-full">{label}</div>
      {expanded !== undefined && (
        <span
          className={`lcars-data-row-chevron${expanded ? " lcars-data-row-chevron--open" : ""}`}
          aria-hidden="true"
        />
      )}
    </>
  );

  return (
    <div
      className={`lcars-data-row ${className}`}
      style={{
        containerType: "size",
      }}
    >
      {/* Label */}
      <div
        className="lcars-data-row-label"
        style={{
          color: labelColor,
        }}
      >
        {value}
      </div>

      {/* Separator */}
      <div
        className="lcars-data-row-separator"
        style={{
          backgroundColor: accentColor,
        }}
      />

      {/* Label-Pill */}
      {href != null ? (
        <Link
          href={href}
          className=" lcars-data-row-text"
          style={{
            backgroundColor: color,
          }}
        >
          {content}
        </Link>
      ) : (
        <div
          className="lcars-data-row-text"
          style={{
            backgroundColor: color,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// Zweigleisig statt zwei getrennter Komponenten (früher DataRow + Accordion
// mit dupliziertem Zeilen-Markup): ohne children eine gewöhnliche (ggf.
// verlinkte) Zeile, mit children ein Akkordeon — Kopfzeile klappt den
// übergebenen Inhalt auf/zu, standardmäßig eingeklappt (siehe defaultOpen,
// z.B. "Meine Inhalte" in UserContentBrowser.tsx).
export default function DataRow({
  value,
  label,
  color = "var(--lcars-purple)",
  accentColor = "var(--lcars-amber)",
  labelColor = "var(--lcars-text-contrast)",
  href,
  className = "",
  expanded,
  defaultOpen = false,
  children,
}: DataRowProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (children === undefined) {
    return (
      <DataRowPill
        value={value}
        label={label}
        color={color}
        accentColor={accentColor}
        labelColor={labelColor}
        href={href}
        className={className}
        expanded={expanded}
      />
    );
  }

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
