import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import type { DialogueSummary } from "@/lib/dialogues";

// Eigenständig statt FollowedContentSection zu verbiegen — dessen Meta-Zeile
// zeigt hart "Typ: Mission/Archiv-Eintrag", hier wird stattdessen der
// Gesprächspartner gebraucht. Optisch identisch (.mission-akte-Familie).
export default function DialogueSection({
  dialogues,
  canStartNew,
  userId,
}: {
  dialogues: DialogueSummary[];
  canStartNew: boolean;
  userId: number;
}) {
  return (
    <section className="flex flex-col gap-[8px]">
      <LcarsDataRow
        value={dialogues.length}
        label="Deine Gespräche"
        color="var(--lcars-text-data)"
        className="lcars-data-row--full"
      />

      {dialogues.length === 0 ? (
        <p className="char-file-bio-empty">Keine offenen Gespräche.</p>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {dialogues.map((d) => (
            <Link
              key={d.slug}
              href={`/dialogues/${d.slug}`}
              className="mission-akte"
              style={{ "--mission-color": "var(--lcars-amber)" } as React.CSSProperties}
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

      {canStartNew && (
        <Link href={`/users/${userId}/dialogues/new`} className="lcars-switch self-start">
          Neues Gespräch beginnen
        </Link>
      )}
    </section>
  );
}
