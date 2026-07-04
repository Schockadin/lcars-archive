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
  // siehe Accordion.tsx. Lebt in der Pill selbst statt daneben, damit
  // Akkordeon-Trigger und normale DataRows exakt gleich breit bleiben.
  expanded?: boolean;
}

export default function DataRow({
  value,
  label,
  color = "var(--lcars-purple)",
  accentColor = "var(--lcars-amber)",
  labelColor = "var(--lcars-text-contrast)",
  href,
  className = "",
  expanded,
}: DataRowProps) {
  const content = (
    <>
      <div className="flex-1 h-full">{label}</div>
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
