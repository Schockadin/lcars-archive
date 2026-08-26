import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
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
          <Link
            key={d.slug}
            href={`/dialogues/${d.slug}`}
            className="mission-akte"
            style={
              { "--mission-color": "var(--lcars-senary)" } as React.CSSProperties
            }
          >
            <span className="mission-akte-rail" />
            <span className="mission-akte-body text-left">
              <span className="mission-akte-title block">{d.title}</span>
              <span className="mission-akte-meta">
                <span>
                  <b>Gesprächspartner</b> {d.partnerName}
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </LcarsDataRow>
  );
}
