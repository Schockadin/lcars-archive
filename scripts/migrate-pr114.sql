-- Migration für PR #114: kampagnenweite Technomage-Spellslot-Regeln.
--
-- Vor dem Deploy ausführen:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr114.sql
--
-- Idempotent; NULL aktiviert die Standardwerte aus
-- src/lib/technomageSpellSlotRules.ts.
ALTER TABLE campaign_settings
  ADD COLUMN IF NOT EXISTS technomage_spell_rules JSONB;
