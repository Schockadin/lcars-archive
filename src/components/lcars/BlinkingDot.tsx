type BlinkingDotProps = {
  color?: string; // CSS-Variable oder Farbwert, default amber
  size?: number; // Durchmesser in px
};

export default function BlinkingDot({
  color = "var(--lcars-amber)",
  size = 8,
}: BlinkingDotProps) {
  return (
    <span
      className="inline-block shrink-0 animate-lcars-pulse rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}`,
      }}
      aria-hidden="true"
    />
  );
}
