<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diese Datei hat zwei Teile

Oben steht ein Block zwischen `<!-- BEGIN:nextjs-agent-rules -->` und
`<!-- END:nextjs-agent-rules -->`. Der gehört NICHT uns: `next dev` schreibt
ihn bei jedem Start neu und ersetzt dabei alles zwischen den beiden Markern
(siehe `upsertAgentRulesBlock` in
`node_modules/next/dist/server/lib/generate-agent-files.js`).

Alles außerhalb der Marker bleibt unangetastet — deshalb stehen unsere
eigenen Regeln ab hier, unterhalb des Blocks. **Nie wieder etwas zwischen die
Marker schreiben.** Genau das war passiert: Die Regeln unten standen komplett
innerhalb des Blocks, und ein einziger `npm run dev` hat sie gelöscht (37
Zeilen auf 9). Der eingesetzte Text forderte sogar dazu auf, den Verlust
mitzucommitten.

# How to handle version.ts

The version number is as follows: <MajorVersion>.<MinorVersion>.<Subversion>

- Major version only increases by hand
- Minor version increases with every opened Pull Request, resetting with each Major Version change to 0
- Sub version increases with every commit in the same Pull Request and resets with a new Pull Request to 0

# The Pull Request Body

Always make sure to keep the Body of the recent open Pull Request updated. Add a new section for each commit.

# The public changelog (/changelog)

`src/lib/changelog.ts` holds one entry per Major.Minor version (i.e. one entry per merged Pull Request, not per commit) and powers the public `/changelog` page, rendered as a bulleted list (one `<li>` per item — not a single paragraph). Whenever a Pull Request is opened or merged (i.e. whenever `version.ts`'s Minor number changes), add a new entry to that array — `items` is a short list of end-user-facing German bullet points written for a campaign player/GM, not a developer changelog.

**Only new features go into `items`.** List genuinely new capabilities a player/GM gains. Do NOT list pure design/layout changes (widths, spacing, colors, fonts, centering, button sizing), technical/refactor details, or bugfixes without feature character — those are intentionally omitted, even when a commit was mostly about them. When a later commit in the same PR supersedes an earlier one, reflect only the net final behavior as a single item. Because most polish commits carry no feature, a version's `items` list is usually much shorter than its list of commits — that is expected.

**Every item carries a category, and may deep-link into the tutorial.** An item is a `{ text: string; category: ChangelogCategoryId; tutorial?: TutorialSectionId }` object (see `ChangelogItem` in `changelog.ts`). `category` is mandatory — pick the closest id from `src/lib/changelogCategories.ts` (`inhalte`, `charaktere`, `spielleitung`, `darstellung`, `benachrichtigungen`, `konto`, `export`); `sonstiges` is only the fallback for the legacy plain-`string` form and must not be used for new items (a test enforces this). Readers filter and sort by these categories on `/changelog` and on the dashboard, and admins hide categories per role there. When a feature is explained in a `/tutorial` section, set `tutorial` to that section's id — the ids live in `src/lib/tutorialSections.ts` (the single source of truth, mirrored by the `htmlId` anchors on the tutorial's `LcarsDataRow` sections). The renderers then append an „Im Tutorial: …“ link that opens the matching (auto-expanding) tutorial section. Add a `tutorial` link whenever a relevant section exists; leave it off for features without one.

Base the items on the current Pull Request's body (see "The Pull Request Body" above) — append a new item to the currently-open PR's entry as that body gains new commit sections that actually introduce a feature, the same way the PR body itself is kept current.

# Testing/Reviewing Behaviour

**Do not run the test suite locally.** GitHub Actions runs it on every push (`.github/workflows/ci.yml`: `npm run lint`, `npm test`, `npm run test:e2e` and the DB integration tests). Running the same suite here only duplicates it and costs minutes — a local run is never a precondition for a commit.

Still yours with each commit: **write and adjust the tests** for what you changed (unit and e2e, as before — the suite is only run elsewhere, not written elsewhere). After pushing, **watch the CI run for that commit** and fix whatever it reports; a red CI is your work, not something to hand over. Only reach for a local run when CI has failed and you need to reproduce that one failing test — then run that test alone, never the whole suite.

Also do a full scope code review each time you are instrcuted to merge. Fix all problems found while reviewing and repeat unless no more problems occur. If no problems show up, always update the `README.md`, `/impressum`, `/datenschutz` und `/tutorial` to reflect the latest changes. Only then and if CI and Netlify show green merge the PR.
