import type { ArchiveEntryPreview } from "@/types/archive";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import ArchiveEntryCard from "./ArchiveEntryCard";

// Der Kartenanteil der alphabetischen Übersicht: Die Schiene läuft wie in
// der Chronologie neben jeder Karte durch, die Buchstaben stehen als Perioden
// darüber in ArchiveEntryList.
export default function ArchiveEntryRow({
  entry,
}: {
  entry: ArchiveEntryPreview;
}) {
  const color = CATEGORY_CONFIG[entry.category].color;

  return (
    <article
      className="archive-entry-row"
      style={{ "--archive-rail-color": color } as React.CSSProperties}
    >
      <div className="archive-entry-rail" aria-hidden="true">
        <span className="archive-entry-dot" />
      </div>
      <ArchiveEntryCard entry={entry} />
    </article>
  );
}