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
      className="w-[300px] h-[40px] flex gap-[8px] items-center"
      style={{
        containerType: "size",
      }}
    >
      {/* Label */}
      <div
        className="h-full w-[50px]"
        style={{
          color: labelColor,
          fontSize: "100cqh",
          lineHeight: "0.9",
          textTransform: "uppercase",
          textAlign: "right",
          fontWeight: "800",
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
        className="flex-grow h-full rounded-r-[60px]"
        style={{
          color: "var(--lcars-bg)",
          backgroundColor: color,
          fontSize: "72cqh",
          textTransform: "uppercase",
          textAlign: "left",
          paddingLeft: "8px",
          fontWeight: "600",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div className="w-full h-full">{label}</div>
      </Link>
    </div>
  );
}
