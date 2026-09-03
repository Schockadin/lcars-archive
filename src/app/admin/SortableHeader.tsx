"use client";
import type { SortDir } from "@/components/lcars";
import { SortArrowIcon } from "@/lib/icons";

// Klickbare Spaltenüberschrift statt separatem Sortier-Switch (siehe
// SortSwitch.tsx, dessen Klick-/Pfeil-Logik hier dupliziert wird): erster
// Klick auf eine inaktive Spalte sortiert aufsteigend, jeder weitere Klick
// auf dieselbe Spalte togglet die Richtung. Admin-weiter Shared-Baustein
// (siehe AdminUsersTable.tsx, AdminLogTable.tsx) statt Toolbar-Switch, das
// Muster ist aktuell admin-exklusiv (die übrigen Inhaltslisten nutzen
// weiterhin LcarsSortSwitch).
export default function SortableHeader<T extends string>({
  label,
  sortKeyValue,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKeyValue: T;
  activeKey: T;
  dir: SortDir;
  onSort: (key: T) => void;
}) {
  const isActive = activeKey === sortKeyValue;
  return (
    <th className="pr-[16px] pb-[8px] whitespace-nowrap">
      <button
        type="button"
        onClick={() => onSort(sortKeyValue)}
        className="lcars-eyebrow lcars-sort-switch-label"
      >
        {label}
        {isActive && (
          <span
            className="lcars-sort-switch-arrow"
            style={{
              display: "inline-flex",
              transform: dir === "desc" ? "rotate(180deg)" : undefined,
            }}
          >
            <SortArrowIcon />
          </span>
        )}
      </button>
    </th>
  );
}
