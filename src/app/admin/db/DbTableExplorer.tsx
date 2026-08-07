"use client";
import { useCallback, useEffect, useState } from "react";
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "@/lib/icons";
import RowDetailModal from "@/components/RowDetailModal";
import { updateDbRowAction, deleteDbRowAction } from "./rowEditActions";
import { formatDateTime } from "@/utils/formateISODate";
import { synopsisExcerpt } from "@/lib/missionFormat";
import {
  loadTablePageAction,
  insertDbRowAction,
  type TableInfo,
  type TablePageResult,
} from "./tableExplorerActions";
import { TABLE_PAGE_SIZE } from "./tableExplorerConfig";

const TRUNCATE_LENGTH = 120;

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

function TableIcon() {
  return (
    <svg
      className="db-explorer-item-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <line x1="2" y1="6" x2="14" y2="6" />
      <line x1="2" y1="10" x2="14" y2="10" />
      <line x1="7" y1="6" x2="7" y2="14" />
    </svg>
  );
}

export default function DbTableExplorer({
  tables,
  canEdit,
  canDelete,
}: {
  tables: TableInfo[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TablePageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalRow, setModalRow] = useState<number | null>(null);
  const [inserting, setInserting] = useState(false);

  const contentTables = tables.filter((t) => t.isContent);
  const systemTables = tables.filter((t) => !t.isContent);

  const loadPage = useCallback(
    async (table: string, p: number) => {
      setLoading(true);
      try {
        const result = await loadTablePageAction(table, p);
        // Wurde die letzte Zeile einer Seite gelöscht, kann die aktuelle
        // Seite hinter das (geschrumpfte) Ende rutschen — dann eine Seite
        // zurück, statt eine leere Ansicht mit "2/1"-Pager zu zeigen. Die
        // veraltete (die gelöschte Zeile enthaltende) Ansicht vorher leeren,
        // damit sie nicht bis zum Nachladen der Vorseite sichtbar bleibt.
        if (!result.error && result.rows.length === 0 && p > 1) {
          setData(null);
          setPage(p - 1);
          return;
        }
        setData(result);
      } catch {
        setData({ columns: [], rows: [], total: 0, error: "Laden fehlgeschlagen." });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selected) {
      loadPage(selected, page);
    }
  }, [selected, page, loadPage]);

  function selectTable(name: string) {
    if (name === selected) return;
    setSelected(name);
    setPage(1);
    setData(null);
    setModalRow(null);
    setInserting(false);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / TABLE_PAGE_SIZE)) : 1;
  const selectedRow = modalRow !== null && data ? data.rows[modalRow] : null;
  const hasId = data?.columns.includes("id") ?? false;

  return (
    <div className="flex flex-col gap-[16px] sm:flex-row sm:gap-[24px]">
      {/* Sidebar: table tree */}
      <nav className="db-explorer-tree sm:w-[200px] sm:flex-shrink-0">
        <div className="db-explorer-group-label">Inhaltstabellen</div>
        {contentTables.map((t) => (
          <button
            key={t.name}
            type="button"
            className="db-explorer-item"
            aria-selected={t.name === selected}
            onClick={() => selectTable(t.name)}
          >
            <TableIcon />
            <span className="db-explorer-item-name">{t.name}</span>
          </button>
        ))}
        {systemTables.length > 0 && (
          <>
            <div className="db-explorer-group-label">Systemtabellen</div>
            {systemTables.map((t) => (
              <button
                key={t.name}
                type="button"
                className="db-explorer-item"
                aria-selected={t.name === selected}
                onClick={() => selectTable(t.name)}
              >
                <TableIcon />
                <span className="db-explorer-item-name">{t.name}</span>
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {!selected && (
          <p className="text-lcars-text-dim text-[13px]">
            Tabelle aus der Liste auswählen.
          </p>
        )}

        {selected && data?.error && (
          <p className="text-lcars-red text-[13px]">{data.error}</p>
        )}

        {selected && data && !data.error && (
          <>
            <div className="db-explorer-toolbar mb-[8px]">
              <div className="flex items-center gap-[8px]">
                <h3 className="text-lcars-amber font-bold text-[14px]">
                  {selected}
                </h3>
                <span className="text-lcars-text-dim text-[12px]">
                  {data.total} Zeile(n)
                </span>
              </div>
              <div className="flex items-center gap-[6px]">
                {canEdit && (
                  <button
                    type="button"
                    className="lcars-icon-btn"
                    aria-label="Neue Zeile einfügen"
                    title="Neue Zeile einfügen"
                    onClick={() => setInserting(true)}
                  >
                    <PlusIcon />
                  </button>
                )}
                <div className="db-explorer-pager">
                  <button
                    type="button"
                    className="lcars-icon-btn disabled:opacity-30"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label="Vorherige Seite"
                  >
                    <ChevronLeftIcon />
                  </button>
                  <span>
                    {page}/{totalPages}
                  </span>
                  <button
                    type="button"
                    className="lcars-icon-btn disabled:opacity-30"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Nächste Seite"
                  >
                    <ChevronRightIcon />
                  </button>
                </div>
              </div>
            </div>

            {loading && (
              <p className="text-lcars-text-dim text-[13px]">Lade…</p>
            )}

            {!loading && data.rows.length === 0 && (
              <p className="text-lcars-text-dim text-[13px]">
                Keine Zeilen vorhanden.
              </p>
            )}

            {!loading && data.rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="text-lcars-amber">
                      {data.columns.map((c) => (
                        <th
                          key={c}
                          className="lcars-eyebrow pr-[12px] pb-[6px] whitespace-nowrap"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-lcars-border cursor-pointer hover:bg-lcars-surface"
                        onClick={() => setModalRow(i)}
                      >
                        {data.columns.map((c) => (
                          <td
                            key={c}
                            className="py-[4px] pr-[12px] whitespace-nowrap text-lcars-text"
                          >
                            {formatValue(row[c], true)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Row detail modal */}
        {selectedRow && data && (
          <RowDetailModal
            title={`${selected} — Zeile`}
            fields={data.columns.map((c) => ({
              label: c,
              value: formatValue(selectedRow[c], false),
            }))}
            onClose={() => {
              setModalRow(null);
              loadPage(selected!, page);
            }}
            edit={
              hasId && (canEdit || canDelete)
                ? {
                    pkColumn: "id",
                    columns: [...data.columns],
                    rawByColumn: selectedRow,
                    canEdit,
                    canDelete,
                    onSave: async (updates) => {
                      const res = await updateDbRowAction({
                        table: selected!,
                        pkColumn: "id",
                        pkValue: String(selectedRow.id),
                        updates,
                      });
                      return res;
                    },
                    onDelete: async () => {
                      const res = await deleteDbRowAction({
                        table: selected!,
                        pkColumn: "id",
                        pkValue: String(selectedRow.id),
                      });
                      return res;
                    },
                  }
                : undefined
            }
          />
        )}

        {/* Insert modal */}
        {inserting && selected && data && (
          <InsertRowModal
            table={selected}
            columns={data.columns}
            onClose={() => setInserting(false)}
            onInserted={() => {
              setInserting(false);
              loadPage(selected, page);
            }}
          />
        )}
      </div>
    </div>
  );
}

function InsertRowModal({
  table,
  columns,
  onClose,
  onInserted,
}: {
  table: string;
  columns: readonly string[];
  onClose: () => void;
  onInserted: () => void;
}) {
  const editableColumns = columns.filter((c) => c !== "id");
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of editableColumns) init[c] = "";
    return init;
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  async function handleInsert() {
    setPending(true);
    setError(null);
    const nonEmpty: Record<string, string | null> = {};
    for (const c of editableColumns) {
      if (values[c].trim()) nonEmpty[c] = values[c];
    }
    const res = await insertDbRowAction({ table, values: nonEmpty });
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onInserted();
  }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-[16px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Neue Zeile in ${table}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-[720px] flex-col gap-[16px] overflow-y-auto rounded-[8px] border border-lcars-border bg-lcars-surface p-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lcars-amber">Neue Zeile — {table}</h2>
        <p className="text-lcars-text-dim text-[12px]">
          Leere Felder werden übersprungen (Postgres-Defaults greifen).
        </p>

        <dl className="flex flex-col gap-[8px]">
          {editableColumns.map((c) => (
            <div key={c}>
              <dt className="lcars-eyebrow text-[11px]">{c}</dt>
              <textarea
                value={values[c]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [c]: e.target.value }))
                }
                rows={1}
                className="lcars-input mt-[2px] w-full rounded-[6px] text-[13px] font-mono"
                aria-label={c}
              />
            </div>
          ))}
        </dl>

        {error && (
          <p className="text-lcars-red text-[13px]" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-[8px] justify-end">
          <button
            type="button"
            className="lcars-pill-btn--outline"
            onClick={onClose}
            disabled={pending}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="lcars-pill-btn--outline"
            onClick={handleInsert}
            disabled={pending}
          >
            {pending ? "Füge ein…" : "Einfügen"}
          </button>
        </div>
      </div>
    </div>
  );
}
