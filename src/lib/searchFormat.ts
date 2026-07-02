// Geteilte, React-freie Anzeige-Helfer für Suchergebnisse — genutzt vom
// Header-Dropdown (HeaderSearch) und der Suchseite (/search).
import type { SearchResultType } from "@/types/search";

// Akzentfarbe je Treffertyp (Dropdown-Punkt, Karten-Schiene auf /search).
export const TYPE_COLOR: Record<SearchResultType, string> = {
  character: "var(--lcars-blue)",
  mission: "var(--lcars-amber)",
  log: "var(--lcars-purple)",
  archive: "var(--lcars-text-data)",
};

// Plural-Label für den Typ-Filter auf /search.
export const TYPE_FILTER_LABEL: Record<SearchResultType, string> = {
  character: "Charaktere",
  mission: "Missionen",
  log: "Logs",
  archive: "Archiv",
};
