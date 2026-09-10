# LCARS Archive — Work Log

Next.js 16 (App Router, Cache Components) + Postgres. Star-Trek-Adventures campaign archive.

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
