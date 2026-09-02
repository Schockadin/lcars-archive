import { LcarsAkteCard, LcarsDataRow } from "@/components/lcars";
import type { DialogueSummary } from "@/lib/dialogues";

// Eigene Akkordeon-Sektion für offene Gespräche — standardmäßig
// aufgeklappt (defaultOpen), da laufende Gespräche im Gegensatz zu den
// übrigen Dashboard-Akkordeons unmittelbar relevant sind. Getrennt von der
// News-Sektion (NewsSection.tsx), die nur noch erstellte/bearbeitete/
// gelöschte Inhalte zeigt.
export default function OpenDialoguesSection({
  items,
}: {
  items: DialogueSummary[];
}) {
  if (items.length === 0) return null;

  return (
    <LcarsDataRow
      value={items.length}
      label="Offene Gespräche"
      color="var(--lcars-senary)"
      defaultOpen
    >
      <div className="flex flex-col gap-[6px]">
        {items.map((d) => (
          <LcarsAkteCard
            key={d.slug}
            href={`/dialogues/${d.slug}`}
            color="var(--lcars-senary)"
            title={d.title}
            meta={
              <span>
                <b>Gesprächspartner</b> {d.partnerName}
              </span>
            }
          />
        ))}
      </div>
    </LcarsDataRow>
  );
}
