# Strategie: User-Content-Erstellung über die Web-App

Status: Der ursprüngliche Vault-Roundtrip (App → Vault-Commit → Ingest → DB)
aus diesem Dokument wurde durch das DB-Source-of-Truth-Modell abgelöst
(siehe unten). Die Vault-Anbindung der App selbst (Export/Backup DB → Vault,
API-Endpoint, Admin-Panel-Buttons) wurde inzwischen vollständig entfernt —
`src/lib/githubVault.ts`, `src/lib/vaultExport.ts`, `src/lib/vaultIngest.ts`
und die zugehörigen Admin-Panels existieren nicht mehr. Die Ingest-Skripte
(`scripts/ingest/*`, Vault → DB, siehe unten) bleiben davon unberührt
bestehen. Der historische Abschnitt "Warum ein Vault-Roundtrip und nicht
DB-direkt?" ist nur noch als Kontext für die getroffene Design-Entscheidung
erhalten.

## Aktueller Stand: DB ist alleinige Source of Truth

Alle Server Actions, die Inhalte anlegen oder bearbeiten (Missionen,
Mission-Logs, Mission-Synopsis, Charaktere, Archiv-Einträge), schreiben
ausschließlich in die Datenbank — kein Vault-Commit an irgendeiner Stelle
mehr.

Statt eines aus der DB generierten Vault-Backups gibt es ein
**vollständiges DB-Backup**: `src/lib/dbBackup.ts` (`exportDatabaseBackup`/
`importDatabaseBackup`, Admin-Panel `/users` → "Admin Actions" →
"DB-Backup", `DbBackupPanel.tsx`) exportiert/importiert nahezu den
kompletten Inhalt aller Tabellen (nicht nur die vier Content-Typen des
früheren Vault-Exports) als eine JSON-Datei — bewusst OHNE `users`, das läuft
über sein eigenes paralleles Backup (`UserBackupPanel.tsx`/`lib/userBackup.ts`,
Upsert per E-Mail statt vollem Replace). Der DB-Backup-Import ist ein voller
Restore der übrigen Tabellen — er leert sie vorher und spielt die Datei 1:1
wieder ein, kein Merge mit dem aktuellen Stand.

Die Ingest-Skripte (`scripts/ingest/*`) bleiben als Weg für den
ursprünglichen/historischen Import aus einem Markdown-Vault unverändert
bestehen, sind aber nicht der reguläre Schreibpfad für App-Inhalte.

## Historisch: Warum ein Vault-Roundtrip und nicht DB-direkt?

Diese Begründung galt für das ursprüngliche (inzwischen abgelöste) Modell:

- Versionierung/Rollback der Inhalte (Markdown in Git).
- Ein einziger Ingest-Codepfad für Vault- und App-Inhalte, statt einer
  zweiten parallelen Schreib-Logik direkt auf die Tabellen.
- Bestehende Dialoge lassen sich in beide Richtungen konvertieren (siehe
  Feature 4 unten) — Grundlage für "Website-Dialog ↔ Vault-Markdown".

## Vault-Backend: GitHub-Repo

Von den drei angebotenen Optionen (GitHub-Repo, Google Drive, OneDrive) fällt
die Wahl auf ein **GitHub-Repo als Vault**, weil es der einzige Kandidat ist,
der einen vollautomatischen Trigger für den bestehenden `db:ingest`-Codepfad
erlaubt (siehe unten) und gleichzeitig Versionierung/Diff/Rollback der
Markdown-Inhalte mitbringt.

### Historisch: Schreibpfad (App → Vault)

Nie über den hier beschriebenen Plan hinaus umgesetzt und inzwischen
gegenstandslos: Die App hat nie bei jeder Content-Aktion einzeln committet
(das wurde vom DB-Source-of-Truth-Modell oben abgelöst, bevor es fertig
gebaut war), und der spätere Ersatz — ein aus der DB generiertes
Vault-Backup — wurde seinerseits komplett entfernt (siehe Status oben).
Es gibt aktuell **keinen** Schreibpfad App → Vault mehr, weder pro Aktion
noch als Backup.

