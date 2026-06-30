// src/types/archive.ts
// Archiv-Einträge: enzyklopädische Notizen (NPCs, Orte, Schiffe, Fraktionen,
// Spezies, Items, Lore, Dialoge) — untereinander sowie zu Charakteren und
// Missionen verknüpft.

export type ArchiveCategory =
  | "person"
  | "location"
  | "item"
  | "faction"
  | "theory"
  | "event"
  | "species"
  | "npc"
  | "dialogue"
  | "other";

// Ein angezeigtes Attribut (Label bereits im Ingest aufgelöst).
export interface ArchiveAttribute {
  label: string;
  value: string;
}

// Querverweis auf einen Charakter bzw. eine Mission (eigene Tabellen, daher
// nicht über archive_links abgebildet, sondern in der Metadata gespeichert).
export interface ArchiveCharacterRef {
  slug: string;
  name: string;
}
export interface ArchiveMissionRef {
  slug: string;
  title: string;
}

export interface ArchiveMetadata {
  // Kurzbeschreibung (Frontmatter "teaser") für Übersicht / Meta-Description.
  summary: string | null;
  // Typ-spezifische Skalar-Felder (Status, Klasse, System, …) zur Anzeige.
  attributes: ArchiveAttribute[];
  // Verknüpfte Charaktere / Missionen (eigene Tabellen).
  characters: ArchiveCharacterRef[];
  missions: ArchiveMissionRef[];
}

// Listenvorschau für die Archiv-Übersicht (ohne content).
export interface ArchiveEntryPreview {
  id: number;
  slug: string;
  title: string;
  category: ArchiveCategory;
  tags: string[];
  metadata: ArchiveMetadata;
}

// Eine aufgelöste Querverweis-Kante zwischen Archiv-Einträgen.
export interface ArchiveLink {
  slug: string;
  title: string;
  category: ArchiveCategory;
  label: string | null;
}

// Detailansicht inkl. content + aufgelöster Verweise (ein- und ausgehend).
export interface ArchiveEntryDetail {
  id: number;
  slug: string;
  title: string;
  category: ArchiveCategory;
  content: string;
  tags: string[];
  metadata: ArchiveMetadata;
  updated_at: string;
  // Ausgehende Verweise (dieser Eintrag → andere Archiv-Einträge).
  links: ArchiveLink[];
  // Eingehende Verweise (andere Archiv-Einträge → dieser Eintrag).
  backlinks: ArchiveLink[];
}

// Schlanke Pfad-Info für Sitemap / generateStaticParams.
export interface ArchivePath {
  slug: string;
  updated_at: string;
}
