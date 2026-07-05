import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import type { RecentActivityItem } from "@/lib/recentActivity";
import type { DialogueSummary } from "@/lib/dialogues";
import { SOURCE_TYPE_LABELS, fmtDate } from "@/lib/timelineFormat";
import { TYPE_COLOR } from "./RecentActivity";

interface NewsItem {
  key: string;
  title: string;
  href: string;
  timestamp: string;
  meta: string;
  color: string;
}

function toNewsItems(
  updated: RecentActivityItem[],
  openDialogues: DialogueSummary[],
): NewsItem[] {
  const fromUpdated: NewsItem[] = updated.map((item) => ({
    key: `${item.targetType}-${item.slug}`,
    title: item.title,
    href: item.href,
    timestamp: item.timestamp,
    meta: `${SOURCE_TYPE_LABELS[item.targetType]} · Bearbeitet von ${item.authorName ?? "Spielleitung"}`,
    color: TYPE_COLOR[item.targetType],
  }));
  const fromDialogues: NewsItem[] = openDialogues.map((d) => ({
    key: `dialogue-${d.slug}`,
    title: d.title,
    href: `/dialogues/${d.slug}`,
    timestamp: d.updatedAt,
    meta: `Gespräch · mit ${d.partnerName}`,
    color: "var(--lcars-text-data)",
  }));
  return [...fromUpdated, ...fromDialogues].sort((a, b) =>
    a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0,
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  return (
    <Link
      href={item.href}
      className="news-row"
      style={{ "--news-color": item.color } as React.CSSProperties}
    >
      <span className="news-row-rail" />
      <span className="news-row-body">
        <span className="news-row-title">{item.title}</span>
        <span className="news-row-meta">
          {item.meta} · {fmtDate(item.timestamp)}
        </span>
      </span>
    </Link>
  );
}

// Ersetzt die frühere separate "Offene Gespräche"-Sektion und den
// "Aktualisiert"-Teil von RecentActivity.tsx: ein gemergter, nach Datum
// sortierter Feed aus zuletzt bearbeiteten Inhalten + offenen Gesprächen.
// Bewusst KEIN Akkordeon (LcarsDataRow ohne children rendert nur die
// Kopf-Pille, nicht klickbar/klappbar) — die News sollen immer sichtbar
// sein, dafür in einem scrollbaren Container mit fester Höhe (3 Zeilen,
// siehe .news-scroll in shared.css) statt eines potenziell langen Akkordeons.
//
// className="lcars-data-row--full": ohne children (kein Akkordeon-Zweig in
// DataRow.tsx) bleibt die Pille sonst bei ihrer festen Default-Breite
// (300px/238px, siehe .lcars-data-row in data-row.css) statt wie die
// anderen Akkordeon-Kopfzeilen auf dem Dashboard 100% Breite einzunehmen.
//
// Ganz ausgeblendet (kein Platzhalter-Text), wenn es nichts anzuzeigen gibt
// — wie die übrigen Dashboard-DataRows (siehe FollowedContentSection.tsx).
export default function NewsSection({
  updated,
  openDialogues,
}: {
  updated: RecentActivityItem[];
  openDialogues: DialogueSummary[];
}) {
  const items = toNewsItems(updated, openDialogues);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-[8px]">
      <LcarsDataRow
        value={items.length}
        label="News"
        color="var(--lcars-blue)"
        className="lcars-data-row--full"
      />
      <div className="news-scroll">
        {items.map((item) => (
          <NewsRow key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}
