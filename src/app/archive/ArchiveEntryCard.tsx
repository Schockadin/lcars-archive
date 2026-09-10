import { ArchiveEntryPreview } from "@/types/archive";
import { CATEGORY_CONFIG, archiveTitle } from "@/lib/archiveFormat";
import { fmtDate } from "@/lib/missionFormat";
import ChronoCard from "@/components/timeline/ChronoCard";
import { archiveHref } from "@/lib/contentRoutes";

// Eintrags-Karte der Datenbank — dieselbe Karte wie in der Chronologie
// (ChronoCard): Kategorie-Etikett und Titel oben, darunter die Kurzfassung
// und die Mono-Zeile. Dialoge zeigen Teilnehmer, Ort und Datum; andere
// Kategorien ihre Attribute und Tags.
export default function ArchiveEntryCard({
  entry,
}: {
  entry: ArchiveEntryPreview;
}) {
  const cfg = CATEGORY_CONFIG[entry.category];
  const m = entry.metadata;
  const isDialogue = entry.category === "dialogue";
  const participants = m.participants?.map((p) => p.name) ?? [];
  const ort = m.location?.title ?? m.setting ?? null;
  const title = archiveTitle(entry);

  return (
    <ChronoCard
      color={cfg.color}
      tag={cfg.label}
      title={title}
      ariaLabel={`${title} — ${cfg.label}`}
      // Gespräche haben ihr Zuhause im Charaktere-Bereich; die Zielseite
      // reicht ein noch offenes Gespräch selbst an /dialogues weiter.
      href={
        isDialogue
          ? `/characters/dialogues/${entry.slug}`
          : archiveHref(entry.slug)
      }
      summary={m.summary}
      meta={
        isDialogue ? (
          <>
            {participants.length > 0 && (
              <span>
                <b>Teilnehmer</b> {participants.join(", ")}
              </span>
            )}
            {ort && (
              <span>
                <b>Ort</b> {ort}
              </span>
            )}
            {m.logDate && (
              <span>
                <b>Datum</b> {fmtDate(m.logDate)}
              </span>
            )}
          </>
        ) : (
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
        )
      }
    />
  );
}
