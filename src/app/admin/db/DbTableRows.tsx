"use client";
import { useState } from "react";
import { formatDateTime } from "@/utils/formateISODate";
import { synopsisExcerpt } from "@/lib/missionFormat";
import RowDetailModal from "@/components/RowDetailModal";

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

// Tabellenkörper des DB-Viewers (/admin/db) — jede Zelle wird auf eine
// Vorschau gekürzt (sonst sprengt z.B. eine lange bio/content-Spalte die
// ganze Tabelle), ein Klick auf eine Zeile öffnet ein Modal mit den
// vollständigen, ungekürzten Werten aller Spalten dieser Zeile. Gleiches
// Overlay-Muster (createPortal, Escape schließt, Klick außerhalb schließt,
// Scroll-Sperre während offen) wie CharacterPortrait.tsx.
export default function DbTableRows({
  columns,
  rows,
}: {
  columns: readonly string[];
  rows: Record<string, unknown>[];
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
                className="py-[6px] pr-[16px] whitespace-nowrap text-lcars-text"
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
        />
      )}
    </>
  );
}
