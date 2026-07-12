interface SeparatorProps {
  startColor: string;
  endColor?: string;
  align?: "to left" | "to right";
  width?: string;
}

export default function HorizontalSeparator({
  startColor,
  endColor = "var(--lcars-bg)",
  align = "to right",
  width = "100%",
}: SeparatorProps) {
  return (
    <div
      className="lcars-separator"
      style={{
        width: width,
        background: `linear-gradient(${align}, ${startColor}, 75%, ${endColor})`,
      }}
    />
  );
}
