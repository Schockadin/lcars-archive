import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import type { DialogueSummary } from "@/lib/dialogues";

// Gleicher Kartenstil wie FollowedContentSection.tsx — hier mit
// Gesprächspartner statt Ziel-Typ als Meta-Zeile.
export default function OpenDialoguesSection({
  items,
}: {
  items: DialogueSummary[];
}) {
  return (
    <LcarsDataRow
      value={items.length}
      label="Offene Gespräche"
      color="var(--lcars-green)"
    >
      {items.length === 0 ? (
        <p className="lcars-empty-state">Keine offenen Gespräche.</p>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {items.map((d) => (
            <Link
              key={d.slug}
              href={`/dialogues/${d.slug}`}
              className="mission-akte"
              style={
                { "--mission-color": "var(--lcars-green)" } as React.CSSProperties
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
      )}
    </LcarsDataRow>
  );
}
