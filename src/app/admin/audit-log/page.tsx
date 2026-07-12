import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import { listRecentAdminActions, type AdminAuditAction } from "@/lib/auditLog";
import { formatDateTime } from "@/utils/formateISODate";

export const metadata: Metadata = {
  title: "Audit-Log",
  robots: { index: false, follow: false },
};

const ACTION_LABELS: Record<AdminAuditAction, string> = {
  create_user: "User angelegt",
  reset_password: "Passwort-Reset ausgelöst",
  update_role: "Rolle geändert",
  deactivate_user: "User deaktiviert",
  reactivate_user: "User reaktiviert",
  delete_user: "User gelöscht",
};

// Rein lesende Übersicht der letzten sicherheitsrelevanten Admin-Actions auf
// Useraccounts (siehe src/lib/auditLog.ts, Wiring in admin/actions.ts) —
// verlinkt aus der "Admin Actions"-Sektion in /admin (page.tsx). Kein
// Bearbeiten/Löschen einzelner Einträge, das Log ist bewusst append-only.
export default async function AdminAuditLogPage() {
  await requireAdmin();

  const entries = await listRecentAdminActions();

  return (
    <>
      <PageMeta title="Audit-Log" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Audit-Log</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-text-dim text-[13px]">
            Die letzten {entries.length} sicherheitsrelevanten
            Useraccount-Actions (anlegen, Rolle ändern, (de)aktivieren,
            löschen, Passwort-Reset auslösen) — wer hat wann was gemacht.
          </p>

          {entries.length === 0 ? (
            <p className="text-lcars-text-dim">Noch keine Einträge.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-lcars-amber">
                    <th className="pr-[16px] pb-[8px]">Zeitpunkt</th>
                    <th className="pr-[16px] pb-[8px]">Von</th>
                    <th className="pr-[16px] pb-[8px]">Aktion</th>
                    <th className="pb-[8px]">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-t border-lcars-border">
                      <td className="py-[6px] pr-[16px] whitespace-nowrap">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="py-[6px] pr-[16px] whitespace-nowrap">
                        {entry.actorName ?? "—"}
                      </td>
                      <td className="py-[6px] pr-[16px] whitespace-nowrap">
                        {ACTION_LABELS[entry.action]}
                      </td>
                      <td className="py-[6px] text-lcars-text-dim">
                        {entry.details ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </article>
    </>
  );
}
