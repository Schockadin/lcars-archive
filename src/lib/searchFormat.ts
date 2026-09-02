// Geteilte, React-freie Anzeige-Helfer für Suchergebnisse — genutzt vom
// Header-Dropdown (HeaderSearch) und der Suchseite (/search).
import type { SearchResultType } from "@/types/search";

// Akzentfarbe je Treffertyp (Dropdown-Punkt, Karten-Schiene auf /search).
export const TYPE_COLOR: Record<SearchResultType, string> = {
  character: "var(--lcars-tertiary)",
  mission: "var(--lcars-primary)",
  log: "var(--lcars-secondary)",
  archive: "var(--lcars-ink-data)",
};

// Plural-Label für den Typ-Filter auf /search.
export const TYPE_FILTER_LABEL: Record<SearchResultType, string> = {
  character: "Charaktere",
  mission: "Missionen",
  log: "Logs",
  archive: "Datenbank",
};