1. Server Action sammelt Formulardaten (Titel, Kategorie/Typ-spezifische
   Felder, Body-Markdown) und baut daraus:
   - einen **Slug** via `slugifyBase` (`src/lib/slug.ts`) + Kollisionsprüfung
     (Muster: `generateUniqueDialogueSlug` in `src/lib/dialoguesCore.ts`,
     `generateUniqueUserSlug` in `src/lib/users.ts`),
   - ein **Frontmatter-Objekt** passend zum Ziel-Typ (siehe Pflichtfelder in
     `scripts/ingest/{characters,missions,missionLogs,archive}.ts` bzw. die
     Tabelle in README.md „Inhaltsmodell“), **inklusive `owner: <user-slug>`**
     (aus `getSession()` → `users.slug`, siehe `scripts/ingest/shared.ts`
     `resolveOwner` aus diesem PR) — der Owner ist damit von Anfang an
     gesetzt, nicht nachträglich zu erschließen.
2. Die Server Action committet die Datei über die **GitHub Contents-API**
   (`create_or_update_file`, ein Commit pro neuem Inhalt) in den passenden
   Vault-Ordner:
   - Charaktere → `Charaktere/<slug>.md`
   - Missionslogs → `Missionen/<mission-slug>/<slug>.md`
   - Archiveinträge (inkl. Dialoge) → `Archiv/<kategorie-ordner>/<slug>.md`
3. Auth: ein serverseitiges GitHub-App-Token oder Fine-grained PAT mit
   Schreibrecht **nur** auf das Vault-Repo, als Env-Var/Secret — niemals im
   Client-Bundle.

### Ingest-Trigger (Vault → DB)

Die Ingest-Skripte laufen laut README bewusst **nie auf Netlify** (die
deployte App ist serverless mit ephemerem Dateisystem, hat also weder
dauerhaften Zugriff auf einen lokalen `VAULT_PATH` noch auf `psql`-taugliche
Direktverbindungen zur Build-Zeit). Der Trigger muss daher außerhalb der
Netlify-Funktion laufen:

- Eine **GitHub Action** im Vault-Repo, getriggert `on: push`, checkt das Repo
  aus, setzt `VAULT_PATH` auf den Checkout-Pfad und führt
  `npm run db:ingest:new` aus (Secret `DATABASE_URL`/`DIRECT_DATABASE_URL`).
  `db:ingest:new` (`ON CONFLICT DO NOTHING`, siehe `scripts/ingest/ingestNew.ts`)
  ist hier bewusst richtig: neue Dateien kommen rein, nichts Bestehendes wird
  versehentlich überschrieben.
- Nach dem Ingest pingt der Workflow `POST /api/revalidate` (Secret
  `REVALIDATE_SECRET`) — identisch zum bestehenden lokalen Ingest-Ablauf
  (`scripts/ingest/index.ts`).
- **Edits** an bereits importierten Inhalten (z.B. GM korrigiert einen Log)
  laufen weiterhin nur über den vollen, manuell angestoßenen `db:ingest` —
  das ändert dieser Vault-Roundtrip nicht.

### Frontmatter je Typ (Kurzreferenz)

Siehe README „Inhaltsmodell“ für die vollständigen Beispiele; Pflichtfelder
zur Erinnerung:

| Typ | Pflichtfelder | Slug |
|---|---|---|
| Charakter | `type: character`, `slug`, `name` | von der App vorgeschlagen |
| Archiveintrag/Dialog | `type: archive`, `slug`, `title`, `category` | von der App vorgeschlagen |
| Missionslog | `type: mission-log`, `title`, `mission`, `author`, `session_nr` | generiert: `<author>-<mission>-<session_nr>` |

