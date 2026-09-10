# LCARS Archive — Work Log

Next.js 16 (App Router, Cache Components) + Postgres. Star-Trek-Adventures campaign archive.

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
  Markup und alle `.timeline-card*`-Klassen unverändert — die E2E-Suite
  greift darauf zu.
- **`ChronoRow`** kennt jetzt eine Zeile ohne Datumsspalte (`date`
  weggelassen → `.timeline-event-undated`); die Datenbank nutzt sie, ihre
  kopierte Schiene (`.archive-entry-row/-rail/-dot`) ist entfallen.
- **`TimelineView.EventRow`** und **`ArchiveEntryCard`** bauen beide auf
  `ChronoCard`; `ArchiveEntryRow` ist nur noch die ChronoRow-Hülle.
- **Kategorie-Etikett** in der Datenbank: `CATEGORY_CONFIG[...].label` als
  `.timeline-tag` (ORT, FRAKTION, NPC …) — wie das Art-Etikett der
  Chronologie. Gilt auch für die Gesprächsliste (`/characters/dialogues`),
  die dieselbe Karte nutzt.
- **CSS**: `.timeline-card-meta` (umbrechende Mono-Zeile) und
  `.timeline-card-summary` neu in `timeline.css`; die 70 Zeilen
  Nachbau-/Umlackier-Regeln in `archive.css` sind weg.
- **Attrappen-Ansicht**: `/dev-gallery` hat eine Sektion `#archive-list` mit
  drei Attrappen-Einträgen — die Datenbank ist damit ohne DB prüfbar.
- **Tests**: neue E2E-Datei `e2e/archive-list.spec.ts` (7 Fälle × 2 Viewports:
  Zeile ohne Datumsspalte, Etikett, Kartenfarbe, Klick auf die ganze Karte,
  Suche, Kategorie-Filter, Buchstabengruppen) und ein Unit-Fall für das
  Etikett in `ArchiveEntryList.test.tsx`.

### Verification
- `npx tsc --noEmit` + `eslint`: clean.
- vitest: 844 passed (86 Dateien).
- `npx playwright test`: 260 passed, 4 skipped, 0 failed.

### Offen / Backlog
- P2: sandbox-taugliches Schema (oder Mock) für Postgres, damit
  `npm run build` lokal nicht an `archive_entries` scheitert (pgvector fehlt).
- P2: E2E für die Detailseite eines Datenbank-Eintrags (braucht DB oder eine
  weitere Attrappe).

### Environment notes
- Unit-Tests brauchen ein gesetztes `DATABASE_URL` (z.B.
  `postgresql://postgres:postgres@localhost:5432/lcars_test`), sonst werfen
  11 Dateien beim Import von `src/lib/db.ts`.
- E2E/CI laufen gegen `npm run dev` auf :3000 und einen Listener auf
  127.0.0.1:5432, damit DB-Routen schnell scheitern statt zu hängen.

## 2026-06 — Build fix + E2E suite review

### Problem
1. `next build` failed: `app/chronologie/page.tsx` accessed runtime data (`await searchParams`) outside the Suspense boundary — illegal under `cacheComponents`.
2. E2E suite drifted from the current app state.

### Done
- **Fixed** `src/app/chronologie/page.tsx`: page component is no longer `async`; `searchParams` is now awaited inside a `ChronologieContent` child rendered within `ChronologyShell`'s `<Suspense>` boundary (mirrors the sibling `[kategorie]/page.tsx` pattern). Build now compiles + passes TypeScript.
- **E2E drift fixed** (`e2e/timeline.spec.ts`): the manual event-creation trigger is now an icon button `aria-label="Event hinzufügen"` (was looked up as button "Ereignis eintragen"; that string is now only the modal title). Updated 2 tests.
- **Stale unit test fixed** (`src/components/timeline/TimelineView.test.tsx`): aria-label `"Nach beteiligter Person"` → `"Nach beteiligter Person filtern"`.

### Verification
- `npm test` (vitest): 843 passed.
- `npm run lint`: clean.
- `npx playwright test` (full e2e): 246 passed, 4 skipped, 0 failed — run against a local Postgres so DB-backed routes fail fast like CI.
- Note: the earlier card-click e2e failures were purely environmental (no Postgres listening on :5432 in the sandbox made the DB-backed mission route hang past the 5s `toHaveURL` timeout). Not a drift and not changed.

### Environment notes
- E2E/CI use a dummy `DATABASE_URL` and a real Postgres listener on 127.0.0.1:5432; the pg client fails fast on missing tables so routes render quickly.
- Full production `npm run build` additionally needs the real DB schema (`scripts/schema.sql`, requires the `vector`/pgvector extension) — present in the deploy env, absent in this sandbox.
