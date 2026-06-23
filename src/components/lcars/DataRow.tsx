import Link from "next/link";

interface DataRowProps {
  value: number | string;
  label: string;
  color?: string;
  accentColor?: string;
  labelColor?: string;
  href?: string;
}

export default function DataRow({
  value,
  label,
  color = "var(--lcars-purple)",
  accentColor = "var(--lcars-amber)",
  labelColor = "var(--lcars-text-contrast)",
  href = "/",
}: DataRowProps) {
  return (
    <div
      className="lcars-data-row"
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
        style={{
          backgroundColor: accentColor,
          width: "16px",
          height: "100%",
        }}
      />

      {/* Label-Pill */}
      <Link
        href={href}
        className=" lcars-data-row-text"
        style={{
          backgroundColor: color,
        }}
      >
        <div className="w-full h-full">{label}</div>
      </Link>
    </div>
  );
}
