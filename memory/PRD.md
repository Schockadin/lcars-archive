# LCARS Archive — Work Log

Next.js 16 (App Router, Cache Components) + Postgres. Star-Trek-Adventures campaign archive.

## 2026-06 — Charaktere, Gespräche und die eine Liste

### Problem / Auftrag
1. Die Gespräche sollen aus dem Charaktere-Bereich verschwinden und in der
   Chronologie ihren Platz haben (Ereignisart „Gespräch").
2. `/characters` soll dieselbe Ansicht tragen wie `/chronologie` und
   `/archive`, mit dem Status als Gruppen-Überschrift und einem „+"-Knopf, der
   auf `/user/characters/new` führt.

### Done
- **Gespräche raus aus /characters**: `CharactersAndDialogues.tsx` (Zwei-Spalten
  mit Umschalter) und `characters/dialogues/DialogueList.tsx` +
  `characters/dialogues/page.tsx` entfernt. `/characters` rendert nur noch die
  Charakterliste; die Detailseiten `/characters/dialogues/[slug]` bleiben.
  `.chars-dialogues-*` in `character.css` entfallen.
- **Neuer Helfer** `dialoguesHref(personName?)` in `contentRoutes.ts`:
  `/chronologie/dialogue` bzw. mit Person
  `/chronologie?scope=all&category=dialogue&person=…`. Genutzt von
  `CharacterHero` („Gespräche"-Schnellzugriff), `ActionsMenu`
  (Löschen-Redirect), `actions/dialogues.ts` und dem `?cat=dialogue&participant=`
  -Redirect der Datenbank.
- **Gespräche in der Chronologie**: `getAllArchiveEntries` filtert wieder nur
  OFFENE Gespräche weg (`NOT (category = 'dialogue' AND dialogue_open)`), und
  ein Gespräch OHNE In-Story-Datum steht jetzt trotzdem im Zeitstrahl:
  `TimelineEvent.date` ist `string | null`, undatierte Ereignisse stehen in
  beiden Sortierrichtungen am Ende unter der Zwischenüberschrift „Ohne Datum"
  (`sortEvents`, `periodKey`/`periodLabel`, `yearsOf`, `filterEvents`,
  `latestEventDate`, `missionEndDates` angepasst). Die Karte lässt die
  Datumszeile dann weg.
- **/characters im Design der beiden anderen Listen**: `CharacterPage.tsx`
  nutzt `ChronoRow` (ohne Datumsspalte) + `ChronoCard`; `<h2>` je Gruppe ist
  der Status („Aktiv", „Inaktiv", „Verstorben") bzw. die Generation. Karte:
  Rang-Kürzel als Etikett, Name als Titel, Meta-Zeile aus Spezies,
  Zugehörigkeit und Spieler. Toolbar wie überall (`+`-Knopf →
  `/user/characters/new`, Status/Generation-Umschalter, Filterfeld,
  „Beziehungen"-Link, Trefferzähler). Die alten `.character-entry*`-Regeln und
  die geteilte Typografie-Regel in `shared.css` sind entfallen, `loading.tsx`
  bildet die neue Form nach.
- **Klickfläche**: die Textzeilen der Karte (`-summary`, `-date`, `-meta`)
  bekommen `pointer-events: none`, damit „die ganze Karte ist anklickbar"
  auch dort gilt, wo Text steht.
- **Attrappen + Tests**: `/dev-gallery` zeigt zusätzlich `#character-list`
  (drei Figuren, je ein Status) und ein undatiertes Gespräch im Zeitstrahl.
  Neu: `e2e/characters-list.spec.ts` (7 Fälle × 2 Viewports),
  `src/app/characters/CharacterPage.test.tsx` (7 Fälle), Fälle für die
  undatierte Gruppe in `timelineTypes.test.ts` und `e2e/timeline.spec.ts`.

### Verification
- `tsc --noEmit` + `eslint src e2e`: clean.
- vitest: 855 passed (87 Dateien).
- `npx playwright test`: 276 passed, 4 skipped, 0 failed.

### Offen / Backlog
- P2: sandbox-taugliches Schema (oder Mock) für Postgres, damit
  `npm run build` lokal nicht an `archive_entries` scheitert (pgvector fehlt).
- P2: E2E für die Detailseite eines Datenbank-Eintrags / einer Personalakte
  (braucht DB oder eine weitere Attrappe).
- P2: Der alte `?participant=<slug>`-Link der Datenbank landet jetzt auf allen
  Gesprächen — der Personenfilter der Chronologie arbeitet mit Namen, nicht
  mit Slugs.

## 2026-06 — Chronologie & Datenbank teilen Zeile und Karte

### Problem
`/chronologie` und `/archive` (Datenbank) zeigten dieselbe Sache doppelt: die
Chronologie mit `ChronoRow` + einer inline gebauten `.timeline-card`
(`EventRow` in `TimelineView.tsx`), die Datenbank mit `ArchiveEntryRow`
(eigene, kopierte Schiene) + `ArchiveEntryCard` auf Basis von `AkteCard`, die
in `archive.css` erst wieder zur Ereigniskarte umlackiert werden musste.
Archiv-Einträgen fehlte außerdem das Kategorie-Etikett der Chronologie.

### Done
- **Neu** `src/components/timeline/ChronoCard.tsx`: die gemeinsame Karte
  (Etikett, verlinkter Titel, Zusatzmarke, Kurzfassung, Datums- bzw.
  Meta-Zeile) samt exportiertem `ChronoPanel` für die `<details>`-Felder.
- **`ChronoRow`** kennt eine Zeile ohne Datumsspalte (`date` weggelassen →
  `.timeline-event-undated`); Datenbank und Charakterliste nutzen sie.
- **`TimelineView.EventRow`**, **`ArchiveEntryCard`** und die Charakterliste
  bauen auf `ChronoCard`.
- **Kategorie-Etikett** in der Datenbank (`CATEGORY_CONFIG[...].label`).
- **CSS**: `.timeline-card-meta`, `.timeline-card-summary` neu in
  `timeline.css`; die Nachbau-Regeln in `archive.css` sind weg.
- **Tests**: `e2e/archive-list.spec.ts`, Etikett-Fall in
  `ArchiveEntryList.test.tsx`, Attrappen-Sektion `#archive-list` in
  `/dev-gallery`.

## 2026-06 — Build fix + E2E suite review

### Problem
1. `next build` failed: `app/chronologie/page.tsx` accessed runtime data (`await searchParams`) outside the Suspense boundary — illegal under `cacheComponents`.
2. E2E suite drifted from the current app state.

### Done
- **Fixed** `src/app/chronologie/page.tsx`: `searchParams` wird in einem Kind
  innerhalb der `<Suspense>`-Grenze aufgelöst.
- **E2E drift fixed** (`e2e/timeline.spec.ts`): Icon-Knopf
  `aria-label="Event hinzufügen"` statt Button „Ereignis eintragen".
- **Stale unit test fixed** (`TimelineView.test.tsx`): aria-label „Nach
  beteiligter Person filtern".

### Environment notes
- Unit-Tests brauchen ein gesetztes `DATABASE_URL` (z.B.
  `postgresql://postgres:postgres@localhost:5432/lcars_test`), sonst werfen
  11 Dateien beim Import von `src/lib/db.ts`.
- E2E/CI laufen gegen `npm run dev` auf :3000 und einen Listener auf
  127.0.0.1:5432, damit DB-Routen schnell scheitern statt zu hängen.
- Full production `npm run build` braucht zusätzlich das echte Schema
  (`scripts/schema.sql`, benötigt pgvector) — im Deploy vorhanden, im Sandbox
  nicht.
