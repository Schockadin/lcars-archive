export interface Note {
  id: number;
  slug: string;
  type: "character" | "mission" | "archive";
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
  role: "admin" | "gm" | "player" | "viewer" | "guest";
  is_active: boolean;
  created_at: Date;
  last_login_at: Date | null;
  previous_login_at: Date | null;
  // Letzter Seitenaufruf (jede Seite, gedrosselt aktualisiert — siehe
  // touchLastVisit in lib/users.ts) bzw. letzter Dashboard-Besuch
  // (ungedrosselt — siehe touchDashboardVisit, Grundlage für die
  // News-Sektion in Dashboard.tsx).
  last_visit_at: Date | null;
  last_dashboard_visit_at: Date | null;
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  // Admin-Opt-in "Über alle Inhalte benachrichtigt werden" — Teilmenge von
  // "character"|"mission"|"mission_log"|"archive_entry" (siehe
  // notifyAdminContentSubscribers in lib/follows.ts). Leeres Array = kein
  // Opt-in. Nur für Admins in der UI editierbar, die Spalte existiert aber
  // für jeden User (ungenutzt bei anderen Rollen).
  notify_content_types: string[];
}
