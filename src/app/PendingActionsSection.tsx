import { LcarsAkteCard, LcarsDataRow } from "@/components/lcars";
import type { PendingAction, PendingActionKind } from "@/lib/pendingActions";
import { fmtDate } from "@/lib/missionFormat";

// „Offen für dich" auf dem Dashboard: was diese Person noch zu tun hat.
//
// Aufgeklappt wie die offenen Gespräche — eine Aufgabenliste, die man
// aufklappen muss, erinnert an nichts. Gibt es nichts zu tun, fällt der
// Abschnitt weg (kein leeres „Nichts zu tun", das jeden Tag Platz kostet).
const KIND_COLOR: Record<PendingActionKind, string> = {
  mission_log: "var(--lcars-primary)",
  dialogue_reply: "var(--lcars-senary)",
  draft: "var(--lcars-quinary)",
};

export default function PendingActionsSection({
  items,
}: {
  items: PendingAction[];
}) {
  if (items.length === 0) return null;

  return (
    <LcarsDataRow value={items.length} label="Offen für dich" defaultOpen>
      <div className="flex flex-col gap-[6px]">
        {items.map((a) => (
          <LcarsAkteCard
            key={`${a.kind}:${a.href}`}
            href={a.href}
            color={KIND_COLOR[a.kind]}
            title={a.subject}
            meta={
              <>
                <span>
                  <b>Zu tun</b> {a.label}
                </span>
                <span>
                  <b>Seit</b> {fmtDate(a.since.slice(0, 10))}
                </span>
              </>
            }
          />
        ))}
      </div>
    </LcarsDataRow>
  );
}
