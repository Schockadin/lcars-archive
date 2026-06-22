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
      className="w-[300px] h-[40px] flex gap-[5px]"
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
        className="h-full w-[16px]"
        style={{
          backgroundColor: accentColor,
        }}
      />

      {/* Label-Pill */}
      <Link
        href={href}
        className="flex-grow border-1 h-full rounded-r-[60px] flex items-center"
        style={{
          color: "var(--lcars-bg)",
          backgroundColor: color,
          fontSize: "75cqh",
          textTransform: "uppercase",
          lineHeight: "1",
          textAlign: "left",
          paddingLeft: "8px",
          fontWeight: "600",
          textDecoration: "none",
        }}
      >
        {label}
      </Link>
    </div>
  );
}
