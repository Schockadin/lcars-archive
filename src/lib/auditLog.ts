import "server-only";
import sql from "@/lib/db";

export type AdminAuditAction =
  | "create_user"
  | "reset_password"
  | "update_role"
  | "deactivate_user"
  | "reactivate_user"
  | "delete_user"
  | "force_logout";

export interface AdminAuditLogEntry {
  id: number;
  actorId: number | null;
  actorName: string | null;
  action: AdminAuditAction;
  targetUserId: number | null;
  targetName: string | null;
  details: string | null;
  createdAt: string;
}

// Protokolliert sicherheitsrelevante Useraccount-Actions aus admin/actions.ts
// (anlegen, Rolle ändern, (de)aktivieren, löschen, Passwort-Reset auslösen).
// details ist ein Klartext-Schnappschuss (z.B. "Name <email>" oder
// "alt: gm → neu: admin"), damit ein Eintrag auch nachvollziehbar bleibt,
// wenn der betroffene User später gelöscht wird (target_user_id wird dann
// NULL, siehe scripts/schema.sql).
export async function logAdminAction(
  actorId: number,
  action: AdminAuditAction,
  targetUserId: number | null,
  details?: string,
): Promise<void> {
  await sql`
    INSERT INTO admin_audit_log (actor_id, action, target_user_id, details)
    VALUES (${actorId}, ${action}, ${targetUserId}, ${details ?? null})
  `;
}

export async function listRecentAdminActions(
  limit = 200,
): Promise<AdminAuditLogEntry[]> {
  const rows = await sql<
    {
      id: number;
      actor_id: number | null;
      actor_name: string | null;
      action: AdminAuditAction;
      target_user_id: number | null;
      target_name: string | null;
      details: string | null;
      created_at: string;
    }[]
  >`
    SELECT
      l.id, l.actor_id, actor.name AS actor_name,
      l.action, l.target_user_id, target.name AS target_name,
      l.details, l.created_at
    FROM admin_audit_log l
    LEFT JOIN users actor ON actor.id = l.actor_id
    LEFT JOIN users target ON target.id = l.target_user_id
    ORDER BY l.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    targetUserId: row.target_user_id,
    targetName: row.target_name,
    details: row.details,
    createdAt: row.created_at,
  }));
}
