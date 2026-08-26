"use client";
import { useState } from "react";
import { formatDateTime } from "@/utils/formateISODate";
import { synopsisExcerpt } from "@/lib/missionFormat";
import RowDetailModal from "@/components/RowDetailModal";
import { updateDbRowAction, deleteDbRowAction } from "./rowEditActions";
import type { RowEditContext } from "./sqlQueryActions";

const TRUNCATE_LENGTH = 140;

// Zellwert für die Tabelle (gekürzt) bzw. das Modal (vollständig, JSON
// pretty-printed statt einzeilig) formatiert.
function formatValue(value: unknown, truncate: boolean): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === "object") {
    return truncate
      ? synopsisExcerpt(JSON.stringify(value), TRUNCATE_LENGTH)
      : JSON.stringify(value, null, 2);
  }
  const text = String(value);
  return truncate ? synopsisExcerpt(text, TRUNCATE_LENGTH) : text;
}

// Tabellenkörper des DB-Bereichs (/admin/db, SQL-Ergebnisse) — jede Zelle wird
// auf eine Vorschau gekürzt; ein Klick auf eine Zeile öffnet ein Modal mit den
// vollständigen Werten. Mit editContext (Einzel-Tabellen-SELECT mit id) und den
// passenden Rechten bietet das Modal zusätzlich Bearbeiten/Löschen der Zeile.
export default function DbTableRows({
  columns,
  rows,
  editContext,
  canEdit = false,
  canDelete = false,
}: {
  columns: readonly string[];
  rows: Record<string, unknown>[];
  editContext?: RowEditContext;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedRow = selected !== null ? rows[selected] : null;

  return (
    <>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className="border-t border-lcars-border cursor-pointer hover:bg-lcars-surface"
            onClick={() => setSelected(i)}
          >
            {columns.map((c) => (
              <td
                key={c}
                className="py-[6px] pr-[16px] whitespace-nowrap text-lcars-ink"
              >
                {formatValue(row[c], true)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>

      {selectedRow && (
        <RowDetailModal
          title="Zeilendetails"
          fields={columns.map((c) => ({
            label: c,
            value: formatValue(selectedRow[c], false),
          }))}
          onClose={() => setSelected(null)}
          edit={
            editContext && (canEdit || canDelete)
              ? {
                  pkColumn: editContext.pkColumn,
                  columns: [...columns],
                  rawByColumn: selectedRow,
                  canEdit,
                  canDelete,
                  onSave: (updates) =>
                    updateDbRowAction({
                      table: editContext.table,
                      pkColumn: editContext.pkColumn,
                      pkValue: String(selectedRow[editContext.pkColumn]),
                      updates,
                    }),
                  onDelete: () =>
                    deleteDbRowAction({
                      table: editContext.table,
                      pkColumn: editContext.pkColumn,
                      pkValue: String(selectedRow[editContext.pkColumn]),
                    }),
                }
              : undefined
          }
        />
      )}
    </>
  );
}
