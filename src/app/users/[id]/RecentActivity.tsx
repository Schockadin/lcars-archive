import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import type { RecentActivityItem } from "@/lib/recentActivity";
import { SOURCE_TYPE_LABELS, fmtDate } from "@/lib/timelineFormat";
import type { TimelineSourceType } from "@/types/timeline";

const TYPE_COLOR: Record<TimelineSourceType, string> = {
  character: "var(--lcars-amber)",
  mission: "var(--lcars-green)",
  mission_log: "var(--lcars-blue)",
  archive_entry: "var(--lcars-purple)",
};

// Eine Sektion (Neu ODER Aktualisiert) — gleicher Kartenstil wie
// FollowedContentSection.tsx, hier zusätzlich mit Typ + Datum in der
// Meta-Zeile (analog dem früheren RecentActivity.tsx, das auf
// timeline_events basierte, siehe commit 53e76fa).
function ActivitySection({
  label,
  color,
  items,
  emptyLabel,
}: {
  label: string;
  color: string;
  items: RecentActivityItem[];
  emptyLabel: string;
}) {
  return (
    <LcarsDataRow value={items.length} label={label} color={color}>
      {items.length === 0 ? (
        <p className="lcars-empty-state">{emptyLabel}</p>
      ) : (
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
      )}
    </LcarsDataRow>
  );
}

// "Neue Inhalte" seit dem letzten Besuch, in zwei Akkordeons getrennt: neu
// angelegt vs. seither bearbeitet (created_at bzw. updated_at gegen
// previous_login_at, siehe getRecentActivity in src/lib/recentActivity.ts).
// Ohne Timeline-Einträge — anders als das frühere RecentActivity.tsx (siehe
// commit 53e76fa), das komplett auf timeline_events (kuratierte In-Story-
// Ereignisse) basierte, keine "was ist neu im Archiv"-Quelle.
export default function RecentActivity({
  created,
  updated,
  firstVisit,
}: {
  created: RecentActivityItem[];
  updated: RecentActivityItem[];
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

  return (
    <div className="flex flex-col gap-[8px]">
      <ActivitySection
        label="Neu"
        color="var(--lcars-purple)"
        items={created}
        emptyLabel="Nichts Neues seit deinem letzten Besuch."
      />
      <ActivitySection
        label="Aktualisiert"
        color="var(--lcars-amber-light)"
        items={updated}
        emptyLabel="Nichts Aktualisiertes seit deinem letzten Besuch."
      />
    </div>
  );
}
