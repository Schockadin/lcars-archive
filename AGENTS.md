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

<!-- END:nextjs-agent-rules -->

# The public changelog (/changelog)

`src/lib/changelog.ts` holds one entry per Major.Minor version (i.e. one entry per merged Pull Request, not per commit) and powers the public `/changelog` page. Whenever a Pull Request is opened or merged (i.e. whenever `version.ts`'s Minor number changes), add a new entry to that array — a short (3-6 sentence), end-user-facing German paragraph summarizing what changed in that version, written for a campaign player/GM, not a developer changelog. Skip pure bugfixes/refactors with no user-visible effect unless they fixed something a user would have noticed being broken. Base the summary on the current Pull Request's body (see "The Pull Request Body" above) — keep the changelog entry for the currently-open PR's version up to date as that body gains new commit sections, the same way the PR body itself is kept current.
