-- Migration für PR #111: DB-Zeilenänderungen im Audit-Log sichern und
-- höchstens einmal pro Änderung zurücksetzen können.
--
-- Vor dem Deploy ausführen:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr111.sql
--
-- Idempotent: bestehende Logeinträge erhalten reverts_audit_id = NULL.

ALTER TABLE admin_audit_log
  ADD COLUMN IF NOT EXISTS reverts_audit_id INT
  REFERENCES admin_audit_log(id) ON DELETE RESTRICT;

ALTER TABLE admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;
ALTER TABLE admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check
  CHECK (action IN (
    'create_user', 'reset_password', 'update_role', 'update_profile',
    'deactivate_user', 'reactivate_user', 'delete_user', 'force_logout',
    'update_roles', 'update_permissions',
    'create_role', 'edit_role', 'delete_role',
    'update_db_row', 'undo_db_row'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_audit_log_reverts_audit_id
  ON admin_audit_log(reverts_audit_id) WHERE reverts_audit_id IS NOT NULL;
