import { ArchiveEntryPreview } from "@/types/archive";
import { CATEGORY_CONFIG, archiveTitle } from "@/lib/archiveFormat";
import { fmtDate } from "@/lib/missionFormat";
import { LcarsAkteCard } from "@/components/lcars";

// Eintrags-Karte im Stil der Missions-Akten. Dialoge zeigen Teilnehmer, Ort
// und Datum; andere Kategorien ihre Attribute und Tags.
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

  return (
    <LcarsAkteCard
      // Gespräche haben ihr Zuhause im Charaktere-Bereich; die Zielseite
      // reicht ein noch offenes Gespräch selbst an /dialogues weiter.
      href={
        isDialogue
          ? `/characters/dialogues/${entry.slug}`
          : `/archive/${entry.slug}`
      }
      color={cfg.color}
      title={archiveTitle(entry)}
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
