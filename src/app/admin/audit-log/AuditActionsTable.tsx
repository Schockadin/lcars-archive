"use client";
import { formatDateTime } from "@/utils/formateISODate";
import AdminLogTable, { type LogColumn } from "./AdminLogTable";
import type { AdminAuditLogEntry, AdminAuditAction } from "@/lib/auditLog";

const ACTION_LABELS: Record<AdminAuditAction, string> = {
  create_user: "User angelegt",
  reset_password: "Passwort-Reset ausgelöst",
  update_role: "Rolle geändert",
  update_profile: "Profil bearbeitet",
  deactivate_user: "User deaktiviert",
  reactivate_user: "User reaktiviert",
  delete_user: "User gelöscht",
  force_logout: "User abgemeldet (alle Geräte)",
};

const columns: LogColumn<AdminAuditLogEntry>[] = [
  {
    key: "createdAt",
    label: "Zeitpunkt",
    sortValue: (e) => new Date(e.createdAt).getTime(),
    filterValue: (e) => formatDateTime(e.createdAt),
    render: (e) => formatDateTime(e.createdAt),
  },
  {
    key: "actorName",
    label: "Von",
    sortValue: (e) => e.actorName ?? "",
    filterValue: (e) => e.actorName ?? "",
    render: (e) => e.actorName ?? "—",
  },
  {
    key: "action",
    label: "Aktion",
    sortValue: (e) => ACTION_LABELS[e.action],
    filterValue: (e) => ACTION_LABELS[e.action],
    render: (e) => ACTION_LABELS[e.action],
  },
  {
    key: "details",
    label: "Details",
    sortValue: (e) => e.details ?? "",
    filterValue: (e) => e.details ?? "",
    render: (e) => e.details ?? "—",
  },
  {
    key: "ip",
    label: "IP",
    sortValue: (e) => e.ip ?? "",
    filterValue: (e) => e.ip ?? "",
    render: (e) => e.ip ?? "—",
  },
];

export default function AuditActionsTable({
  entries,
}: {
  entries: AdminAuditLogEntry[];
}) {
  return (
    <AdminLogTable
      rows={entries}
      columns={columns}
      rowKey={(e) => e.id}
      emptyMessage="Noch keine Einträge."
      defaultSortKey="createdAt"
      defaultSortDir="desc"
    />
  );
}
