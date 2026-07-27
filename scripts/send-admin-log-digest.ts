// scripts/send-admin-log-digest.ts
//
// Täglicher Log-Digest an alle aktiven Admins (siehe
// .github/workflows/admin-log-digest.yml): fasst alle Error-Log- und
// Admin-Audit-Log-Einträge der letzten 24 Stunden in einer Mail zusammen und
// verschickt sie um 6 Uhr Berliner Zeit.
//
// Läuft per `tsx` außerhalb von Next, braucht daher `--conditions=react-server`
// (siehe backup-db.ts). Rohes SQL über @/lib/db statt der server-only-Helfer
// auditLog.ts/errorLog.ts, damit keine "server-only"-Importkette gezogen wird.
// Der Mailversand nutzt mailCore.ts (bewusst nicht "server-only").
//
// Zeitzone: GitHub-Actions-Cron kennt nur UTC. Der Workflow feuert deshalb um
// 04:00 UND 05:00 UTC; dieses Skript sendet nur, wenn es in Europe/Berlin
// gerade 6 Uhr ist (04:00 UTC = 06:00 im Sommer, 05:00 UTC = 06:00 im Winter)
// — so bleibt der Versand über Sommer-/Winterzeit hinweg zuverlässig um 6 Uhr
// Berliner Zeit. Mit dem Argument `--force` (workflow_dispatch/Test) wird das
// Zeitfenster übersprungen.
import sql from "@/lib/db";
import { sendEmail } from "@/lib/mailCore";
import {
  userPermissions,
  DEFAULT_ROLE_PRESETS,
  type RoleMap,
  type Permission,
} from "@/lib/permissions";

const FORCE = process.argv.includes("--force");

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

function berlinHour(): number {
  return Number(
    new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
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

async function main() {
  if (!FORCE && berlinHour() !== 6) {
    console.log(
      `⏭  Nicht 6 Uhr Berliner Zeit (aktuell ${berlinHour()} Uhr) — übersprungen.`,
    );
    return;
  }

  const [errors, audits, admins] = await Promise.all([
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
    listAdminRecipients(),
  ]);

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
    <p>— Neo Archive</p>
  `;

  const subject = `Neo Archive · Log-Digest (${errors.length} Fehler, ${audits.length} Audit-Einträge)`;

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
