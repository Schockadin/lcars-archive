<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# How to handle version.ts

Versionsnummer ist wie folgt aufgebaut: <MajorVersion>.<MinorVersion>.<Subversion>

- Die Major-Version wird nur händisch erhöht
- Die Minor-Version erhöht sich bei jedem Pullrequest (reset auf 0 bei neuer Major-Version)
- Die Sub-Version erhöht sich bei jedem Commit im aktuellen PR (reset auf 0 bei neuem PR)
<!-- END:nextjs-agent-rules -->
