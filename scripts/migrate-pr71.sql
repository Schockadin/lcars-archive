-- PR #71 — Aus drei Sichtbarkeiten werden zwei Zustände: Entwurf oder
-- veröffentlicht.
--
-- Bis hierher trug jeder Inhalt ZWEI Achsen: visibility
-- ('private' | 'gm' | 'public') und is_draft. Das war eine Achse zu viel —
-- „privat" und „Entwurf" beantworteten dieselbe Frage („wer darf das sehen?")
-- mit zwei Mechaniken, und wer einen Entwurf veröffentlichen wollte, musste
-- ihn im Editor öffnen und dort ein Häkchen entfernen.
--
-- Es bleibt is_draft: false = veröffentlicht (für alle sichtbar, auch ohne
-- Anmeldung), true = Entwurf (nur für die Owner-Person, bei Missionen
-- zusätzlich für die Spielleitung). visibility fällt weg.
--
-- ACHTUNG, DATENVERLUST MIT ABSICHT: Inhalte, die bisher 'private' oder 'gm'
-- waren und KEIN Entwurf sind, werden damit öffentlich. Genau so ist es
-- entschieden worden („alles außer is_draft → veröffentlicht"). Wer einzelne
-- davon verborgen halten will, setzt sie VOR dieser Migration auf is_draft:
--
--   UPDATE characters      SET is_draft = true WHERE visibility <> 'public';
--   UPDATE mission_logs    SET is_draft = true WHERE visibility <> 'public';
--   UPDATE archive_entries SET is_draft = true WHERE visibility <> 'public';

ALTER TABLE characters      DROP COLUMN IF EXISTS visibility;
ALTER TABLE mission_logs    DROP COLUMN IF EXISTS visibility;
ALTER TABLE archive_entries DROP COLUMN IF EXISTS visibility;

-- Der Papierkorb hat die visibility beim Löschen mitgeschrieben — ohne die
-- Spalte gibt es nichts mehr mitzuschreiben. is_draft steht dort ohnehin
-- nicht, der wiederhergestellte Inhalt kommt mit seinem eigenen Stand zurück.
ALTER TABLE content_deletions DROP COLUMN IF EXISTS visibility;

-- Die RAG-Suche filtert ihre Einbettungen mit derselben Logik wie die App
-- (siehe src/lib/embeddings.ts) — auch hier bleibt nur is_draft.
DROP INDEX IF EXISTS idx_content_embeddings_rbac;
ALTER TABLE content_embeddings DROP COLUMN IF EXISTS visibility;
CREATE INDEX IF NOT EXISTS idx_content_embeddings_rbac
  ON content_embeddings(is_active, is_draft);

-- Mit visibility fällt auch das Recht „GM-Inhalte sehen" weg: Es gibt keine
-- gm-sichtbaren Inhalte mehr, nur noch veröffentlicht oder Entwurf.
UPDATE roles SET permissions = array_remove(permissions, 'content.view_gm')
WHERE 'content.view_gm' = ANY(permissions);
