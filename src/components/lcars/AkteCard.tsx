import Link from "next/link";

// Gemeinsame Kartenhülle im "Akte"-Stil (farbige Schiene + Titel/Zusammen-
// fassung/Meta-Zeile), verwendet für Missions-, Timeline-, Such- und
// Archiv-Einträge. Der Inhalt der Meta-Zeile bleibt Sache des Aufrufers,
// da sich die Attribute je Domäne stark unterscheiden.
export default function AkteCard({
  href,
  color,
  ariaLabel,
  title,
  summary,
  meta,
  hardNavigate = false,
}: {
  href: string;
  color: string;
  ariaLabel?: string;
  title: React.ReactNode;
  summary?: React.ReactNode;
  meta?: React.ReactNode;
  // Echte Browser-Navigation statt Next-Link-Client-Transition — nötig für
  // Ziele mit #:~:text=-Fragment (Suchtreffer mit Sprungmarke zur
  // Fundstelle): Browser werten diese Text-Fragment-Direktive nur bei
  // echter Navigation aus, nicht bei einer pushState-basierten Client-Route.
  hardNavigate?: boolean;
}) {
  const Tag = hardNavigate ? "a" : Link;
  return (
    <Tag
      href={href}
      className="mission-akte"
      aria-label={ariaLabel}
      style={{ "--mission-color": color } as React.CSSProperties}
    >
      <span className="mission-akte-rail" />
      <span className="mission-akte-body text-left">
        <span className="mission-akte-title block">{title}</span>
        {summary && (
          <span className="mission-akte-summary block">{summary}</span>
        )}
        {meta && <span className="mission-akte-meta">{meta}</span>}
      </span>
    </Tag>
  );
}
