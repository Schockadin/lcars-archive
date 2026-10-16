"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/utils/formateISODate";
import AdminLogTable, { type LogColumn } from "./AdminLogTable";
import type { AdminAuditLogEntry, AdminAuditAction } from "@/lib/auditLog";
import {
  getDbRowAuditDetailsAction,
  loadOlderAdminActionsAction,
  undoDbRowAuditAction,
} from "./actions";
import { EyeIcon, RestoreIcon } from "@/lib/icons";
import { useToast } from "@/components/toast/ToastProvider";
import RowDetailModal from "@/components/RowDetailModal";

const ACTION_LABELS: Record<AdminAuditAction, string> = {
  create_user: "User angelegt",
  reset_password: "Passwort-Reset ausgelöst",
  update_role: "Rolle geändert",
  update_profile: "Profil bearbeitet",
  deactivate_user: "User deaktiviert",
  reactivate_user: "User reaktiviert",
  delete_user: "User gelöscht",
  force_logout: "User abgemeldet (alle Geräte)",
  update_roles: "Rollen geändert",
  update_permissions: "Rechte geändert",
  create_role: "Rolle angelegt",
  edit_role: "Rolle bearbeitet",
  delete_role: "Rolle gelöscht",
  update_db_row: "Datenbankzeile bearbeitet",
  undo_db_row: "Datenbankänderung rückgängig gemacht",
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

const AUDIT_PAGE_SIZE = 200;

function ViewChangeDetailsButton({ entry }: { entry: AdminAuditLogEntry }) {
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);
  const [details, setDetails] = useState<string | null>(null);

  async function viewDetails() {
    setPending(true);
    try {
      const result = await getDbRowAuditDetailsAction(entry.id);
      if (result.error || !result.details) {
        showToast(
          result.error ?? "Änderungswerte konnten nicht geladen werden.",
          {
            kind: "error",
          },
        );
        return;
      }
      setDetails(result.details);
    } catch {
      showToast("Änderungswerte konnten nicht geladen werden.", {
        kind: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={viewDetails}
        disabled={pending}
        className="lcars-icon-btn disabled:opacity-50"
        aria-label="Geänderte Werte anzeigen"
        title="Geänderte Werte anzeigen"
      >
        <EyeIcon />
      </button>
      {details !== null && (
        <RowDetailModal
          title={`Änderung · ${entry.details ?? `Eintrag #${entry.id}`}`}
          fields={[{ label: "Vorher / nachher", value: details }]}
          onClose={() => setDetails(null)}
        />
      )}
    </>
  );
}

function UndoButton({
  entry,
  onUndone,
}: {
  entry: AdminAuditLogEntry;
  onUndone: (undoAuditId: number) => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);

  async function undo() {
    const confirmed = confirm(
      `Diese Änderung wirklich rückgängig machen? ${entry.details ?? ""}\n\nDie damals bearbeiteten Spalten werden auf ihren vorherigen Stand gesetzt. Spätere Änderungen an denselben Spalten werden dabei überschrieben.`,
    );
    if (!confirmed) return;

    setPending(true);
    try {
      const result = await undoDbRowAuditAction(entry.id);
      if (result.error) {
        showToast(result.error, { kind: "error" });
        return;
      }
      if (!result.auditId) {
        showToast("Die Rücknahme wurde nicht protokolliert.", {
          kind: "error",
        });
        return;
      }
      onUndone(result.auditId);
      showToast("Datenbankänderung wurde rückgängig gemacht.", {
        kind: "success",
      });
      router.refresh();
    } catch {
      showToast("Rücknahme fehlgeschlagen.", { kind: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={undo}
      disabled={pending}
      className="lcars-icon-btn disabled:opacity-50"
      aria-label="Änderung rückgängig machen"
      title="Änderung rückgängig machen"
    >
      <RestoreIcon />
    </button>
  );
}

export default function AuditActionsTable({
  entries,
  canUndo,
}: {
  entries: AdminAuditLogEntry[];
  canUndo: boolean;
}) {
  const { showToast } = useToast();
  const [olderEntries, setOlderEntries] = useState<AdminAuditLogEntry[]>([]);
  const [undoIds, setUndoIds] = useState<Record<number, number>>({});
  const [hasMore, setHasMore] = useState(entries.length === AUDIT_PAGE_SIZE);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const allEntries = useMemo(() => {
    const byId = new Map<number, AdminAuditLogEntry>();
    for (const entry of olderEntries) byId.set(entry.id, entry);
    // Server refreshes replace recent entries, including the new undo record
    // and the original row's reverted status; previously fetched pages remain.
    for (const entry of entries) byId.set(entry.id, entry);
    return [...byId.values()]
      .map((entry) =>
        undoIds[entry.id]
          ? { ...entry, revertedByAuditId: undoIds[entry.id] }
          : entry,
      )
      .sort((a, b) => {
        const dateOrder =
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return dateOrder || b.id - a.id;
      });
  }, [entries, olderEntries, undoIds]);

  async function loadOlder() {
    const lastEntry = allEntries.at(-1);
    if (!lastEntry || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const more = await loadOlderAdminActionsAction({
        createdAt: lastEntry.createdAt,
        id: lastEntry.id,
      });
      if (more.length < AUDIT_PAGE_SIZE) setHasMore(false);
      setOlderEntries((current) => {
        const knownIds = new Set(current.map((entry) => entry.id));
        return [...current, ...more.filter((entry) => !knownIds.has(entry.id))];
      });
    } catch {
      showToast("Ältere Audit-Einträge konnten nicht geladen werden.", {
        kind: "error",
      });
    } finally {
      setLoadingOlder(false);
    }
  }

  const actionColumn: LogColumn<AdminAuditLogEntry> = {
    key: "actions",
    label: "Aktionen",
    sortValue: () => "",
    filterValue: () => "",
    render: (entry) => {
      if (entry.action !== "update_db_row" && entry.action !== "undo_db_row") {
        return "—";
      }
      return (
        <div className="flex items-center gap-[6px]">
          <ViewChangeDetailsButton entry={entry} />
          {entry.action === "update_db_row" &&
            (entry.revertedByAuditId ? (
              <span className="text-lcars-ink-dim text-[11px]">
                Bereits zurückgesetzt
              </span>
            ) : canUndo ? (
              <UndoButton
                entry={entry}
                onUndone={(undoAuditId) =>
                  setUndoIds((current) => ({
                    ...current,
                    [entry.id]: undoAuditId,
                  }))
                }
              />
            ) : null)}
        </div>
      );
    },
  };
  return (
    <div className="flex flex-col items-start gap-[12px]">
      <AdminLogTable
        rows={allEntries}
        columns={[...columns, actionColumn]}
        rowKey={(e) => e.id}
        emptyMessage="Noch keine Einträge."
        defaultSortKey="createdAt"
        defaultSortDir="desc"
      />
      {hasMore && (
        <button
          type="button"
          onClick={loadOlder}
          disabled={loadingOlder}
          className="lcars-pill-btn--outline self-start disabled:opacity-50"
        >
          {loadingOlder ? "Lade…" : "Ältere Einträge laden"}
        </button>
      )}
    </div>
  );
}
