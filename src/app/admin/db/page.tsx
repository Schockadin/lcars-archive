import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import {
  VIEWABLE_TABLES,
  isViewableTable,
  viewableColumns,
  enumOptionsFor,
  countTableRows,
  listTableRows,
} from "@/lib/dbInspect";
import { SortArrowIcon } from "@/lib/icons";
import DbBackupPanel from "../DbBackupPanel";
import DbTableRows from "./DbTableRows";
import SqlQueryPanel from "./SqlQueryPanel";

export const metadata: Metadata = {
  title: "Datenbank",
  robots: { index: false, follow: false },
};

export const maxDuration = 60;

const PAGE_SIZE = 50;
const FILTER_PARAM_PREFIX = "f_";

// Admin-only: DB-Backup (Export/Import aller Tabellen außer users), ein
// freies SQL-Query-Feld (SqlQueryPanel.tsx, read-only, jede Tabelle) sowie
// ein read-only Tabellen-Viewer, gesteuert über
// ?table=&page=&sort=&dir=&f_<spalte>= (kein Client-JS nötig, gleiches
// Muster wie /search bzw. /archive). Der Viewer zeigt nur die Whitelist aus
// src/lib/dbInspect.ts (= dieselbe wie beim Backup, aber ohne
// password_setup_tokens/mission_participants) und immer nur die dort
// gelisteten Spalten — Fremdschlüssel-Spalten zeigen dort den Slug der
// referenzierten Zeile statt der rohen id (resolveReferences in
// dbInspect.ts, keine Verlinkung, reine Lesbarkeit). Sortierung läuft über
// die Spalten-Header (Links, die Sortierspalte/-richtung umschalten), Filter
// über ein GET-Formular mit einem Textfeld pro Spalte (Substring-Suche via
// ::text ILIKE in dbInspect.ts) — beides verändert die SQL-Query direkt
// statt nur die aktuell geladene Seite umzusortieren, da Tabellen beliebig
// groß sein können.
export default async function AdminDbPage({
  searchParams,
}: {
  searchParams: Promise<{
    table?: string;
    page?: string;
    sort?: string;
    dir?: string;
    [key: string]: string | undefined;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const table = params.table && isViewableTable(params.table)
    ? params.table
    : null;
  const page = Math.max(1, Number(params.page) || 1);
  const columns = table ? viewableColumns(table) : [];

  // Nur f_<spalte>-Parameter übernehmen, deren Spalte auch wirklich zur
  // aktuell gewählten Tabelle gehört (schützt außerdem davor, dass ein
  // Filter aus einer vorherigen Tabelle nach einem Tabellenwechsel über die
  // URL versehentlich wirksam bleibt).
  const filters: Record<string, string> = {};
  if (table) {
    for (const [key, value] of Object.entries(params)) {
      if (!key.startsWith(FILTER_PARAM_PREFIX) || !value) continue;
      const col = key.slice(FILTER_PARAM_PREFIX.length);
      if (columns.includes(col)) filters[col] = value;
    }
  }

  const sortColumn =
    table && params.sort && columns.includes(params.sort)
      ? params.sort
      : (columns[0] ?? undefined);
  const sortDir: "asc" | "desc" = params.dir === "desc" ? "desc" : "asc";

  const [total, rows] = table
    ? await Promise.all([
        countTableRows(table, filters),
        listTableRows(table, PAGE_SIZE, (page - 1) * PAGE_SIZE, {
          sortColumn,
          sortDir,
          filters,
        }),
      ])
    : [0, []];
  const totalPages = table ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  // Baut eine /admin/db-URL aus dem aktuellen Zustand (Tabelle, Sortierung,
  // aktive Filter) plus overrides — ein Wert von undefined in overrides
  // entfernt den Key (z.B. "page" bei einer Sortier-/Filteränderung, damit
  // die Paginierung automatisch auf Seite 1 zurückspringt).
  function withParams(overrides: Record<string, string | undefined>): string {
    const merged: Record<string, string | undefined> = {
      table: table ?? undefined,
      sort: sortColumn,
      dir: sortDir,
      page: String(page),
      ...Object.fromEntries(
        Object.entries(filters).map(([col, value]) => [
          `${FILTER_PARAM_PREFIX}${col}`,
          value,
        ]),
      ),
      ...overrides,
    };
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined) sp.set(key, value);
    }
    return `/admin/db?${sp.toString()}`;
  }

  return (
    <>
      <PageMeta title="Datenbank" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Datenbank</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">DB-Backup</h2>
            <DbBackupPanel />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Freie SQL-Query (read-only)</h2>
            <p className="text-lcars-text-dim text-[13px]">
              Nur einzelne SELECT-Anweisungen, ausgeführt in einer READ-ONLY-
              Transaktion (kein Zugriff auf die TABLE_COLUMNS-Whitelist der
              Tabellenansicht unten nötig) — max. 500 Zeilen, 5 Sekunden
              Timeout.
            </p>
            <SqlQueryPanel />
          </section>

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Tabelleninhalte (read-only)</h2>
            <nav className="flex flex-wrap gap-[8px]">
              {VIEWABLE_TABLES.map((t) => (
                <Link
                  key={t}
                  href={`/admin/db?table=${t}`}
                  className={
                    t === table
                      ? "lcars-pill-btn--outline lcars-menu-active"
                      : "lcars-pill-btn--outline"
                  }
                >
                  {t}
                </Link>
              ))}
            </nav>

            {table && (
              <div className="flex flex-col gap-[12px]">
                <p className="text-lcars-text-dim text-[13px]">
                  {total} Zeilen — Seite {page}/{totalPages}
                </p>
                <form method="get" action="/admin/db">
                  <input type="hidden" name="table" value={table} />
                  {sortColumn && (
                    <input type="hidden" name="sort" value={sortColumn} />
                  )}
                  <input type="hidden" name="dir" value={sortDir} />
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="text-lcars-amber">
                          {columns.map((c) => {
                            const isActive = c === sortColumn;
                            const nextDir =
                              isActive && sortDir === "asc" ? "desc" : "asc";
                            return (
                              <th
                                key={c}
                                className="pr-[16px] pb-[8px] whitespace-nowrap"
                              >
                                <Link
                                  href={withParams({
                                    sort: c,
                                    dir: nextDir,
                                    page: undefined,
                                  })}
                                  className="lcars-eyebrow lcars-sort-switch-label"
                                >
                                  {c}
                                  {isActive && (
                                    <span
                                      className="lcars-sort-switch-arrow"
                                      style={{
                                        display: "inline-flex",
                                        transform:
                                          sortDir === "desc"
                                            ? "rotate(180deg)"
                                            : undefined,
                                      }}
                                    >
                                      <SortArrowIcon />
                                    </span>
                                  )}
                                </Link>
                              </th>
                            );
                          })}
                        </tr>
                        <tr>
                          {columns.map((c) => {
                            const options = enumOptionsFor(table, c);
                            return (
                              <td key={c} className="pr-[16px] pb-[8px]">
                                {options ? (
                                  <select
                                    name={`${FILTER_PARAM_PREFIX}${c}`}
                                    defaultValue={filters[c] ?? ""}
                                    aria-label={`Nach ${c} filtern`}
                                    className="lcars-input rounded-full w-full text-[12px]"
                                  >
                                    <option value="">Alle</option>
                                    {options.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="search"
                                    name={`${FILTER_PARAM_PREFIX}${c}`}
                                    defaultValue={filters[c] ?? ""}
                                    placeholder="Filtern…"
                                    aria-label={`Nach ${c} filtern`}
                                    className="lcars-input rounded-full w-full text-[12px]"
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </thead>
                      <DbTableRows columns={columns} rows={rows} />
                    </table>
                  </div>
                  <button
                    type="submit"
                    className="lcars-pill-btn--outline mt-[12px]"
                  >
                    Filtern
                  </button>
                </form>
                <div className="flex gap-[16px]">
                  {page > 1 && (
                    <Link
                      href={withParams({ page: String(page - 1) })}
                      className="lcars-link-text text-[14px]"
                    >
                      ← Vorherige
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={withParams({ page: String(page + 1) })}
                      className="lcars-link-text text-[14px]"
                    >
                      Nächste →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </article>
    </>
  );
}
