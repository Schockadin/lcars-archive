import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import type { RecentActivityItem } from "@/lib/recentActivity";
import { SOURCE_TYPE_LABELS, fmtDate } from "@/lib/timelineFormat";
import type { TimelineSourceType } from "@/types/timeline";

// Exportiert, damit NewsSection.tsx dieselben Typ-Farben für die
// "Aktualisiert"-Hälfte des gemergten News-Feeds verwendet.
export const TYPE_COLOR: Record<TimelineSourceType, string> = {
  character: "var(--lcars-amber)",
  mission: "var(--lcars-green)",
  mission_log: "var(--lcars-blue)",
  archive_entry: "var(--lcars-purple)",
};

// Eine Sektion (Neu ODER Aktualisiert) — gleicher Kartenstil wie
// FollowedContentSection.tsx, hier zusätzlich mit Typ + Datum in der
// Meta-Zeile (analog dem früheren RecentActivity.tsx, das auf
// timeline_events basierte, siehe commit 53e76fa). Ganz ausgeblendet statt
// Leerzustand-Platzhalter, wenn es nichts anzuzeigen gibt (Dashboard soll
// keine leeren DataRows zeigen).
function ActivitySection({
  label,
  color,
  items,
}: {
  label: string;
  color: string;
  items: RecentActivityItem[];
}) {
  if (items.length === 0) return null;

  return (
    <LcarsDataRow value={items.length} label={label} color={color}>
      <div className="flex flex-col gap-[6px]">
        {items.map((item) => (
          <Link
            key={`${item.targetType}-${item.slug}`}
            href={item.href}
            className="mission-akte"
            style={
              {
                "--mission-color": TYPE_COLOR[item.targetType],
              } as React.CSSProperties
            }
          >
            <span className="mission-akte-rail" />
            <span className="mission-akte-body text-left">
              <span className="mission-akte-title block">{item.title}</span>
              <span className="mission-akte-meta">
                <span>
                  <b>Typ</b> {SOURCE_TYPE_LABELS[item.targetType]}
                </span>
                <span>
                  <b>Datum</b> {fmtDate(item.timestamp)}
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </LcarsDataRow>
  );
}

// "Neu angelegte Inhalte" seit dem letzten Besuch (created_at gegen
// previous_login_at, siehe getRecentActivity in src/lib/recentActivity.ts).
// Der "Aktualisiert"-Teil lebt seit der News-Sektion in NewsSection.tsx
// (zusammengeführt mit offenen Gesprächen) — hier bleibt bewusst nur noch
// "Neu" als Akkordeon übrig. Ohne Timeline-Einträge — anders als das frühere
// RecentActivity.tsx (siehe commit 53e76fa), das komplett auf timeline_events
// (kuratierte In-Story-Ereignisse) basierte, keine "was ist neu im
// Archiv"-Quelle.
//
// Die Willkommens-Meldung beim ersten Besuch bleibt bestehen (hat mit dem
// Begrüßungstext echten Inhalt, anders als ein leerer "Nichts Neues"-Zustand)
// — ausgeblendet wird nur der Fall "kein erster Besuch, aber auch nichts
// Neues seit dem letzten Login".
export default function RecentActivity({
  created,
  firstVisit,
}: {
  created: RecentActivityItem[];
  firstVisit: boolean;
}) {
  if (firstVisit) {
    return (
      <LcarsDataRow value={0} label="Neue Inhalte" color="var(--lcars-purple)">
        <p className="lcars-empty-state">
          Das ist dein erster Besuch — willkommen an Bord.
        </p>
      </LcarsDataRow>
    );
  }

  return <ActivitySection label="Neu" color="var(--lcars-purple)" items={created} />;
}
