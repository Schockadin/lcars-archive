import "server-only";
import sql from "@/lib/db";
import type { User } from "@/types/db";

export interface UserBackupRecord {
  email: string;
  name: string;
  slug: string;
  role: User["role"];
  is_active: boolean;
  password_hash: string | null;
  requires_activation: boolean;
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  created_at: string;
  last_login_at: string | null;
  previous_login_at: string | null;
  last_visit_at: string | null;
  last_dashboard_visit_at: string | null;
  notify_content_types: string[];
  // Optional: ältere Backups (vor PR #51) kennen dieses Feld noch nicht — beim
  // Restore fällt es dann auf den Default (alle News-Arten) zurück.
  news_kinds?: string[];
}

// Default, wenn ein (älteres) Backup news_kinds nicht enthält.
const DEFAULT_NEWS_KINDS = ["created", "updated", "deleted"];

// Admin-only Vollsicherung aller User-Datensätze inkl. password_hash, damit
// ein Restore (siehe restoreUsersBackup) Konten ohne erzwungenes
// Passwort-Reset wiederherstellen kann. Die exportierte Datei ist entsprechend
// sensibel — Zugriff ist über requireAdmin() in userBackupActions.ts
// abgesichert.
export async function getAllUsersBackup(): Promise<UserBackupRecord[]> {
  return sql<UserBackupRecord[]>`
    SELECT
      email, name, slug, role, is_active, password_hash,
      requires_activation, email_notifications_enabled,
      push_notifications_enabled, created_at, last_login_at, previous_login_at,
      last_visit_at, last_dashboard_visit_at, notify_content_types, news_kinds
    FROM users
    ORDER BY id
  `;
}

export interface RestoreUsersSummary {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

// Import-Gegenstück zu getAllUsersBackup: email als Konfliktschlüssel (unique,
// siehe schema.sql) — legt fehlende User neu an, bestehende werden vollständig
// mit dem Datensatz aus dem Backup überschrieben (kein Feld-Merge, das Backup
// gilt als vollständiger Sollzustand für den jeweiligen User). Einzelne
// fehlerhafte Datensätze (z.B. Slug-Kollision mit einem anderen User) brechen
// den restlichen Import nicht ab, siehe errors.
export async function restoreUsersBackup(
  records: UserBackupRecord[],
): Promise<RestoreUsersSummary> {
  const summary: RestoreUsersSummary = {
    total: records.length,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (const r of records) {
    try {
      const rows = await sql<{ inserted: boolean }[]>`
        INSERT INTO users (
          email, name, slug, role, is_active, password_hash,
          requires_activation, email_notifications_enabled,
          push_notifications_enabled, created_at, last_login_at, previous_login_at,
          last_visit_at, last_dashboard_visit_at, notify_content_types, news_kinds
        ) VALUES (
          ${r.email}, ${r.name}, ${r.slug}, ${r.role}, ${r.is_active}, ${r.password_hash},
          ${r.requires_activation}, ${r.email_notifications_enabled},
          ${r.push_notifications_enabled}, ${r.created_at}, ${r.last_login_at},
          ${r.previous_login_at}, ${r.last_visit_at}, ${r.last_dashboard_visit_at},
          ${r.notify_content_types}, ${r.news_kinds ?? DEFAULT_NEWS_KINDS}
        )
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active,
          password_hash = EXCLUDED.password_hash,
          requires_activation = EXCLUDED.requires_activation,
          email_notifications_enabled = EXCLUDED.email_notifications_enabled,
          push_notifications_enabled = EXCLUDED.push_notifications_enabled,
          last_login_at = EXCLUDED.last_login_at,
          previous_login_at = EXCLUDED.previous_login_at,
          last_visit_at = EXCLUDED.last_visit_at,
          last_dashboard_visit_at = EXCLUDED.last_dashboard_visit_at,
          notify_content_types = EXCLUDED.notify_content_types,
          news_kinds = EXCLUDED.news_kinds
        RETURNING (xmax = 0) AS inserted
      `;
      if (rows[0]?.inserted) {
        summary.created++;
      } else {
        summary.updated++;
      }
    } catch (err) {
      summary.failed++;
      summary.errors.push(
        `${r.email}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return summary;
}