`owner` ist bei allen dreien optional im Ingest (fehlt es, bleibt der Inhalt
ownerlos), aber die App setzt es beim Schreiben immer auf den anlegenden
User.

## Feature 4: `<!-- Participant: [character-slug] -->`-Marker

Ergänzt den Vault-Roundtrip um eine strukturierte Sprecher-Markierung für
Dialoge, damit Vault-Dialoge dieselbe Pro-Sprecher-Darstellung bekommen wie
In-App-Dialoge (`DialogueThread`, farbcodiert nach
`metadata.participants[].slug`).

### Format

```markdown
<!-- Participant: lorzan-keen -->
Lorzan, hast du einen Moment?

<!-- Participant: desmond-helben -->
Natürlich, was gibt's?
```

Jeder Marker gilt bis zum nächsten Marker (oder Dateiende) und weist den
Text-Abschnitt dazwischen dem genannten Charakter-Slug zu.

### Parsing/Rendering (Ingest-Seite)

- Neuer, exportierter Regex in `src/lib/markdown.ts` nach dem Vorbild von
  `TIMELINE_MARKER_RE`:
  `PARTICIPANT_MARKER_RE = /<!--\s*Participant\s*:\s*([a-z0-9-]+)\s*-->/gs`
  — geteilt zwischen Ingest und Renderer, damit beide dieselbe Segment-
  Reihenfolge sehen (exakt das bestehende Timeline-Marker-Prinzip).
- In `scripts/ingest/archive.ts` (Kategorie `dialogue`): der Markdown-Body
  wird an den Markern gesplittet; jedes Segment erzeugt eine
  `dialogue_messages`-Zeile mit `character_id` aufgelöst über
  `metadata.participants[].slug` (derselbe Auflösungs-Mechanismus wie für
  `participants` im Frontmatter, siehe `resolveRef` in `archive.ts`).
  `content` = `markdownToHtml(segment)`, `source_md` = rohes Segment,
  `author_user_id` = `characters.player_id` des jeweiligen Sprechers (falls
  gesetzt) — analog zum In-App-Insert in `createDialogue`.
  Enthält der Body **keine** Marker, bleibt das heutige Verhalten
  unverändert (ein `content`-Blob, kein `dialogue_messages`-Eintrag) —
  vollständig rückwärtskompatibel zu bestehenden Vault-Dialogen.
- Rendering: `/archive/[slug]` zeigt dann automatisch `DialogueThread` statt
  des rohen `content`-Blocks, sobald `dialogue_messages` existieren (der
  Fallback-Zweig dafür existiert in `archive/[slug]/page.tsx` bereits).

### Export (App → Markdown)

Für einen abgeschlossenen In-App-Dialog, der ins Vault zurückexportiert
werden soll (z.B. weil er redaktionell weiterbearbeitet werden soll):
Frontmatter aus `metadata` (participants/setting/location/logDate/tags)
rekonstruieren, danach die `dialogue_messages` (aufsteigend nach
`created_at`) aneinanderreihen, jede Nachricht mit vorangestelltem
`<!-- Participant: <characterSlug> -->` + ihrem `source_md`. Bestehende
Dialoge lassen sich durch nachträgliches Einfügen der Kommentare ins neue
Format überführen, ohne ihre `dialogue_messages` zu verändern.

## Offene Punkte für den Folge-PR

- Bild-/Portrait-Upload (Charaktere referenzieren `portrait`, aktuell nur via
  Vault-Datei-Pfad).
- Fehlerbehandlung, wenn der GitHub-Commit gelingt, aber die Ingest-Action
  fehlschlägt (Inhalt liegt im Vault, aber nicht in der DB) — Retry-Anzeige
  in der App nötig.
- Vorschau des gerenderten Markdown vor dem Commit.
- Feingranulare Rechte: wer darf welchen Inhaltstyp anlegen (z.B. Archiv-
  Einträge evtl. GM-only, Missionslogs frei für Spieler mit eigenem
  Charakter).
