-- Migration für PR #70 (claude/dialogues-characters-design-5n5o63 → master)
--
-- WICHTIG: Gegen die Datenbank ausführen, BEVOR der Stand ausgeliefert wird —
-- die Deploy-Preview hängt an derselben Datenbank wie die Produktion. Fehlt
-- die erweiterte Prüfbedingung, scheitert das Zurücksetzen einer Erschaffung
-- mit „violates check constraint character_ap_entries_reason_check".
--
-- Dieser PR gibt der Spielleitung die Möglichkeit, eine abgeschlossene
-- Erschaffung wieder zu öffnen. Die Steigerungen, die seit dem Abschluss
-- gebucht wurden, werden dabei zurückgenommen (Werte zurück auf den Stand der
-- Erschaffung, AP zurück aufs Konto) und am Charakter notiert, damit sie beim
-- erneuten Abschließen automatisch wieder angewandt werden.
--
-- Schemaseitig braucht das genau eine Änderung: einen neuen Buchungsgrund
-- 'reset' im AP-Journal. Die Notiz selbst liegt in
-- characters.metadata.stats.pendingAdvancements (jsonb) — dieselbe Spalte wie
-- die übrigen Werte, daher ohne eigene Tabelle.
--
-- Identisch zum entsprechenden Abschnitt in scripts/schema.sql.
--
-- Idempotent: die Bedingung wird gelöscht und neu angelegt; mehrfaches
-- Ausführen führt zum selben Ergebnis.

ALTER TABLE character_ap_entries
  DROP CONSTRAINT IF EXISTS character_ap_entries_reason_check;

ALTER TABLE character_ap_entries
  ADD CONSTRAINT character_ap_entries_reason_check
  CHECK (reason IN ('session', 'logbook', 'bonus', 'mission', 'manual',
                    'advancement', 'creation', 'reset'));
