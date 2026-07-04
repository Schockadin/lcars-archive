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
  name: string;
  slug: string;
  role: 'admin' | 'gm' | 'player' | 'viewer';
  is_active: boolean;
  created_at: Date;
  last_login_at: Date | null;
  previous_login_at: Date | null;
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
}