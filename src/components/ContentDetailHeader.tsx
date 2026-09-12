import Link from "next/link";

// Gemeinsamer Kopf aller Content-Detailseiten: Titel plus beschriftete
// Metazeilen. Entstanden aus DialogueHeader.tsx — Missions-Synopsis und
// Log-Detailseite trugen bis dahin einen eigenen Kopf (.mission-detail-header
// / .mission-detail-title) mit derselben Aussage, aber anderer Optik.
//
// Die Zeilen sind bewusst frei befüllbar (ReactNode statt fester Felder): mal
// steht dort ein einzelner Chip (Ort), mal ein ganzes Chip-Gitter
// (Teilnehmer), mal reiner Text (Datum/Zeitraum).

export type DetailMetaRow = {
  label: string;
  children: React.ReactNode;
};

// Zeilen dürfen als `bedingung && {…}` übergeben werden — das hält die
// Aufrufstellen frei von verschachtelten Fragmenten. `""` gehört mit in die
// Union, weil `nullableString && {…}` genau diesen Typ liefert (log_date,
// author_name sind `string | null`).
type MaybeRow = DetailMetaRow | false | "" | null | undefined;

// Ein einzelner Verweis-Chip. Ohne `href` ein statischer Chip (nicht
// aufgelöster Teilnehmer, Status, unbekannter Autor).
export function ContentChip({
  href,
  color,
  title,
  label,
}: {
  href?: string | null;
  color: string;
  title: string;
  label?: string | null;
}) {
  const style = { "--chip-color": color } as React.CSSProperties;
  const inner = (
    <>
      <span className="archive-chip-title">{title}</span>
      {label && <span className="archive-chip-label">{label}</span>}
    </>
  );

  return href ? (
    <Link href={href} className="archive-chip" style={style}>
      {inner}
    </Link>
  ) : (
    <span className="archive-chip archive-chip-static" style={style}>
      {inner}
    </span>
  );
}

// Mehrere Chips nebeneinander (umbrechend).
export function ContentChipList({ children }: { children: React.ReactNode }) {
  return <div className="archive-related-grid">{children}</div>;
}

export default function ContentDetailHeader({
  title,
  rows = [],
}: {
  title: string;
  rows?: MaybeRow[];
}) {
  const visible = rows.filter((row): row is DetailMetaRow => Boolean(row));

  return (
    <header className="archive-entry-head">
      <h1 className="char-file-name text-left">{title}</h1>

      {visible.length > 0 && (
        <div className="archive-dialogue-meta">
          {visible.map((row) => (
            <div key={row.label} className="archive-dialogue-row">
              <span className="archive-dialogue-label">{row.label}</span>
              {row.children}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

// Reiner Textwert einer Metazeile (Datum, Zeitraum).
export function ContentMetaValue({ children }: { children: React.ReactNode }) {
  return <span className="archive-dialogue-value">{children}</span>;
}
