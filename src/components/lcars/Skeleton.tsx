// Schlichte Platzhalter-Fläche mit LCARS-Shimmer (siehe .lcars-skel in
// lcars-components.css). Dient als Baustein für die loading.tsx-Skeletons.
export default function Skeleton({
  className = "",
  accent = false,
  style,
}: {
  className?: string;
  /** Akzentfarbe statt grauer Fläche – für Stubs/Schienen. */
  accent?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      className={`lcars-skel${accent ? " lcars-skel-accent" : ""} ${className}`}
      style={style}
    />
  );
}
