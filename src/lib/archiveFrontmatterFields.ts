// Kategorie-/Feld-Definitionen für Archiv-Eintrag-Frontmatter, ursprünglich
// nur in scripts/ingest/archive.ts. Hierher verschoben, damit sowohl das
// CLI-Ingest (per Re-Export in scripts/ingest/archive.ts) als auch
// src/lib/markdownImport.ts (Admin-Markdown-Upload) exakt dieselben
// Kategorien/Attribute/Verweisfelder kennen — sonst würden beide Wege beim
// Erweitern eines Felds unbemerkt auseinanderlaufen.

// Gültige Kategorien — muss exakt dem CHECK-Constraint in schema.sql sowie
// ArchiveCategory in src/types/archive.ts entsprechen.
export const VALID_CATEGORIES = [
  "dialogue",
  "npc",
  "person",
  "location",
  "item",
  "faction",
  "theory",
  "event",
  "species",
  "other",
];

// Top-Level-Ordner unter "Archiv/" → Kategorie. Greift beim CLI-Ingest, wenn
// das Frontmatter keine (gültige) category nennt (z.B. das Orte-Template
// ohne category-Feld). Beim Admin-Markdown-Upload (kein Ordnerkontext) nicht
// nutzbar — dort muss category im Frontmatter stehen.
export const FOLDER_CATEGORY: Record<string, string> = {
  dialoge: "dialogue",
  npc: "npc",
  npcs: "npc",
  fraktionen: "faction",
  items: "item",
  lore: "other",
  orte: "location",
  schiffe: "location",
  spezies: "species",
};

export interface FieldSpec {
  key: string;
  label: string;
}

// Skalar-Attribute zur Anzeige (Label im Eintrag gespeichert). status ist für
// alle Kategorien relevant und wird vorangestellt.
export const COMMON_ATTRIBUTES: FieldSpec[] = [{ key: "status", label: "Status" }];

export const CATEGORY_ATTRIBUTES: Record<string, FieldSpec[]> = {
  person: [],
  npc: [],
  // Dialoge zeigen Schauplatz/Datum nicht als Datenfeld, sondern im Header.
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

// Slug-Referenzfelder. Jeder Wert wird im 2. Pass aufgelöst: Archiv-Eintrag →
// archive_links (mit diesem Label), Charakter/Mission → in der Metadata.
export const COMMON_REFERENCES: FieldSpec[] = [
  { key: "related_missions", label: "Mission" },
  { key: "related_characters", label: "Charakter" },
  { key: "related_npcs", label: "NPC" },
  { key: "related_locations", label: "Ort" },
  { key: "related_species", label: "Spezies" },
  { key: "related_factions", label: "Fraktion" },
  { key: "related_items", label: "Objekt" },
  { key: "related_lore", label: "Lore" },
];

export const CATEGORY_REFERENCES: Record<string, FieldSpec[]> = {
  person: [],
  npc: [],
  // participants → Teilnehmer (NPCs als archive_links, Charaktere in Metadata).
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

// Slug → lesbarer Name (Fallback für nicht aufgelöste Verweise/Teilnehmer).
// "atlan-da-gonozal" → "Atlan Da Gonozal".
export function humanize(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function str(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

// Attribut-Wert hübsch als String (Date → YYYY-MM-DD, Array → Liste).
export function attrValue(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (Array.isArray(value)) {
    const parts = value.map((v) => str(v)).filter((v): v is string => !!v);
    return parts.length ? parts.join(", ") : null;
  }
  return str(value);
}
