// scripts/send-admin-log-digest.ts
//
// Täglicher Log-Digest an alle aktiven Admins (siehe
// .github/workflows/admin-log-digest.yml): fasst alle Error-Log-,
// Admin-Audit-Log- und Inhalts-Aktivitäts-Einträge der letzten 24 Stunden in
// einer Mail zusammen. Der Workflow feuert einmal täglich um 05:00 UTC; das
// Skript sendet bei jedem Lauf (kein eigener Uhrzeit-/Zeitzonen-Check mehr).
//
// Läuft per `tsx` außerhalb von Next, braucht daher `--conditions=react-server`
// (siehe backup-db.ts). Rohes SQL über @/lib/db statt der server-only-Helfer
// auditLog.ts/errorLog.ts/contentActivityLog.ts, damit keine
// "server-only"-Importkette gezogen wird. Der Mailversand nutzt mailCore.ts
// (bewusst nicht "server-only").
import sql from "@/lib/db";
import { sendEmail } from "@/lib/mailCore";
import {
  userPermissions,
  DEFAULT_ROLE_PRESETS,
  type RoleMap,
  type Permission,
} from "@/lib/permissions";

// „Admin" = hat das Recht admin.access (granulares RBAC), nicht mehr nur die
// Primärrolle role='admin'. Bewusst rohes SQL + die REINE permissions.ts-Logik
// (kein Import von users.ts/roles.ts) — dieses Skript läuft außerhalb von Next
// und vermeidet gezielt die "server-only"/next-cache-Importkette (siehe
// Datei-Kopf). Bei fehlender roles-Tabelle greifen die Code-Defaults.
async function listAdminRecipients(): Promise<{ email: string; name: string }[]> {
  let roleMap: RoleMap = { ...DEFAULT_ROLE_PRESETS };
  try {
    const roleRows = await sql<{ key: string; permissions: string[] }[]>`
      SELECT key, permissions FROM roles
    `;
    for (const r of roleRows) roleMap[r.key] = r.permissions as Permission[];
  } catch {
    roleMap = { ...DEFAULT_ROLE_PRESETS };
  }
  const users = await sql<
    {
      email: string;
      name: string;
      role: string;
      additional_roles: string[];
      permission_overrides: Record<string, boolean>;
    }[]
  >`
    SELECT email, name, role, additional_roles, permission_overrides
    FROM users WHERE is_active = true
  `;
  return users
    .filter((u) => userPermissions(u, roleMap).has("admin.access"))
    .map((u) => ({ email: u.email, name: u.name }));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmt(ts: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(ts));
}

interface ErrorRow {
  id: number;
  message: string;
  route_path: string | null;
  route_type: string | null;
  method: string | null;
  created_at: string;
}

interface AuditRow {
  id: number;
  action: string;
  details: string | null;
  ip: string | null;
  created_at: string;
  actor_name: string | null;
  target_name: string | null;
}

// Rohzeile der vier Inhaltstabellen, vereinheitlicht per UNION — dieselbe
// Struktur wie getRecentContentActivity in src/lib/contentActivityLog.ts, hier
// aber inline (ohne server-only-Import, siehe Datei-Kopf) und fest auf 24h.
interface ContentRow {
  target_type: "character" | "mission" | "mission_log" | "archive_entry";
  title: string;
  actor_name: string | null;
  created_at: string;
  updated_at: string;
}

interface ContentDeletionRow {
  target_type: string;
  title: string;
  deleted_at: string;
  deleted_by_name: string | null;
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  character: "Charakter",
  mission: "Mission",
  mission_log: "Mission-Log",
  archive_entry: "Archiv-Eintrag",
};

const CONTENT_KIND_LABELS: Record<string, string> = {
  created: "neu",
  updated: "bearbeitet",
  deleted: "gelöscht",
};

