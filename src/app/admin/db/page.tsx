import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireDbAccess, getCurrentUserPermissions } from "@/lib/dal";
import { getVisibleTablesAction } from "./tableExplorerActions";
import DbBackupPanel from "../DbBackupPanel";
import SqlQueryPanel from "./SqlQueryPanel";
import DbTableExplorer from "./DbTableExplorer";

export const metadata: Metadata = {
  title: "Datenbank",
  robots: { index: false, follow: false },
};

export const maxDuration = 60;

export default async function AdminDbPage() {
  await requireDbAccess();
  const perms = await getCurrentUserPermissions();

  const canBackup = perms.has("db_backup");
  const canRead = perms.has("sql_read");
  const canWrite = perms.has("sql_write");
  const canDelete = perms.has("sql_delete");
  const hasAnySql = canRead || canWrite || canDelete;

  // Der Tabellen-Explorer liest Zeilen — nur mit Lese-Recht anzeigen (die
  // Server-Action erzwingt sql_read ohnehin; hier zusätzlich das UI ausblenden).
  const tables = canRead ? await getVisibleTablesAction() : [];

  return (
    <>
      <PageMeta title="Datenbank" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Datenbank</p>
        <h1>Datenbank</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          {canBackup && (
            <section className="flex flex-col gap-[12px]">
              <h2 className="text-lcars-amber">DB-Backup</h2>
              <DbBackupPanel />
            </section>
          )}

          {canRead && (
            <section className="flex flex-col gap-[12px]">
              <h2 className="text-lcars-amber">Tabellen</h2>
              <DbTableExplorer
                tables={tables}
                canEdit={canWrite}
                canDelete={canDelete}
              />
            </section>
          )}

          {hasAnySql && (
            <section className="flex flex-col gap-[12px]">
              <h2 className="text-lcars-amber">Freie SQL-Query</h2>
              <SqlQueryPanel caps={{ canRead, canWrite, canDelete }} />
            </section>
          )}
        </div>
      </article>
    </>
  );
}
