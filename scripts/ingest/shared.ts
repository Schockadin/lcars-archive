// scripts/ingest/shared.ts
//
// Reine Re-Exports — die eigentliche Logik lebt in src/lib/ (auch im
// App-Code nutzbar, siehe src/lib/markdownImport.ts). Relative Pfade (kein
// @/-Alias) — die Ingest-Skripte laufen per tsx außerhalb von Next.js, das
// den @/-Alias nicht auflöst.
export { markdownToHtml } from "../../src/lib/markdown";
export {
  resolveOwner,
  validateSlug,
  parseDate,
  toStringArray,
  toNumberArray,
} from "../../src/lib/ingestShared";
