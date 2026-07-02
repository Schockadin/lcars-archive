import Link from "next/link";
import type { RecentActivityEvent } from "@/types/timeline";
import { SOURCE_TYPE_LABELS, categoryVisual, fmtDate } from "@/lib/timelineFormat";

// "Neu seit deinem letzten Besuch" — gleicher Kartenstil wie EventCard in
// TimelineView.tsx, nur ohne die Jahres-Rail (hier immer chronologisch
// kompakt, kein Sortier-/Filter-Bedarf).
export default function RecentActivity({
  events,
  firstVisit,
}: {
  events: RecentActivityEvent[];
  firstVisit: boolean;
}) {
  return (
    <section className="flex flex-col gap-[8px]">
      <p className="lcars-eyebrow">Neu seit deinem letzten Besuch</p>

      {firstVisit ? (
        <p className="char-file-bio-empty">
          Das ist dein erster Besuch — willkommen an Bord.
        </p>
      ) : events.length === 0 ? (
        <p className="char-file-bio-empty">
          Nichts Neues seit deinem letzten Besuch.
        </p>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {events.map((e) => {
            const cfg = categoryVisual(e.category);
            return (
              <Link
                key={e.id}
                href={e.href}
                className="mission-akte"
                aria-label={`${e.title} — ${cfg.label}`}
                style={{ "--mission-color": cfg.color } as React.CSSProperties}
              >
                <span className="mission-akte-rail" />
                <span className="mission-akte-body text-left">
                  <span className="mission-akte-title block">{e.title}</span>
                  <span className="mission-akte-meta">
                    <span>
                      <b>Datum</b> {fmtDate(e.event_date)}
                    </span>
                    <span>
                      <b>Quelle</b> {SOURCE_TYPE_LABELS[e.source_type]}
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
