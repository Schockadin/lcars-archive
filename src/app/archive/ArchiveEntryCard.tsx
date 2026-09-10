import { ArchiveEntryPreview } from "@/types/archive";
import { CATEGORY_CONFIG, archiveTitle } from "@/lib/archiveFormat";
import ChronoCard from "@/components/timeline/ChronoCard";
import { archiveHref } from "@/lib/contentRoutes";

// Eintrags-Karte der Datenbank — dieselbe Karte wie in der Chronologie
// (ChronoCard): Kategorie-Etikett und Titel oben, darunter die Kurzfassung
// und die Mono-Zeile mit den ersten Attributen und den Tags.
//
// Gespräche kommen hier nicht vor: sie stehen ausschließlich in der
// Chronologie (siehe getAllArchiveEntries in src/lib/archive.ts).
export default function ArchiveEntryCard({
  entry,
}: {
  entry: ArchiveEntryPreview;
}) {
  const cfg = CATEGORY_CONFIG[entry.category];
  const m = entry.metadata;
  const title = archiveTitle(entry);

  return (
    <ChronoCard
      color={cfg.color}
      tag={cfg.label}
      title={title}
      ariaLabel={`${title} — ${cfg.label}`}
      href={archiveHref(entry.slug)}
      summary={m.summary}
      meta={
        <>
          {m.attributes.slice(0, 3).map((a) => (
            <span key={a.label}>
              <b>{a.label}</b> {a.value}
            </span>
          ))}
          {entry.tags.length > 0 && (
            <span>
              <b>Tags</b> {entry.tags.join(", ")}
            </span>
          )}
        </>
      }
    />
  );
}
