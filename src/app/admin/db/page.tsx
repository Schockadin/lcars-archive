import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireDbAccess, getCurrentUserPermissions } from "@/lib/dal";
import { getSchemaGraph } from "@/lib/dbInspect";
import DbBackupPanel from "../DbBackupPanel";
import SqlQueryPanel from "./SqlQueryPanel";
import ErDiagram from "./ErDiagram";

export const metadata: Metadata = {
  title: "Datenbank",
  robots: { index: false, follow: false },
};

export const maxDuration = 60;

// DB-Bereich, feingranular nach DB-Rechten aufgebaut (siehe DB_PERMISSIONS /
// requireDbAccess): Zugang hat, wer MINDESTENS eines der DB-Rechte besitzt.
//   - db_backup     → das DB-Backup-Panel (Export/Import R2).
//   - sql_read/_write/_delete → das freie SQL-Panel (Aktion je nach Recht;
//     ohne jedes sql_*-Recht wird das Panel ausgeblendet).
// Statt der früheren Tabellen-Buttons + read-only-Tabellenansicht zeigt der
// Bereich jetzt ein interaktives, graph-basiertes ER-Diagramm (ErDiagram.tsx,
// cytoscape.js), das die Schema-Struktur live aus der DB liest.
export default async function AdminDbPage() {
  await requireDbAccess();
  const perms = await getCurrentUserPermissions();

  const canBackup = perms.has("db_backup");
  const canRead = perms.has("sql_read");
  const canWrite = perms.has("sql_write");
  const canDelete = perms.has("sql_delete");
  const hasAnySql = canRead || canWrite || canDelete;

  const schema = await getSchemaGraph();

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

          {hasAnySql && (
            <section className="flex flex-col gap-[12px]">
              <h2 className="text-lcars-amber">Freie SQL-Query</h2>
              <SqlQueryPanel caps={{ canRead, canWrite, canDelete }} />
            </section>
          )}

          <section className="flex flex-col gap-[12px]">
            <h2 className="text-lcars-amber">Schema (ER-Diagramm)</h2>
            <p className="text-lcars-text-dim text-[13px]">
              Tabellen als Knoten, Fremdschlüssel als Pfeile. Ziehen zum
              Verschieben, Mausrad/Pinch zum Zoomen, Klick auf eine Tabelle
              zeigt ihre Spalten. {schema.tables.length} Tabellen,{" "}
              {schema.edges.length} Beziehungen.
            </p>
            <ErDiagram graph={schema} />
          </section>
        </div>
      </article>
    </>
  );
}
