import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import type { RecentActivityEvent } from "@/types/timeline";
import {
  SOURCE_TYPE_LABELS,
  categoryVisual,
  fmtDate,
} from "@/lib/timelineFormat";

// "Neue Inhalte" seit dem letzten Besuch — gleicher Kartenstil wie EventCard
// in TimelineView.tsx, nur ohne die Jahres-Rail (hier immer chronologisch
// kompakt, kein Sortier-/Filter-Bedarf).
export default function RecentActivity({
  events,
  firstVisit,
}: {
  events: RecentActivityEvent[];
  firstVisit: boolean;
}) {
  return (
    <LcarsDataRow
      value={firstVisit ? 0 : events.length}
      label="Neue Inhalte"
      color="var(--lcars-purple)"
      defaultOpen
    >
      {firstVisit ? (
        <p className="lcars-empty-state">
          Das ist dein erster Besuch — willkommen an Bord.
        </p>
      ) : events.length === 0 ? (
        <p className="lcars-empty-state">
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
    </LcarsDataRow>
  );
}
