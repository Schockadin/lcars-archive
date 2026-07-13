"use client";
import { useMemo, useState } from "react";
import type { SortDir } from "@/components/lcars";
import SortableHeader from "../SortableHeader";

export interface LogColumn<T> {
  key: string;
  label: string;
  sortValue: (row: T) => string | number;
  filterValue: (row: T) => string;
  render: (row: T) => React.ReactNode;
}

// Generische sortier-/filterbare Tabelle für /admin/audit-log (zwei
// Verwendungen: AuditActionsTable, ContentActivityTable) — beide Datensätze
// sind klein und schon vollständig serverseitig geladen, deshalb rein
// client-seitiger useMemo-Filter/Sort wie in AdminUsersTable.tsx, aber hier
// mit einem Text-Filter PRO Spalte statt einer einzelnen Suchleiste. Nimmt
// bewusst rows/columns als Props statt selbst zu laden — Server Components
// können keine Funktionen (sortValue/filterValue/render) an Client
// Components übergeben, die konkreten Spalten-Definitionen leben deshalb in
// den beiden Wrapper-Komponenten, nicht in page.tsx.
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
        return column ? column.filterValue(row).toLowerCase().includes(value) : true;
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
                {columns.map((c) => (
                  <SortableHeader
                    key={c.key}
                    label={c.label}
                    sortKeyValue={c.key}
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                ))}
              </tr>
              <tr>
                {columns.map((c) => (
                  <td key={c.key} className="pr-[16px] pb-[8px]">
                    <input
                      type="search"
                      value={filters[c.key] ?? ""}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, [c.key]: e.target.value }))
                      }
                      placeholder="Filtern…"
                      aria-label={`Nach ${c.label} filtern`}
                      className="lcars-input rounded-full w-full text-[12px]"
                    />
                  </td>
                ))}
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
                  <tr key={rowKey(row)} className="border-t border-lcars-border">
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className="py-[6px] pr-[16px] whitespace-nowrap"
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
    </div>
  );
}
