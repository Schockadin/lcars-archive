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
-- Gelöscht). Leeres Array = keine News. Default = alle drei (bisheriges
-- Verhalten, "alles"), siehe NewsSection.tsx / recentActivity.ts.
ALTER TABLE users ADD COLUMN IF NOT EXISTS news_kinds TEXT[] NOT NULL
  DEFAULT '{created,updated,deleted}';

-- Hinweis: das Geburtsdatum eines Charakters (Feature „Alter aus Ingame-Jahr
-- ableiten") wird bewusst NICHT als eigene Spalte, sondern in
-- characters.metadata (JSONB) als dateOfBirth abgelegt — analog zum bereits
-- dort liegenden metadata.age. Dafür ist keine Schema-Änderung nötig.

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
