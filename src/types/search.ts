// Ergebnis der globalen Header-Suche. Vereinheitlicht Charaktere, Missionen,
// Mission-Logs und Archiv-Einträge auf eine gemeinsame Form.
export type SearchResultType = "character" | "mission" | "log" | "archive";

export interface SearchResult {
  type: SearchResultType;
  label: string;
  sublabel: string;
  href: string;
  slug: string;
  // Kurzer Textausschnitt um den ersten Volltext-Treffer — nur von
  // searchFull() (/search) gesetzt, für log/archive-Treffer bei denen der
  // Suchbegriff NICHT im Titel vorkommt. Von der Dropdown-Suche unbenutzt.
  snippet?: string;
  // Nur gesetzt, wenn searchFull() mit eingeloggtem User aufgerufen wurde
  // (character/mission/archive — Logs sind nicht bookmarkbar, siehe
  // FollowTargetType in lib/follows.ts).
  saved?: boolean;
}
