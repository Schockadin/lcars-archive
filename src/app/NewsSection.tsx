import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import type { RecentActivityItem, DeletionItem } from "@/lib/recentActivity";
import { SOURCE_TYPE_LABELS, fmtDate } from "@/lib/timelineFormat";

interface NewsItem {
  key: string;
  title: string;
  href: string | null;
  timestamp: string;
  meta: string;
  color: string;
}

// Farbe richtet sich nach der Aktion (neu/bearbeitet/gelöscht), nicht mehr
// nach dem Inhaltstyp — Vorgabe: grün = neuer Inhalt, blau = bearbeitet,
// rot = gelöscht.
function toNewsItems(
  created: RecentActivityItem[],
  updated: RecentActivityItem[],
  deleted: DeletionItem[],
): NewsItem[] {
  const fromCreated: NewsItem[] = created.map((item) => ({
    key: `created-${item.targetType}-${item.slug}`,
    title: item.title,
    href: item.href,
    timestamp: item.timestamp,
    meta: `${SOURCE_TYPE_LABELS[item.targetType]} · Neu von ${item.authorName ?? "Spielleitung"}`,
    color: "var(--lcars-green)",
  }));
  const fromUpdated: NewsItem[] = updated.map((item) => ({
    key: `updated-${item.targetType}-${item.slug}`,
    title: item.title,
    href: item.href,
    timestamp: item.timestamp,
    meta: `${SOURCE_TYPE_LABELS[item.targetType]} · Bearbeitet von ${item.authorName ?? "Spielleitung"}`,
    color: "var(--lcars-blue)",
  }));
  // Kein href: das Ziel existiert nicht mehr (hart gelöscht, siehe
  // getRecentDeletions).
  const fromDeleted: NewsItem[] = deleted.map((item) => ({
    key: `deleted-${item.timestamp}-${item.title}`,
    title: item.title,
    href: null,
    timestamp: item.timestamp,
    meta: `${SOURCE_TYPE_LABELS[item.targetType]} · Gelöscht von ${item.deletedByName ?? "Spielleitung"}`,
    color: "var(--lcars-red)",
  }));
  return [...fromCreated, ...fromUpdated, ...fromDeleted].sort((a, b) =>
    a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0,
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  const body = (
    <>
      <span className="news-row-rail" />
      <span className="news-row-body">
        <span className="news-row-title">{item.title}</span>
        <span className="news-row-meta">
          {item.meta} · {fmtDate(item.timestamp)}
        </span>
      </span>
    </>
  );
  const style = { "--news-color": item.color } as React.CSSProperties;

  if (!item.href) {
    return (
      <div className="news-row news-row--static" style={style}>
        {body}
      </div>
    );
  }
  return (
    <Link href={item.href} className="news-row" style={style}>
      {body}
    </Link>
  );
}

// Gemergter, nach Datum sortierter Feed aus neu erstellten, bearbeiteten und
// gelöschten Inhalten (grün/blau/rot). Offene Gespräche leben seit
// OpenDialoguesSection.tsx in einer eigenen Sektion, nicht mehr hier.
// Akkordeon wie OpenDialoguesSection, standardmäßig aufgeklappt (defaultOpen)
// — der begrenzte, scrollbare Container (3 Zeilen, siehe .news-scroll in
// shared.css) bleibt trotzdem, damit die Sektion nicht beliebig lang wird.
//
// Ganz ausgeblendet (kein Platzhalter-Text), wenn es nichts anzuzeigen gibt
// — wie die übrigen Dashboard-DataRows (siehe FollowedContentSection.tsx).
export default function NewsSection({
  created,
  updated,
  deleted,
}: {
  created: RecentActivityItem[];
  updated: RecentActivityItem[];
  deleted: DeletionItem[];
}) {
  const items = toNewsItems(created, updated, deleted);
  if (items.length === 0) return null;

  return (
    <LcarsDataRow
      value={items.length}
      label="News"
      color="var(--lcars-blue)"
      defaultOpen
    >
      <div className="news-scroll">
        {items.map((item) => (
          <NewsRow key={item.key} item={item} />
        ))}
      </div>
    </LcarsDataRow>
  );
}
