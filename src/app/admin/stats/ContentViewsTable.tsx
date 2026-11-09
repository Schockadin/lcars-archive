"use client";

import Link from "next/link";
import { formatDateTime } from "@/utils/formateISODate";
import type { ContentViewEvent } from "@/lib/contentViewTypes";
import AdminLogTable, { type LogColumn } from "../audit-log/AdminLogTable";

const TYPE_LABELS = {
  character: "Charakter",
  mission: "Mission",
  mission_log: "Missionsbericht",
  archive_entry: "Archiv-Eintrag",
} as const;

const columns: LogColumn<ContentViewEvent>[] = [
  {
    key: "viewedAt",
    label: "Zeitpunkt",
    sortValue: (row) => new Date(row.viewedAt).getTime(),
    filterValue: (row) => formatDateTime(row.viewedAt),
    render: (row) => formatDateTime(row.viewedAt),
  },
  {
    key: "user",
    label: "Nutzer:in",
    sortValue: (row) => row.userName,
    filterValue: (row) => `${row.userName} ${row.userEmail}`,
    render: (row) => (
      <span className="flex flex-col">
        <span>{row.userName}</span>
        <span className="text-[11px] text-lcars-ink-dim">{row.userEmail}</span>
      </span>
    ),
  },
  {
    key: "contentTitle",
    label: "Inhalt",
    sortValue: (row) => row.contentTitle,
    filterValue: (row) => row.contentTitle,
    render: (row) => (
      <Link
        href={row.routePath}
        className="lcars-link-text"
        onClick={(event) => event.stopPropagation()}
      >
        {row.contentTitle}
      </Link>
    ),
  },
  {
    key: "contentType",
    label: "Typ",
    sortValue: (row) => TYPE_LABELS[row.contentType],
    filterValue: (row) => TYPE_LABELS[row.contentType],
    render: (row) => TYPE_LABELS[row.contentType],
  },
];

export default function ContentViewsTable({
  rows,
}: {
  rows: ContentViewEvent[];
}) {
  return (
    <AdminLogTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      emptyMessage="Im Zeitraum liegen keine erfassten Inhaltsaufrufe vor."
      defaultSortKey="viewedAt"
      defaultSortDir="desc"
    />
  );
}
