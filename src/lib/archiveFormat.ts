// Geteilte, React-freie Helfer für Archiv-Einträge — nutzbar in Server-
// und Client-Komponenten sowie im Ingest-Skript.
import { ArchiveCategory } from "@/types/archive";

// Anzeige-Konfiguration je Kategorie: Singular-/Plural-Label + LCARS-Farbe.
// Die Reihenfolge der Keys bestimmt zugleich die Gruppen-Reihenfolge in der
// Übersicht (siehe CATEGORY_ORDER).
export const CATEGORY_CONFIG: Record<
  ArchiveCategory,
  { label: string; plural: string; color: string }
> = {
  dialogue: {
    label: "Gespräch",
    plural: "Gespräche",
    color: "var(--lcars-text-data)",
  },
  person: { label: "Person", plural: "Personen", color: "var(--lcars-blue)" },
  location: { label: "Ort", plural: "Orte", color: "var(--lcars-green)" },
  faction: {
    label: "Fraktion",
    plural: "Fraktionen",
    color: "var(--lcars-amber)",
  },
  species: {
    label: "Spezies",
    plural: "Spezies",
    color: "var(--lcars-purple)",
  },
  item: { label: "Objekt", plural: "Objekte", color: "var(--lcars-orange)" },
  event: {
    label: "Ereignis",
    plural: "Ereignisse",
    color: "var(--lcars-red)",
  },
  theory: {
    label: "Theorie",
    plural: "Theorien",
    color: "var(--lcars-amber-light)",
  },
  npc: {
    label: "NPC",
    plural: "NPCs",
    color: "var(--lcars-amber)",
  },
  other: {
    label: "Sonstiges",
    plural: "Sonstiges",
    color: "var(--lcars-text-dim)",
  },
};

// Stabile Reihenfolge der Kategorien (Übersicht + Filter).
export const CATEGORY_ORDER = Object.keys(CATEGORY_CONFIG) as ArchiveCategory[];

// Liste aller gültigen Kategorien — auch im Ingest zur Validierung genutzt.
export const ARCHIVE_CATEGORIES = CATEGORY_ORDER;

export function isArchiveCategory(value: string): value is ArchiveCategory {
  return (CATEGORY_ORDER as string[]).includes(value);
}
