import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import { listRecentAdminActions, type AdminAuditAction } from "@/lib/auditLog";
import {
  getRecentContentActivity,
  type ContentActivityItem,
} from "@/lib/contentActivityLog";
import { formatDateTime } from "@/utils/formateISODate";
import type { TimelineSourceType } from "@/types/timeline";

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
  force_logout: "User abgemeldet (alle Geräte)",
};

const TARGET_TYPE_LABELS: Record<TimelineSourceType, string> = {
  character: "Charakter",
  mission: "Mission",
  mission_log: "Mission-Log",
  archive_entry: "Archiv-Eintrag",
};

const KIND_LABELS: Record<ContentActivityItem["kind"], string> = {
  created: "Hinzugefügt",
  updated: "Bearbeitet",
  deleted: "Gelöscht",
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
export default async function AdminAuditLogPage() {
  await requireAdmin();

  const [entries, contentActivity] = await Promise.all([
    listRecentAdminActions(),
    getRecentContentActivity(CONTENT_ACTIVITY_DAYS),
  ]);

  return (
    <>
      <PageMeta title="Audit-Log" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Audit-Log</h1>

        <div className="lcars-text flex flex-col gap-[32px]">
          <section className="flex flex-col gap-[16px]">
            <h2 className="text-lcars-amber">Sicherheitsrelevante Aktionen</h2>
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
                      <th className="pr-[16px] pb-[8px] whitespace-nowrap">
                        Zeitpunkt
                      </th>
                      <th className="pr-[16px] pb-[8px] whitespace-nowrap">
                        Von
                      </th>
                      <th className="pr-[16px] pb-[8px] whitespace-nowrap">
                        Aktion
                      </th>
                      <th className="pb-[8px] whitespace-nowrap">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-t border-lcars-border"
                      >
                        <td className="py-[6px] pr-[16px] whitespace-nowrap">
                          {formatDateTime(entry.createdAt)}
                        </td>
                        <td className="py-[6px] pr-[16px] whitespace-nowrap">
                          {entry.actorName ?? "—"}
                        </td>
                        <td className="py-[6px] pr-[16px] whitespace-nowrap">
                          {ACTION_LABELS[entry.action]}
                        </td>
                        <td className="py-[6px] text-lcars-text">
                          {entry.details ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-[16px]">
            <h2 className="text-lcars-amber">
              Content-Aktivität (letzte {CONTENT_ACTIVITY_DAYS} Tage)
            </h2>
            <p className="text-lcars-text-dim text-[13px]">
              Alle Charaktere, Missionen, Mission-Logs und Archiv-Einträge,
              die in den letzten {CONTENT_ACTIVITY_DAYS} Tagen hinzugefügt,
              bearbeitet oder gelöscht wurden. „Von“ zeigt den Owner
              (bzw. bei Löschungen die löschende Person) — bearbeitet ein
              Admin oder eine Spielleitung fremden Inhalt, erscheint hier
              weiterhin der Owner, da es keine separate Bearbeiter-Spur gibt.
            </p>

            {contentActivity.length === 0 ? (
              <p className="text-lcars-text-dim">Keine Einträge.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="text-lcars-amber">
                      <th className="pr-[16px] pb-[8px] whitespace-nowrap">
                        Zeitpunkt
                      </th>
                      <th className="pr-[16px] pb-[8px] whitespace-nowrap">
                        Von
                      </th>
                      <th className="pr-[16px] pb-[8px] whitespace-nowrap">
                        Aktion
                      </th>
                      <th className="pr-[16px] pb-[8px] whitespace-nowrap">
                        Typ
                      </th>
                      <th className="pb-[8px] whitespace-nowrap">Titel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentActivity.map((item, i) => (
                      <tr key={i} className="border-t border-lcars-border">
                        <td className="py-[6px] pr-[16px] whitespace-nowrap">
                          {formatDateTime(item.timestamp)}
                        </td>
                        <td className="py-[6px] pr-[16px] whitespace-nowrap">
                          {item.actorName ?? "—"}
                        </td>
                        <td className="py-[6px] pr-[16px] whitespace-nowrap">
                          {KIND_LABELS[item.kind]}
                        </td>
                        <td className="py-[6px] pr-[16px] whitespace-nowrap">
                          {TARGET_TYPE_LABELS[item.targetType]}
                        </td>
                        <td className="py-[6px] text-lcars-text">
                          {item.href ? (
                            <Link href={item.href} className="lcars-link-text">
                              {item.title}
                            </Link>
                          ) : (
                            item.title
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </article>
    </>
  );
}
