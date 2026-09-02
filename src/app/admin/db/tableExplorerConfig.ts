import { formatDateTime } from "@/utils/formateISODate";
import { synopsisExcerpt } from "@/lib/missionFormat";

// Geteiltes zwischen den Bausteinen des DB-Bereichs (/admin/db). Bewusst KEINE
// "use server"-Datei: die Server-Action (tableExplorerActions.ts) darf nur
// async-Funktionen exportieren, kann eine Zahl-Konstante also nicht selbst
// bereitstellen. Sowohl die Action (LIMIT/OFFSET-Slicing) als auch das
// Client-Modul (Seitenzahl-Berechnung) importieren die Größe hier, damit
// beide Seiten garantiert denselben Wert verwenden.
export const TABLE_PAGE_SIZE = 30;

// Zellwert für die Tabelle (gekürzt) bzw. das Detail-Modal (vollständig,
// JSON pretty-printed statt einzeilig). Von beiden Ansichten des DB-Bereichs
// genutzt (DbTableRows für SQL-Ergebnisse, DbTableExplorer für den
// Tabellen-Browser) — vorher in beiden Dateien wortgleich dupliziert, aber
// mit unterschiedlicher Kürzungslänge (140 bzw. 120 Zeichen, je nachdem wie
// breit die Tabelle dort steht). Die bleibt deshalb ein Parameter.
export function formatValue(
  value: unknown,
  truncate: boolean,
  truncateLength: number,
): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === "object") {
    return truncate
      ? synopsisExcerpt(JSON.stringify(value), truncateLength)
      : JSON.stringify(value, null, 2);
  }
  const text = String(value);
  return truncate ? synopsisExcerpt(text, truncateLength) : text;
}
