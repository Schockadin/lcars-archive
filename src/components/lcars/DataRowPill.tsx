import Link from "next/link";

export interface DataRowPillProps {
  value?: number | string;
  label?: string;
  color?: string;
  accentColor?: string;
  labelColor?: string;
  href?: string | null;
  className?: string;
  // Undefined = kein Chevron (normale DataRow). Gesetzt (true/false) =
  // Auf-/Zuklapp-Chevron am rechten Rand der Pille, Rotation je nach Wert.
  expanded?: boolean;
}

// Reine Präsentationskomponente ohne eigenen State (kein "use client" nötig)
// — sowohl von der statischen DataRow-Zeile als auch von DataRowAccordion
// (dort als Klick-Trigger) genutzt.
export function DataRowPill({
  value,
  label,
  color,
  accentColor,
  labelColor,
  href,
  className,
  expanded,
}: DataRowPillProps) {
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
