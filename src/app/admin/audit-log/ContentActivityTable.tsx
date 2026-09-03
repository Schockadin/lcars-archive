"use client";
import Link from "next/link";
import { formatDateTime } from "@/utils/formateISODate";
import AdminLogTable, { type LogColumn } from "./AdminLogTable";
import type { ContentActivityItem } from "@/lib/contentActivityLog";
import type { TimelineSourceType } from "@/types/timeline";
import { CONTENT_TYPE_LABEL } from "@/lib/contentTypeFormat";

const TARGET_TYPE_LABELS: Record<TimelineSourceType, string> = CONTENT_TYPE_LABEL;

const KIND_LABELS: Record<ContentActivityItem["kind"], string> = {
  created: "Hinzugefügt",
  updated: "Bearbeitet",
  deleted: "Gelöscht",
};

const columns: LogColumn<ContentActivityItem>[] = [
  {
    key: "timestamp",
    label: "Zeitpunkt",
    sortValue: (i) => new Date(i.timestamp).getTime(),
    filterValue: (i) => formatDateTime(i.timestamp),
    render: (i) => formatDateTime(i.timestamp),
  },
  {
    key: "actorName",
    label: "Von",
    sortValue: (i) => i.actorName ?? "",
    filterValue: (i) => i.actorName ?? "",
    render: (i) => i.actorName ?? "—",
  },
  {
    key: "kind",
    label: "Aktion",
    sortValue: (i) => KIND_LABELS[i.kind],
    filterValue: (i) => KIND_LABELS[i.kind],
    render: (i) => KIND_LABELS[i.kind],
  },
  {
    key: "targetType",
    label: "Typ",
    sortValue: (i) => TARGET_TYPE_LABELS[i.targetType],
    filterValue: (i) => TARGET_TYPE_LABELS[i.targetType],
    render: (i) => TARGET_TYPE_LABELS[i.targetType],
  },
  {
    key: "title",
    label: "Titel",
    sortValue: (i) => i.title,
    filterValue: (i) => i.title,
    render: (i) =>
      i.href ? (
        <Link href={i.href} className="lcars-link-text">
          {i.title}
        </Link>
      ) : (
        i.title
      ),
  },
];

export default function ContentActivityTable({
  items,
}: {
  items: ContentActivityItem[];
}) {
  return (
    <AdminLogTable
      rows={items}
      columns={columns}
      // Kein eigenes id-Feld auf ContentActivityItem — zusammengesetzter
      // Key statt Array-Index, da sich die Zeilenreihenfolge durch
      // Sortierung ändert (ein reiner Index würde nach dem Sortieren auf
      // eine andere logische Zeile zeigen).
      rowKey={(i) => `${i.targetType}-${i.title}-${i.timestamp}`}
      emptyMessage="Keine Einträge."
      defaultSortKey="timestamp"
      defaultSortDir="desc"
    />
  );
}