async function main() {
  const [errors, audits, contentRows, contentDeletions, admins] =
    await Promise.all([
      sql<ErrorRow[]>`
      SELECT id, message, route_path, route_type, method, created_at::text AS created_at
      FROM error_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
    `,
      sql<AuditRow[]>`
      SELECT al.id, al.action, al.details, al.ip, al.created_at::text AS created_at,
             actor.name AS actor_name, target.name AS target_name
      FROM admin_audit_log al
      LEFT JOIN users actor  ON actor.id  = al.actor_id
      LEFT JOIN users target ON target.id = al.target_user_id
      WHERE al.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY al.created_at DESC
    `,
      sql<ContentRow[]>`
      SELECT 'character'::text AS target_type, c.name AS title, pu.name AS actor_name,
             c.created_at::text AS created_at, c.updated_at::text AS updated_at
      FROM characters c
      LEFT JOIN users pu ON pu.id = c.player_id
      WHERE (c.created_at > NOW() - INTERVAL '24 hours' OR c.updated_at > NOW() - INTERVAL '24 hours')
        AND c.is_draft = false AND c.deleted_at IS NULL
      UNION ALL
      SELECT 'mission'::text, m.title, ou.name,
             m.created_at::text, m.updated_at::text
      FROM missions m
      LEFT JOIN users ou ON ou.id = m.owner_user_id
      WHERE (m.created_at > NOW() - INTERVAL '24 hours' OR m.updated_at > NOW() - INTERVAL '24 hours')
        AND m.is_draft = false AND m.deleted_at IS NULL
      UNION ALL
      SELECT 'mission_log'::text, ml.title, ou.name,
             ml.created_at::text, ml.updated_at::text
      FROM mission_logs ml
      LEFT JOIN users ou ON ou.id = ml.owner_user_id
      WHERE (ml.created_at > NOW() - INTERVAL '24 hours' OR ml.updated_at > NOW() - INTERVAL '24 hours')
        AND ml.is_draft = false AND ml.deleted_at IS NULL
      UNION ALL
      SELECT 'archive_entry'::text, a.title, au.name,
             a.created_at::text, a.updated_at::text
      FROM archive_entries a
      LEFT JOIN users au ON au.id = a.owner_user_id
      WHERE (a.created_at > NOW() - INTERVAL '24 hours' OR a.updated_at > NOW() - INTERVAL '24 hours')
        AND (a.category != 'dialogue' OR a.dialogue_open = FALSE)
        AND a.is_draft = false AND a.deleted_at IS NULL
    `,
      sql<ContentDeletionRow[]>`
      SELECT cd.target_type, cd.title, cd.deleted_at::text AS deleted_at,
             du.name AS deleted_by_name
      FROM content_deletions cd
      LEFT JOIN users du ON du.id = cd.deleted_by
      WHERE cd.deleted_at > NOW() - INTERVAL '24 hours'
    `,
      listAdminRecipients(),
    ]);

  // Content-Rohzeilen zu neu/bearbeitet/gelöscht-Einträgen verdichten (analog
  // getRecentContentActivity): created_at innerhalb 24h ⇒ „neu", sonst
  // „bearbeitet"; Löschungen kommen aus content_deletions.
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const contentItems = [
    ...contentRows.map((r) => {
      const isNew = new Date(r.created_at).getTime() > cutoff;
      return {
        kind: isNew ? "created" : "updated",
        target_type: r.target_type as string,
        title: r.title,
        actor_name: r.actor_name,
        timestamp: isNew ? r.created_at : r.updated_at,
      };
    }),
    ...contentDeletions.map((d) => ({
      kind: "deleted",
      target_type: d.target_type,
      title: d.title,
      actor_name: d.deleted_by_name,
      timestamp: d.deleted_at,
    })),
  ].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  if (admins.length === 0) {
    console.log("⚠️  Keine aktiven Admins — nichts zu versenden.");
    return;
  }

  const errorRows = errors
    .map(
      (e) =>
        `<tr><td>${fmt(e.created_at)}</td><td>${escapeHtml(
          e.route_type ?? "—",
        )}${e.route_path ? " " + escapeHtml(e.route_path) : ""}</td><td>${escapeHtml(
          e.message,
        )}</td></tr>`,
    )
    .join("\n");

  const auditRows = audits
    .map(
      (a) =>
        `<tr><td>${fmt(a.created_at)}</td><td>${escapeHtml(a.action)}</td><td>${escapeHtml(
          a.actor_name ?? "—",
        )} → ${escapeHtml(a.target_name ?? "—")}</td><td>${escapeHtml(
          a.details ?? "",
        )}</td></tr>`,
    )
    .join("\n");

  const contentRowsHtml = contentItems
    .map(
      (c) =>
        `<tr><td>${fmt(c.timestamp)}</td><td>${escapeHtml(
          CONTENT_TYPE_LABELS[c.target_type] ?? c.target_type,
        )}</td><td>${escapeHtml(
          CONTENT_KIND_LABELS[c.kind] ?? c.kind,
        )}</td><td>${escapeHtml(c.title)}</td><td>${escapeHtml(
          c.actor_name ?? "—",
        )}</td></tr>`,
    )
    .join("\n");

  const html = `
    <p>Hallo,</p>
    <p>Log-Übersicht der letzten 24 Stunden (Neo Archive):</p>
    <h3>Fehler-Log (${errors.length})</h3>
    ${
      errors.length === 0
        ? "<p>Keine Fehler in den letzten 24 Stunden.</p>"
        : `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
            <thead><tr><th>Zeit</th><th>Route</th><th>Meldung</th></tr></thead>
            <tbody>${errorRows}</tbody>
          </table>`
    }
    <h3>Audit-Log (${audits.length})</h3>
    ${
      audits.length === 0
        ? "<p>Keine Audit-Einträge in den letzten 24 Stunden.</p>"
        : `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
            <thead><tr><th>Zeit</th><th>Aktion</th><th>Akteur → Ziel</th><th>Details</th></tr></thead>
            <tbody>${auditRows}</tbody>
          </table>`
    }
    <h3>Inhalts-Aktivität (${contentItems.length})</h3>
    ${
      contentItems.length === 0
        ? "<p>Keine Inhalts-Änderungen in den letzten 24 Stunden.</p>"
        : `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
            <thead><tr><th>Zeit</th><th>Typ</th><th>Änderung</th><th>Titel</th><th>Person</th></tr></thead>
            <tbody>${contentRowsHtml}</tbody>
          </table>`
    }
    <p>— Neo Archive</p>
  `;

  const subject = `Neo Archive · Log-Digest (${errors.length} Fehler, ${audits.length} Audit-Einträge, ${contentItems.length} Inhalts-Änderungen)`;

  let sent = 0;
  for (const admin of admins) {
    const result = await sendEmail({ to: admin.email, subject, html });
    if (result.sent) {
      sent += 1;
    } else {
      console.error(`✗ Mail an ${admin.email} fehlgeschlagen: ${result.error}`);
    }
  }
  console.log(`✓ Log-Digest an ${sent}/${admins.length} Admins verschickt.`);
}

main()
  .catch((error) => {
    console.error("✗ Log-Digest fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
