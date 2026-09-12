import Link from "next/link";
import {
  DEFAULT_CROP,
  previewStyle,
  type PortraitCrop,
} from "@/lib/portraitCrop";

// Die gemeinsame Karte der beiden Zeit-/Bestandslisten: Chronologie
// (/chronologie) und Datenbank (/archive). Beide zeigten dasselbe — ein
// Etikett der Art, den verlinkten Titel, eine Mono-Zeile darunter und was
// Platz braucht in aufklappbaren Feldern —, nur baute die Datenbank es aus
// der Aktenkarte (.mission-akte) nach und musste sie in archive.css wieder
// zur Ereigniskarte umlackieren. Jetzt gibt es die Karte einmal.
//
// Die Optik steckt in timeline.css (.timeline-card und Nachbarn). Bewusst
// ohne "use client": reines Markup, das die aufrufende Client-Komponente
// mitzieht.
//
// KEIN Link als Hülle: die Karte enthält aufklappbare Felder, und ein Knopf
// in einem Link ist weder gültiges HTML noch mit der Tastatur bedienbar.
// Verlinkt ist der Titel, der per ::after die ganze Karte anklickbar macht.
export default function ChronoCard({
  color,
  thumbnailSrc,
  thumbnailCrop,
  tag,
  title,
  href,
  ariaLabel,
  badge,
  summary,
  date,
  meta,
  children,
}: {
  // Farbe der Fläche; kommt aus der Ereignisart bzw. der Kategorie.
  color: string;
  // Kleines Vorschaubild links in der Karte — das erste hochgeladene Bild des
  // Eintrags (bei Charakteren das Portrait). Fehlt es, bleibt die Karte wie
  // bisher: KEIN Platzhalter, kein leerer Kasten.
  thumbnailSrc?: string | null;
  // Der am Portrait gewählte Ausschnitt (siehe src/lib/portraitCrop.ts) — so
  // zeigt die Karte dieselbe Bildstelle wie der Charakterbogen. Ohne Angabe
  // gilt die Bildmitte.
  thumbnailCrop?: PortraitCrop | null;
  // Das Art-Etikett links vor dem Titel (.timeline-tag).
  tag?: React.ReactNode;
  title: React.ReactNode;
  // Ohne Ziel bleibt der Titel reiner Text — von Hand eingetragene
  // Ereignisse haben keinen Inhalt, auf den zu zeigen wäre.
  href?: string;
  ariaLabel?: string;
  // Zusatzmarke rechts neben dem Titel (Herkunftshinweis der Chronologie).
  badge?: React.ReactNode;
  summary?: React.ReactNode;
  // Die Mono-Zeile unter dem Titel: ein Datum bzw. ein Zeitraum.
  date?: React.ReactNode;
  // Mehrteilige Mono-Zeile (Attribute, Tags, Teilnehmer) — umbricht,
  // während `date` eine einzelne Angabe bleibt.
  meta?: React.ReactNode;
  // Die aufklappbaren Felder (ChronoPanel).
  children?: React.ReactNode;
}) {
  return (
    <div
      className="timeline-card"
      style={{ "--timeline-color": color } as React.CSSProperties}
    >
      {thumbnailSrc && (
        /* Der Kasten schneidet ab, das Bild darin trägt den gewählten
           Ausschnitt. Rein schmückend: Titel und Angaben stehen daneben,
           deshalb leeres alt und kein eigener Link (die ganze Karte ist
           ohnehin anklickbar). <img> statt next/image wie überall bei
           /api/content-images/… — die Größen sind unbekannt und die Route
           liefert die Bytes direkt. */
        <span className="timeline-card-thumb-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="timeline-card-thumb"
            style={previewStyle(thumbnailCrop ?? DEFAULT_CROP)}
            src={thumbnailSrc}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </span>
      )}
      <div className="timeline-card-body">
        <div className="timeline-card-head">
          {tag && <span className="timeline-tag">{tag}</span>}
          {href ? (
            <Link
              href={href}
              className="timeline-card-title"
              aria-label={ariaLabel}
            >
              {title}
            </Link>
          ) : (
            <span className="timeline-card-title">{title}</span>
          )}
          {badge}
        </div>

        {summary && <p className="timeline-card-summary">{summary}</p>}
        {date && <p className="timeline-card-date">{date}</p>}
        {meta && <p className="timeline-card-meta">{meta}</p>}
        {children}
      </div>
    </div>
  );
}

// Ein aufklappbares Feld der Karte. <details> statt eigenem Zustand: der
// Auf-/Zu-Zustand gehört zur einzelnen Karte, nicht in die Liste — und beim
// Filtern soll er nicht mitwandern.
export function ChronoPanel({
  label,
  open = false,
  className: panelClassName,
  bodyClassName,
  bodyHtml,
  children,
}: {
  label: React.ReactNode;
  open?: boolean;
  // Zusatzklasse am <details> — für Stellen außerhalb einer Karte, die den
  // Auf-/Zuklapper deutlicher zeigen müssen (siehe .mission-synopsis-panel).
  className?: string;
  bodyClassName?: string;
  // Vorgerendertes Markdown (siehe getTimeline) — sonst children.
  bodyHtml?: string;
  children?: React.ReactNode;
}) {
  const className = bodyClassName
    ? `timeline-panel-body ${bodyClassName}`
    : "timeline-panel-body";

  return (
    <details
      className={
        panelClassName ? `timeline-panel ${panelClassName}` : "timeline-panel"
      }
      open={open}
    >
      <summary className="timeline-panel-head">{label}</summary>
      {bodyHtml ? (
        <div
          className={className}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : (
        <div className={className}>{children}</div>
      )}
    </details>
  );
}
