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

`src/lib/changelog.ts` holds one entry per Major.Minor version (i.e. one entry per merged Pull Request, not per commit) and powers the public `/changelog` page, rendered as a bulleted list (`items: string[]`, one `<li>` per entry — not a single paragraph). Whenever a Pull Request is opened or merged (i.e. whenever `version.ts`'s Minor number changes), add a new entry to that array — `items` is a short list of end-user-facing German bullet points, one per changelog-worthy commit in that version, written for a campaign player/GM, not a developer changelog. Skip pure bugfixes/refactors with no user-visible effect unless they fixed something a user would have noticed being broken; when a later commit in the same PR supersedes an earlier one (e.g. a permission grant that gets narrowed again), reflect only the net final behavior as a single item instead of both intermediate steps. Base the items on the current Pull Request's body (see "The Pull Request Body" above) — append a new item to the currently-open PR's entry as that body gains new commit sections, the same way the PR body itself is kept current.

# Testing/Reviewing Behaviour

Do local tests (unit, e2e, no integration) with each commit. Also do a full scope code review each time you are instrcuted to merge. Fix all problems found while reviewing and repeat unless no more problems occur. If no problems show up, always update the `README.md`, `/impressum`, `/datenschutz` und `/tutorial` to reflect the latest changes. Only then and if Netlify shows green merge the PR.

<!-- END:nextjs-agent-rules -->
