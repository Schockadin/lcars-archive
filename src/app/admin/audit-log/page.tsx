import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import { listRecentAdminActions } from "@/lib/auditLog";
import { getRecentContentActivity } from "@/lib/contentActivityLog";
import AuditActionsTable from "./AuditActionsTable";
import ContentActivityTable from "./ContentActivityTable";

export const metadata: Metadata = {
  title: "Audit-Log",
  robots: { index: false, follow: false },
};

const CONTENT_ACTIVITY_DAYS = 3;

// Rein lesende Übersicht der letzten sicherheitsrelevanten Admin-Actions auf
// Useraccounts (siehe src/lib/auditLog.ts, Wiring in admin/actions.ts) —
// verlinkt aus der "Admin Actions"-Sektion in /admin (page.tsx). Kein
// Bearbeiten/Löschen einzelner Einträge, das Log ist bewusst append-only.
// Zusätzlich (zweiter Bereich): ein Content-Aktivitätslog der letzten
// CONTENT_ACTIVITY_DAYS Tage (getRecentContentActivity) — anders als die
// Useraccount-Historie oben KEIN append-only-Protokoll, sondern direkt aus
// created_at/updated_at der Inhaltstabellen + content_deletions abgeleitet.
// Beide Tabellen sind sortier-/filterbare Client Components (AuditActionsTable/
// ContentActivityTable, gebaut auf AdminLogTable) — Server Components können
// keine Funktionen (Spalten-Definitionen) an sie übergeben, deshalb bauen die
// Wrapper-Komponenten ihre columns intern, hier kommen nur die reinen Daten an.
export default async function AdminAuditLogPage() {
  await requireAdmin();

  const [entries, contentActivity] = await Promise.all([
    listRecentAdminActions(),
    getRecentContentActivity(CONTENT_ACTIVITY_DAYS),
  ]);

  return (
    <>
      <PageMeta title="Audit-Log" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Audit-Log</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[16px]">
            <h2 className="text-lcars-primary">Sicherheitsrelevante Aktionen</h2>
            <p className="text-lcars-ink-dim text-[13px]">
              Die letzten {entries.length} sicherheitsrelevanten
              Useraccount-Actions (anlegen, Rolle ändern, (de)aktivieren,
              löschen, Passwort-Reset auslösen) — wer hat wann was gemacht.
            </p>
            <AuditActionsTable entries={entries} />
          </section>

          <section className="flex flex-col gap-[16px]">
            <h2 className="text-lcars-primary">
              Content-Aktivität (letzte {CONTENT_ACTIVITY_DAYS} Tage)
            </h2>
            <p className="text-lcars-ink-dim text-[13px]">
              Alle Charaktere, Missionen, Mission-Logs und Datenbank-Einträge, die
              in den letzten {CONTENT_ACTIVITY_DAYS} Tagen hinzugefügt,
              bearbeitet oder gelöscht wurden. „Von“ zeigt den Owner (bzw. bei
              Löschungen die löschende Person) — bearbeitet ein Admin oder eine
              Spielleitung fremden Inhalt, erscheint hier weiterhin der Owner,
              da es keine separate Bearbeiter-Spur gibt.
            </p>
            <ContentActivityTable items={contentActivity} />
          </section>
        </div>
      </article>
    </>
  );
}
