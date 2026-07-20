"use client";
import { useMemo, useState } from "react";
import type { SortDir } from "@/components/lcars";
import RowDetailModal from "@/components/RowDetailModal";
import SortableHeader from "../SortableHeader";

export interface LogColumn<T> {
  key: string;
  label: string;
  sortValue: (row: T) => string | number;
  filterValue: (row: T) => string;
  render: (row: T) => React.ReactNode;
  // Optional: vollständiger, ungekürzter Text fürs Zeilendetails-Modal
  // (RowDetailModal, gleiches Muster wie /admin/db) — fällt sonst auf
  // filterValue zurück. Eigenes Feld statt render() wiederzuverwenden, da
  // render() bewusst tabellenkompakte Darstellung liefert (z.B. gekürzt mit
  // Tooltip, oder ein <Link> statt reinem Text), das Modal aber den vollen
  // Rohtext braucht.
  modalValue?: (row: T) => string;
}

// Generische sortier-/filterbare Tabelle für /admin/audit-log (drei
// Verwendungen: AuditActionsTable, ContentActivityTable, sowie
// /admin/error-log über ServerErrorLogTable) — beide/alle Datensätze sind
// klein und schon vollständig serverseitig geladen, deshalb rein
// client-seitiger useMemo-Filter/Sort wie in AdminUsersTable.tsx, aber hier
// mit einem Text-Filter PRO Spalte statt einer einzelnen Suchleiste. Nimmt
// bewusst rows/columns als Props statt selbst zu laden — Server Components
// können keine Funktionen (sortValue/filterValue/render) an Client
// Components übergeben, die konkreten Spalten-Definitionen leben deshalb in
// den Wrapper-Komponenten, nicht in page.tsx. Ein Klick auf eine Zeile öffnet
// dasselbe Zeilendetails-Modal (RowDetailModal) wie der DB-Viewer unter
// /admin/db (DbTableRows.tsx) — zeigt die vollständigen, ungekürzten Werte
// aller Spalten dieser Zeile.
export default function AdminLogTable<T>({
  rows,
  columns,
  rowKey,
  emptyMessage,
  defaultSortKey,
  defaultSortDir,
}: {
  rows: T[];
  columns: LogColumn<T>[];
  rowKey: (row: T) => React.Key;
  emptyMessage: string;
  defaultSortKey: string;
  defaultSortDir: SortDir;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);
  const [selectedRow, setSelectedRow] = useState<T | null>(null);

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const visibleRows = useMemo(() => {
    const activeFilters = Object.entries(filters)
      .map(([key, value]) => [key, value.trim().toLowerCase()] as const)
      .filter(([, value]) => value.length > 0);

    const filtered = rows.filter((row) =>
      activeFilters.every(([key, value]) => {
        const column = columns.find((c) => c.key === key);
        return column
          ? column.filterValue(row).toLowerCase().includes(value)
          : true;
      }),
    );

    const column = columns.find((c) => c.key === sortKey) ?? columns[0];
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = column.sortValue(a);
      const bv = column.sortValue(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, columns, filters, sortKey, sortDir]);

  return (
    <div className="flex flex-col gap-[12px]">
      {rows.length === 0 ? (
        <p className="text-lcars-text-dim">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr>
                {columns.map((c) =>
                  c.key !== "actions" ? (
                    <SortableHeader
                      key={c.key}
                      label={c.label}
                      sortKeyValue={c.key}
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                  ) : (
                    <div key={c.key} className="lcars-eyebrow font-bold">
                      {c.label}
                    </div>
                  ),
                )}
              </tr>
              <tr>
                {columns.map(
                  (c) =>
                    c.key !== "actions" && (
                      <td key={c.key} className="pr-[16px] pb-[8px]">
                        <input
                          type="search"
                          value={filters[c.key] ?? ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              [c.key]: e.target.value,
                            }))
                          }
                          placeholder="Filtern…"
                          aria-label={`Nach ${c.label} filtern`}
                          className="lcars-input rounded-full w-full text-[12px]"
                        />
                      </td>
                    ),
                )}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-[6px] text-lcars-text-dim"
                  >
                    Keine Einträge für diese Filter.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className="border-t border-lcars-border cursor-pointer hover:bg-lcars-surface"
                    // onClick={() => setSelectedRow(row)}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className="py-[6px] pr-[16px] whitespace-nowrap"
                        onClick={
                          c.key !== "actions"
                            ? () => setSelectedRow(row)
                            : () => {}
                        }
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedRow && (
        <RowDetailModal
          title="Zeilendetails"
          fields={columns.map((c) => ({
            label: c.label,
            value: c.modalValue
              ? c.modalValue(selectedRow)
              : c.filterValue(selectedRow),
          }))}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </div>
  );
}
