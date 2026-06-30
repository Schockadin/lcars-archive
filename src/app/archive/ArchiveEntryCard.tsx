import Link from "next/link";
import { ArchiveEntryPreview } from "@/types/archive";
import { CATEGORY_CONFIG, archiveTitle } from "@/lib/archiveFormat";
import { fmtDate } from "@/lib/missionFormat";

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
    <Link
      href={`/archive/${entry.slug}`}
      className="mission-akte"
      style={{ "--mission-color": cfg.color } as React.CSSProperties}
    >
      <span className="mission-akte-rail" />
      <span className="mission-akte-body text-left">
        <span className="mission-akte-title block">{archiveTitle(entry)}</span>
        {m.summary && (
          <span className="mission-akte-summary block">{m.summary}</span>
        )}
        <span className="mission-akte-meta">
          {isDialogue ? (
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
          )}
        </span>
      </span>
    </Link>
  );
}
