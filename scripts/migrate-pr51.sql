-- Migration für PR #51 (claude/multiple-feature-adjustments → master)
-- Gegen die Produktions-DB (centerbeam) ausführen, nachdem der PR gemergt wurde.
-- Alle Statements sind idempotent (IF NOT EXISTS / IF EXISTS).
--
-- Reihenfolge: neue Spalten auf bestehenden Tabellen zuerst, dann neue Tabellen,
-- dann Constraints/Indizes.

-- ---------------------------------------------------------------------------
-- users: News-Präferenzen
-- ---------------------------------------------------------------------------

-- Welche News-Arten der User auf dem Dashboard sehen will (Neu/Editiert/
-- Gelöscht). Leeres Array = keine News. Default = nur 'created' ("Neu"),
-- siehe NewsSection.tsx / recentActivity.ts.
ALTER TABLE users ADD COLUMN IF NOT EXISTS news_kinds TEXT[] NOT NULL
  DEFAULT '{created}';

-- Hinweis: das Geburtsdatum eines Charakters (Feature „Alter aus Ingame-Jahr
-- ableiten") wird bewusst NICHT als eigene Spalte, sondern in
-- characters.metadata (JSONB) als dateOfBirth abgelegt — analog zum bereits
-- dort liegenden metadata.age. Dafür ist keine Schema-Änderung nötig.

-- ---------------------------------------------------------------------------
-- users: granulares RBAC (mehrere Rollen + individuelle Rechte-Overrides)
-- ---------------------------------------------------------------------------

-- role bleibt die Primär-/Anzeigerolle; additional_roles hält weitere
-- Preset-Rollen. Effektive Rechte = Vereinigung der Presets aller Rollen ⊕
-- permission_overrides (siehe src/lib/permissions.ts).
ALTER TABLE users ADD COLUMN IF NOT EXISTS additional_roles TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permission_overrides JSONB NOT NULL DEFAULT '{}';

-- Verhaltenswahrender Backfill (EINMALIG, nur hier — nicht in schema.sql):
-- Da die neuen Presets orthogonal sind (admin/gm haben allein kein
-- content.create usw.), bekommen Bestandskonten additive Zusatzrollen, damit
-- ihre effektiven Rechte exakt wie vor der Umstellung bleiben. Nur setzen, wo
-- noch nichts hinterlegt ist (idempotent bei erneutem Lauf).
UPDATE users SET additional_roles = '{gm,player}' WHERE role = 'admin'  AND additional_roles = '{}';
UPDATE users SET additional_roles = '{player}'    WHERE role = 'gm'     AND additional_roles = '{}';
UPDATE users SET additional_roles = '{player}'    WHERE role = 'viewer' AND additional_roles = '{}';

-- admin_audit_log: neue Aktionsarten für Rollen-/Rechteänderungen zulassen.
ALTER TABLE admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_action_check;
ALTER TABLE admin_audit_log ADD CONSTRAINT admin_audit_log_action_check
  CHECK (action IN (
    'create_user', 'reset_password', 'update_role', 'update_profile',
    'deactivate_user', 'reactivate_user', 'delete_user', 'force_logout',
    'update_roles', 'update_permissions'
  ));

-- ---------------------------------------------------------------------------
-- Neue Tabellen
-- ---------------------------------------------------------------------------

-- Kampagnen-Einstellungen (Einzeilen-Tabelle) — hält u.a. das aktuelle
-- Ingame-Jahr, das die Spielleitung über /admin/campaign setzt. Der
-- BOOLEAN-Primärschlüssel mit CHECK (id) erzwingt, dass es höchstens eine
-- Zeile gibt.
CREATE TABLE IF NOT EXISTS campaign_settings (
  id          BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  ingame_year INT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gesehene/ausgeblendete News pro User. Ersetzt das frühere „News seit dem
-- letzten Dashboard-Besuch"-Modell durch eine persistente Anzeige: eine News
-- bleibt sichtbar, bis der User sie per X ausblendet ODER den zugehörigen
-- Inhalt aufruft. seen_at ist die Grenze: eine News zu diesem Ziel gilt als
-- erledigt, wenn ihr Zeitstempel <= seen_at ist (eine spätere Bearbeitung mit
-- neuerem Zeitstempel taucht dadurch wieder auf). target_key = Slug bei
-- Inhalten, content_deletions.id (als Text) bei Löschungen (target_type
-- 'deletion').
CREATE TABLE IF NOT EXISTS news_seen (
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_key  TEXT NOT NULL,
  seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, target_type, target_key)
);
CREATE INDEX IF NOT EXISTS idx_news_seen_user ON news_seen(user_id);
