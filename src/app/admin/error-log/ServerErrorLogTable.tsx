"use client";
import { formatDateTime } from "@/utils/formateISODate";
import AdminLogTable, { type LogColumn } from "../audit-log/AdminLogTable";
import type { ErrorLogRow } from "@/lib/errorLog";

const ROUTE_TYPE_LABELS: Record<string, string> = {
  render: "Render",
  route: "Route Handler",
  action: "Server Action",
  proxy: "Proxy",
  caught: "Abgefangen",
};

const columns: LogColumn<ErrorLogRow>[] = [
  {
    key: "createdAt",
    label: "Zeitpunkt",
    sortValue: (e) => new Date(e.createdAt).getTime(),
    filterValue: (e) => formatDateTime(e.createdAt),
    render: (e) => formatDateTime(e.createdAt),
  },
  {
    key: "routeType",
    label: "Typ",
    sortValue: (e) => e.routeType ?? "",
    filterValue: (e) => ROUTE_TYPE_LABELS[e.routeType ?? ""] ?? e.routeType ?? "",
    render: (e) => ROUTE_TYPE_LABELS[e.routeType ?? ""] ?? e.routeType ?? "—",
  },
  {
    key: "routePath",
    label: "Route/Kontext",
    sortValue: (e) => e.routePath ?? "",
    filterValue: (e) => e.routePath ?? "",
    render: (e) => e.routePath ?? "—",
  },
  {
    key: "method",
    label: "Methode",
    sortValue: (e) => e.method ?? "",
    filterValue: (e) => e.method ?? "",
    render: (e) => e.method ?? "—",
  },
  {
    key: "message",
    label: "Meldung",
    sortValue: (e) => e.message,
    filterValue: (e) => e.message,
    render: (e) => <span className="block max-w-[400px] truncate">{e.message}</span>,
    // Volle Meldung + Stacktrace fürs Zeilendetails-Modal statt nur des
    // bisherigen title-Tooltips — Stacktraces sind oft mehrere hundert
    // Zeichen lang und in einem Hover-Tooltip kaum lesbar.
    modalValue: (e) => (e.stack ? `${e.message}\n\n${e.stack}` : e.message),
  },
  {
    key: "digest",
    label: "Digest",
    sortValue: (e) => e.digest ?? "",
    filterValue: (e) => e.digest ?? "",
    render: (e) => e.digest ?? "—",
  },
];

export default function ServerErrorLogTable({
  entries,
}: {
  entries: ErrorLogRow[];
}) {
  return (
    <AdminLogTable
      rows={entries}
      columns={columns}
      rowKey={(e) => e.id}
      emptyMessage="Noch keine geloggten Fehler."
      defaultSortKey="createdAt"
      defaultSortDir="desc"
    />
  );
}
