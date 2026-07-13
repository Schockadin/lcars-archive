"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatDateTime } from "@/utils/formateISODate";
import { synopsisExcerpt } from "@/lib/missionFormat";
import { XIcon } from "@/lib/icons";

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
  const close = useCallback(() => setSelected(null), []);

  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selected, close]);

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

      {selectedRow &&
        createPortal(
          <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-[16px]"
            role="dialog"
            aria-modal="true"
            aria-label="Zeilendetails"
            onClick={close}
          >
            <div
              className="flex max-h-[80vh] w-full max-w-[720px] flex-col gap-[16px] overflow-y-auto rounded-[8px] border border-lcars-border bg-lcars-surface p-[24px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-[16px]">
                <h2 className="text-lcars-amber">Zeilendetails</h2>
                <button
                  type="button"
                  onClick={close}
                  className="lcars-icon-btn"
                  aria-label="Schließen"
                >
                  <XIcon />
                </button>
              </div>
              <dl className="flex flex-col gap-[12px]">
                {columns.map((c) => (
                  <div key={c}>
                    <dt className="lcars-eyebrow">{c}</dt>
                    <dd className="text-lcars-text text-[13px] whitespace-pre-wrap break-words">
                      {formatValue(selectedRow[c], false)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
