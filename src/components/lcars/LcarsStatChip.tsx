export default function LcarsStatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "2px",
        padding: "4px 12px",
        // background: "var(--lcars-surface)",
        background: "transparent",
        borderLeft: `3px solid ${color}`,
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
