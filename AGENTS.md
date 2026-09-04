<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

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

**Each item may deep-link into the tutorial.** An item is either a plain `string` or a `{ text: string; tutorial?: TutorialSectionId }` object (see `ChangelogItem` in `changelog.ts`). When a feature is explained in a `/tutorial` section, set `tutorial` to that section's id — the ids live in `src/lib/tutorialSections.ts` (the single source of truth, mirrored by the `htmlId` anchors on the tutorial's `LcarsDataRow` sections). The renderers then append an „Im Tutorial: …“ link that opens the matching (auto-expanding) tutorial section. Add a `tutorial` link whenever a relevant section exists; leave it off for features without one.

Base the items on the current Pull Request's body (see "The Pull Request Body" above) — append a new item to the currently-open PR's entry as that body gains new commit sections that actually introduce a feature, the same way the PR body itself is kept current.

# Testing/Reviewing Behaviour

Do local tests (unit, e2e, no integration) with each commit. Also do a full scope code review each time you are instrcuted to merge. Fix all problems found while reviewing and repeat unless no more problems occur. If no problems show up, always update the `README.md`, `/impressum`, `/datenschutz` und `/tutorial` to reflect the latest changes. Only then and if Netlify shows green merge the PR.

<!-- END:nextjs-agent-rules -->
