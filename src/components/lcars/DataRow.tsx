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
}

export default function DataRow({
  value,
  label,
  color = "var(--lcars-purple)",
  accentColor = "var(--lcars-amber)",
  labelColor = "var(--lcars-text-contrast)",
  href,
  className = "",
}: DataRowProps) {
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
          <div className="w-full h-full">{label}</div>
        </Link>
      ) : (
        <div
          className="lcars-data-row-text"
          style={{
            backgroundColor: color,
          }}
        >
          <div className="w-full h-full">{label}</div>
        </div>
      )}
    </div>
  );
}
