export interface Note {
  id: number;
  slug: string;
  type: 'character' | 'mission' | 'archive';
  frontmatter: Record<string, unknown>;
  content: string;
  updated_at: Date;
  last_updated: Date;
}

export interface User {
  id: number;
  email: string;
  role: 'gm' | 'player' | 'viewer';
  created_at: Date;
  last_updated: Date;
}