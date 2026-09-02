"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminLogTable, { type LogColumn } from "../../audit-log/AdminLogTable";
import {
  restoreContentAction,
  purgeContentAction,
} from "../../contentDeleteActions";
import { formatDateTime } from "@/utils/formateISODate";
import { RestoreIcon, TrashIcon } from "@/lib/icons";
import type { TrashItem, TrashContentType } from "@/lib/adminContent";

const CONTENT_TYPE_LABELS: Record<TrashContentType, string> = {
  character: "Charakter",
  mission: "Mission",
  mission_log: "Missionslog",
  archive_entry: "Datenbank-Eintrag",
  dialogue: "Dialog",
};

// Admin-Trash-Ansicht (/admin/content/trash) — alle weich gelöschten
// Inhalte (deleted_at gesetzt), mit Wiederherstellen- und "Endgültig
// löschen"-Knopf pro Zeile. Nutzt dieselbe generische AdminLogTable wie
// /admin/audit-log statt einer neuen Tabellen-Implementierung.
export default function TrashTable({ items }: { items: TrashItem[] }) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function itemKey(item: TrashItem): string {
    return `${item.contentType}:${item.id}`;
  }

  function handleRestore(item: TrashItem) {
    setError(null);
    setPendingKey(itemKey(item));
    startTransition(async () => {
      const result = await restoreContentAction(item.contentType, item.id);
      setPendingKey(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handlePurge(item: TrashItem) {
    if (
      !window.confirm(
        `"${item.title}" endgültig löschen? Das kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }
    setError(null);
    setPendingKey(itemKey(item));
    startTransition(async () => {
      const result = await purgeContentAction(item.contentType, item.id);
      setPendingKey(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const columns: LogColumn<TrashItem>[] = [
    {
      key: "type",
      label: "Typ",
      sortValue: (row) => CONTENT_TYPE_LABELS[row.contentType],
      filterValue: (row) => CONTENT_TYPE_LABELS[row.contentType],
      render: (row) => CONTENT_TYPE_LABELS[row.contentType],
    },
    {
      key: "title",
      label: "Titel",
      sortValue: (row) => row.title,
      filterValue: (row) => row.title,
      render: (row) => row.title,
    },
    {
      key: "owner",
      label: "Eigentümer",
      sortValue: (row) => row.ownerName ?? "",
      filterValue: (row) => row.ownerName ?? "",
      render: (row) => row.ownerName ?? "—",
    },
    {
      key: "deletedAt",
      label: "Gelöscht am",
      sortValue: (row) => row.deletedAt,
      filterValue: (row) => formatDateTime(row.deletedAt),
      render: (row) => formatDateTime(row.deletedAt),
    },
    {
      key: "actions",
      label: "Aktionen",
      sortValue: () => "",
      filterValue: () => "",
      render: (row) => (
        <div className="flex gap-[6px]">
          <button
            type="button"
            disabled={pendingKey === itemKey(row)}
            onClick={() => handleRestore(row)}
            className="lcars-icon-btn disabled:opacity-50"
            aria-label="Wiederherstellen"
            title="Wiederherstellen"
          >
            <RestoreIcon />
          </button>
          <button
            type="button"
            disabled={pendingKey === itemKey(row)}
            onClick={() => handlePurge(row)}
            className="lcars-icon-btn disabled:opacity-50"
            aria-label="Endgültig löschen"
            title="Endgültig löschen"
          >
            <TrashIcon />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-[8px]">
      {error && (
        <p className="text-lcars-quinary" role="alert">
          {error}
        </p>
      )}
      <AdminLogTable
        rows={items}
        columns={columns}
        rowKey={itemKey}
        emptyMessage="Keine gelöschten Inhalte."
        defaultSortKey="deletedAt"
        defaultSortDir="desc"
      />
    </div>
  );
}
