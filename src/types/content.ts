export type ContentType = 'character' | 'diary' | 'lore' | 'species' | 'location' | 'person' | 'item' | 'misc';

export interface BaseFrontmatter {
  type: ContentType;
  title: string;
  tags?: string[];
  created?: string;
  updated?: string;
}

export interface CharacterFrontmatter extends BaseFrontmatter {
  type: 'character';
  name: string;
  player?: string;
  race?: string;
  role?: string;
  status: 'active' | 'retired' | 'dead';
  first_appearance?: string;
  portrait?: string;
}

export interface SessionFrontmatter extends BaseFrontmatter {
  type: 'diary';
  date: string;
  location?: string;
  players?: string[];
  entry: string;
}

export interface LoreFrontmatter extends BaseFrontmatter {
  type: 'lore';
  summary?: string;
}

export interface SpeciesFrontmatter extends BaseFrontmatter {
  type: 'species';
  name: string;
  description?: string;
  biology?: string;
  homeworld?: string;
  history?: string;
  notes?: string;
}

export interface LocationFrontmatter extends BaseFrontmatter {
  type: 'location';
  name: string;
  notes?: string;
}

export interface PersonFrontmatter extends BaseFrontmatter {
  type: 'person';
  name: string;
  description?: string;
  notes?: string;
}

export interface ItemFrontmatter extends BaseFrontmatter {
  type: 'item';
  name: string;
  description?: string;
  notes?: string;
}

export interface MiscFrontmatter extends BaseFrontmatter {
  type: 'misc';
  name: string;
  description?: string;
  notes?: string;
}

export interface MarkdownDocument<T extends BaseFrontmatter = BaseFrontmatter> {
  slug: string;
  frontmatter: T;
  content: string;        // raw Markdown
  htmlContent?: string;   // gerendert
}