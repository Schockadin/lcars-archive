import { LcarsAkteCard, LcarsCollapsiblePanel } from "@/components/lcars";
import type { DialogueSummary } from "@/lib/dialogues";
import {
  dialogueHref,
} from "@/lib/contentRoutes";

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
    <LcarsCollapsiblePanel
      title="Offene Gespräche"
      badge={items.length}
      storageId="dashboard:gespraeche"
    >
      <div className="flex flex-col gap-[6px]">
        {items.map((d) => (
          <LcarsAkteCard
            key={d.slug}
            href={dialogueHref(d.slug)}
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
    </LcarsCollapsiblePanel>
  );
}
