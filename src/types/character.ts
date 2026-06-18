export interface CharacterAffiliation {
  factions: string[];
  ships: string[];
  division: string | null;
}

export interface CharacterMetadata {
  rank: string | null;
  species: string[];
  homeworld: string | null;
  age: number | null;
  affiliation: CharacterAffiliation | null;
  player: string | null;
  tags: string[];
  aliases: string[];
}

export interface Character {
  id: number;
  slug: string;
  name: string;
  status: "active" | "retired" | "deceased";
  portrait: string | null;
  joined_at: string | null;
  left_at: string | null;
  bio: string | null;
  metadata: CharacterMetadata;
  created_at: string;
  updated_at: string;
}
