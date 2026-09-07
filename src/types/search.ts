// Ergebnis der globalen Header-Suche. Vereinheitlicht Charaktere, Missionen,
// Mission-Logs, Archiv-Einträge und einzelne Gesprächs-Nachrichten auf eine
// gemeinsame Form.
//
// "dialogue_message" ist die einzige Art, die KEINEN eigenen Inhalt mit
// eigener Adresse meint: der Treffer ist eine Nachricht, verlinkt wird das
// Gespräch (mit Sprungmarke auf die Fundstelle). Sie kommt deshalb nur in der
// Volltextsuche vor, nicht im Titel-Dropdown des Headers.
export type SearchResultType =
  | "character"
  | "mission"
  | "log"
  | "archive"
  | "dialogue_message";

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
