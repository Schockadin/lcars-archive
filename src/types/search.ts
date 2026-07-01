// Ergebnis der globalen Header-Suche. Vereinheitlicht Charaktere, Missionen,
// Mission-Logs und Archiv-Einträge auf eine gemeinsame Form.
export type SearchResultType = "character" | "mission" | "log" | "archive";

export interface SearchResult {
  type: SearchResultType;
  label: string;
  sublabel: string;
  href: string;
}
