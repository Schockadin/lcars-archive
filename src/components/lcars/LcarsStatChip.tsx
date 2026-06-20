export default function LcarsStatChip({
  label,
  value,
  color,
  withBorder,
}: {
  label: string;
  value: number | string;
  color: string;
  withBorder: boolean;
}) {
  const border = withBorder ? `3px solid ${color}` : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "2px",
        padding: "4px 12px",
        background: "transparent",
        borderLeft: `${border}`,
      }}
    >
      <span
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "11px",
          letterSpacing: "0.2em",
          color: "var(--lcars-orange)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Antonio', sans-serif",
          fontSize: "26px",
          fontWeight: 700,
          color,
          letterSpacing: "0.05em",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}
