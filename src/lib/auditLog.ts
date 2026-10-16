import "server-only";
import sql from "@/lib/db";
import {
  parseDbRowAuditDetails,
  summarizeDbRowAuditDetails,
} from "@/lib/dbRowAudit";

export type AdminAuditAction =
  | "create_user"
  | "reset_password"
  | "update_role"
  | "update_profile"
  | "deactivate_user"
  | "reactivate_user"
  | "delete_user"
  | "force_logout"
  | "update_roles"
  | "update_permissions"
  | "create_role"
  | "edit_role"
  | "delete_role"
  | "update_db_row"
  | "undo_db_row";

export interface AdminAuditLogEntry {
  id: number;
  actorId: number | null;
  actorName: string | null;
  action: AdminAuditAction;
  targetUserId: number | null;
  targetName: string | null;
  details: string | null;
  revertedByAuditId: number | null;
  ip: string | null;
  createdAt: string;
}

// Protokolliert sicherheitsrelevante Useraccount-Actions (anlegen, Rolle
// ändern, Profil bearbeiten, (de)aktivieren, löschen, Passwort-Reset
// auslösen, Zwangs-Logout — siehe admin/actions.ts und admin/[id]/edit/
// actions.ts). details ist ein Klartext-Schnappschuss (z.B. "Name <email>"
// oder "alt: gm → neu: admin"), damit ein Eintrag auch nachvollziehbar
// bleibt, wenn der betroffene User später gelöscht wird (target_user_id
// wird dann NULL, siehe scripts/schema.sql). ip stammt aus getClientIp()
// (src/lib/http.ts) — für die forensische Aufarbeitung eines vermuteten
// kompromittierten Admin-Accounts.
export async function logAdminAction(
  actorId: number,
  action: AdminAuditAction,
  targetUserId: number | null,
  details?: string,
  ip?: string | null,
): Promise<void> {
  await sql`
    INSERT INTO admin_audit_log (actor_id, action, target_user_id, details, ip)
    VALUES (${actorId}, ${action}, ${targetUserId}, ${details ?? null}, ${ip ?? null})
  `;
}

export async function listRecentAdminActions(
  limit = 200,
  before?: { createdAt: string; id: number },
): Promise<AdminAuditLogEntry[]> {
  const where = before
    ? "WHERE (l.created_at, l.id) < ($1::timestamptz, $2::int)"
    : "";
  const limitIndex = before ? 3 : 1;
  const params = before ? [before.createdAt, before.id, limit] : [limit];
  const query = `
    SELECT
      l.id, l.actor_id, actor.name AS actor_name,
      l.action, l.target_user_id, target.name AS target_name,
      l.details, reversal.id AS reverted_by_audit_id, l.ip,
      l.created_at::text AS created_at
    FROM admin_audit_log l
    LEFT JOIN users actor ON actor.id = l.actor_id
    LEFT JOIN users target ON target.id = l.target_user_id
    LEFT JOIN admin_audit_log reversal ON reversal.reverts_audit_id = l.id
    ${where}
    ORDER BY l.created_at DESC, l.id DESC
    LIMIT $${limitIndex}
  `;
  const rows = await sql.unsafe<
    {
      id: number;
      actor_id: number | null;
      actor_name: string | null;
      action: AdminAuditAction;
      target_user_id: number | null;
      target_name: string | null;
      details: string | null;
      reverted_by_audit_id: number | null;
      ip: string | null;
      created_at: string;
    }[]
  >(query, params as never[]);
  return rows.map((row) => {
    const dbRowDetails =
      row.action === "update_db_row" || row.action === "undo_db_row"
        ? parseDbRowAuditDetails(row.details)
        : null;
    return {
      id: row.id,
      actorId: row.actor_id,
      actorName: row.actor_name,
      action: row.action,
      targetUserId: row.target_user_id,
      targetName: row.target_name,
      details:
        row.action === "update_db_row" || row.action === "undo_db_row"
          ? dbRowDetails
            ? summarizeDbRowAuditDetails(dbRowDetails)
            : "Änderungsdetails nicht lesbar."
          : row.details,
      revertedByAuditId: row.reverted_by_audit_id,
      ip: row.ip,
      createdAt: row.created_at,
    };
  });
}
