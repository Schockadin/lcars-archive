import type { ArchiveCategory } from "@/types/archive";

// Kategorie-spezifische Metadaten-Feldlisten für Archiv-Einträge — bewusst
// dieselben Feldnamen/Labels wie scripts/ingest/archive.ts (COMMON_ATTRIBUTES/
// CATEGORY_ATTRIBUTES/COMMON_REFERENCES/CATEGORY_REFERENCES), damit über die
// Web-Oberfläche gepflegte Einträge dieselbe Metadaten-Struktur bekommen wie
// per Vault-Ingest importierte. Zwei Sorten Felder:
// - "attribute"-Felder: einfache Skalarwerte, landen in metadata.attributes.
// - "reference"-Felder: kommagetrennte Slugs. related_missions/
//   related_characters lösen gegen missions/characters auf (→ metadata.
//   missions/characters), alle anderen gegen archive_entries (→ archive_links
//   mit diesem Label).
export interface ArchiveFieldSpec {
  key: string;
  label: string;
}

export const COMMON_ATTRIBUTES: ArchiveFieldSpec[] = [
  { key: "status", label: "Status" },
];

export const CATEGORY_ATTRIBUTES: Record<string, ArchiveFieldSpec[]> = {
  person: [],
  npc: [],
  dialogue: [],
  location: [
    { key: "location_type", label: "Art" },
    { key: "class", label: "Klasse" },
    { key: "system", label: "System" },
    { key: "sector", label: "Sektor" },
    { key: "quadrant", label: "Quadrant" },
    { key: "coordinates", label: "Koordinaten" },
    { key: "affiliation", label: "Zugehörigkeit" },
    { key: "atmosphere", label: "Atmosphäre" },
    { key: "population", label: "Bevölkerung" },
    { key: "first_contact", label: "Erstkontakt" },
  ],
  item: [{ key: "item_type", label: "Art" }],
  faction: [{ key: "faction_type", label: "Art" }],
  species: [
    { key: "species_type", label: "Art" },
    { key: "classification", label: "Klassifikation" },
    { key: "homeworld", label: "Heimatwelt" },
  ],
  theory: [{ key: "lore_type", label: "Art" }],
  event: [{ key: "lore_type", label: "Art" }],
  other: [
    { key: "lore_type", label: "Art" },
    { key: "setting", label: "Schauplatz" },
    { key: "log_date", label: "Datum" },
  ],
};

export const COMMON_REFERENCES: ArchiveFieldSpec[] = [
  { key: "related_missions", label: "Mission" },
  { key: "related_characters", label: "Charakter" },
  { key: "related_npcs", label: "NPC" },
  { key: "related_locations", label: "Ort" },
  { key: "related_species", label: "Spezies" },
  { key: "related_factions", label: "Fraktion" },
  { key: "related_items", label: "Objekt" },
  { key: "related_lore", label: "Lore" },
];

export const CATEGORY_REFERENCES: Record<string, ArchiveFieldSpec[]> = {
  person: [],
  npc: [],
  dialogue: [{ key: "participants", label: "Teilnehmer" }],
  location: [{ key: "controlled_by", label: "Kontrolliert von" }],
  item: [
    { key: "origin", label: "Ursprung" },
    { key: "location", label: "Standort" },
  ],
  faction: [
    { key: "leader", label: "Anführer" },
    { key: "headquarters", label: "Hauptsitz" },
    { key: "member_species", label: "Mitglieds-Spezies" },
  ],
  species: [{ key: "affiliation", label: "Zugehörigkeit" }],
  theory: [],
  event: [],
  other: [{ key: "participants", label: "Teilnehmer" }],
};

// related_missions/related_characters lösen gegen eigene Tabellen auf statt
// gegen archive_entries (siehe COMMON_REFERENCES-Kommentar oben).
export const OWN_TABLE_REFERENCE_KEYS = new Set([
  "related_missions",
  "related_characters",
]);

export function getAttributeFields(category: ArchiveCategory): ArchiveFieldSpec[] {
  return [...COMMON_ATTRIBUTES, ...(CATEGORY_ATTRIBUTES[category] ?? [])];
}

export function getReferenceFields(category: ArchiveCategory): ArchiveFieldSpec[] {
  return [...COMMON_REFERENCES, ...(CATEGORY_REFERENCES[category] ?? [])];
}
