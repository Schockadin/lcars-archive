export interface CharacterAffiliation {
  factions: string[];
  ships: string[];
  division: string | null;
}

export interface CharacterMetadata {
  rank: string | null;
  species: string[];
  homeworld: string | null;
  // Manuell gepflegtes Alter — Fallback/Alternative zum abgeleiteten Alter.
  age: number | null;
  // Geburtsdatum (In-Story, ISO YYYY-MM-DD). Ist es gesetzt, wird das
  // angezeigte Alter daraus + dem aktuellen Ingame-Jahr abgeleitet
  // (inferAgeFromDateOfBirth in src/lib/campaign.ts) statt age zu verwenden.
  dateOfBirth: string | null;
  // Portrait-Original und gewählter Bildausschnitt. characters.portrait hält
  // das fertig zugeschnittene Bild; diese beiden erlauben, den Ausschnitt
  // später aus demselben Original neu zu wählen (siehe src/lib/portraitCrop.ts
  // und PortraitPicker.tsx). Fehlen sie, wurde nie zugeschnitten.
  portraitSource?: string | null;
  portraitCrop?: unknown;
  affiliation: CharacterAffiliation | null;
  player: string | null;
  tags: string[];
  aliases: string[];
  generation: number[];
  // Charakterwerte des Bogens (/user/characters/[id]/stats). Bewusst unknown
  // statt CharacterStats: ältere Datensätze haben das Feld gar nicht und der
  // Inhalt kommt roh aus jsonb — immer über parseCharacterStats
  // (src/lib/characterStats.ts) lesen, nie direkt zugreifen.
  stats?: unknown;
}

export interface Character {
  id: number;
  slug: string;
  name: string;
  status: "active" | "retired" | "deceased";
  player_id: number | null;
  portrait: string | null;
  joined_at: string | null;
  left_at: string | null;
  bio: string | null;
  metadata: CharacterMetadata;
  visibility: "private" | "gm" | "public";
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  // Farbe (siehe src/lib/characterColor.ts) — pro Charakter statt pro User,
  // damit ein User mit mehreren Charakteren ("Multis") für jeden eine eigene
  // wählen kann. Hex (#rrggbb) oder NULL (kein expliziter Default gewählt).
  character_color: string | null;
}
