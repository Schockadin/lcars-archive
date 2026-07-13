import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import {
  VIEWABLE_TABLES,
  isViewableTable,
  viewableColumns,
  countTableRows,
  listTableRows,
} from "@/lib/dbInspect";
import { formatDateTime } from "@/utils/formateISODate";
import DbBackupPanel from "../DbBackupPanel";

export const metadata: Metadata = {
  title: "Datenbank",
  robots: { index: false, follow: false },
};

export const maxDuration = 60;

const PAGE_SIZE = 50;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Admin-only: DB-Backup (Export/Import aller Tabellen außer users) + neuer
// read-only Tabellen-Viewer, gesteuert über ?table=&page= (kein Client-JS
// nötig, gleiches Muster wie /search bzw. /archive). Der Viewer zeigt nur
// die Whitelist aus src/lib/dbInspect.ts (= dieselbe wie beim Backup, aber
// ohne password_setup_tokens) und immer nur die dort gelisteten Spalten.
export default async function AdminDbPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const table = params.table && isViewableTable(params.table)
    ? params.table
    : null;
  const page = Math.max(1, Number(params.page) || 1);

  const [total, rows] = table
    ? await Promise.all([
        countTableRows(table),
        listTableRows(table, PAGE_SIZE, (page - 1) * PAGE_SIZE),
      ])
    : [0, []];
  const columns = table ? viewableColumns(table) : [];
  const totalPages = table ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

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
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="text-lcars-amber">
                        {columns.map((c) => (
                          <th key={c} className="pr-[16px] pb-[8px] whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className="border-t border-lcars-border">
                          {columns.map((c) => (
                            <td
                              key={c}
                              className="py-[6px] pr-[16px] whitespace-nowrap text-lcars-text-dim"
                            >
                              {formatCell(row[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-[16px]">
                  {page > 1 && (
                    <Link
                      href={`/admin/db?table=${table}&page=${page - 1}`}
                      className="lcars-link-text text-[14px]"
                    >
                      ← Vorherige
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/admin/db?table=${table}&page=${page + 1}`}
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
