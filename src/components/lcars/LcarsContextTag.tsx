export default function LcarsContextTag({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
      <span
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.2em",
          color: "var(--lcars-text-dim)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Antonio', sans-serif",
          fontSize: "14px",
          letterSpacing: "0.1em",
          color: "var(--lcars-text-light)",
          textTransform: "uppercase",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function ContextSep() {
  return (
    <div
      style={{
        width: "1px",
        height: "28px",
        background: "var(--lcars-text-dim)",
        opacity: 0.3,
      }}
    />
  );
}
