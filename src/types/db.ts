export interface Note {
  id: number;
  slug: string;
  type: "character" | "mission" | "archive";
  frontmatter: Record<string, unknown>;
  content: string;
  updated_at: Date;
  last_updated: Date;
}

// Rollen-Schlüssel. Seit dem Rollen-Editor (/admin/permissions) sind Rollen
// DB-gestützt (Tabelle roles): Neben den fünf System-Rollen (admin, gm, player,
// viewer, guest) können beliebige eigene Rollen angelegt werden — deshalb ist
// der Typ ein freier String, kein festes Union mehr. Welche Rechte ein
// Schlüssel gewährt, steht in der roles-Tabelle bzw. den Code-Defaults
// (DEFAULT_ROLE_PRESETS in src/lib/permissions.ts). Ein User hat eine
// Primärrolle (role, u.a. für Anzeige/Session) und kann weitere Rollen tragen
// (additional_roles) — granulares RBAC, siehe src/lib/permissions.ts.
export type Role = string;

export interface User {
  id: number;
  email: string;
  name: string;
  slug: string;
  role: Role;
  // Weitere Preset-Rollen zusätzlich zur Primärrolle. Effektive Rechte =
  // Vereinigung der Presets aus [role, ...additional_roles] ⊕
  // permission_overrides (siehe resolvePermissions in src/lib/permissions.ts).
  additional_roles: Role[];
  // Individuelle Rechte-Overrides (Permission→bool: true=zusätzlich gewähren,
  // false=entziehen), unabhängig von den Rollen-Presets.
  permission_overrides: Record<string, boolean>;
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
  // Welche News-Arten der User auf dem Dashboard sehen will — Teilmenge von
  // "created"|"updated"|"deleted" (siehe NewsSection.tsx / recentActivity.ts).
  // Leeres Array = keine News. Default (DB) = nur "created" ("Neu").
  news_kinds: string[];
  // Gewähltes LCARS-Farbtheme der Oberfläche (siehe src/lib/themes.ts).
  // Default (DB) = "standard". Freier String; die App normalisiert unbekannte
  // Werte auf "standard" (normalizeThemeId).
  color_theme: string;
  // Individualisierung: einzelne Akzent-Tokens (primary…senary) mit eigenen
  // Hex-Farben überschreiben (Token→Hex). Default (DB) = {}. Wird beim Lesen
  // gegen gültige Token-IDs/Hex gefiltert (sanitizeThemeOverrides).
  theme_overrides: Record<string, string>;
  // UI-Modus der Oberfläche: "lcars" (Default) oder "minimal" (schlankes UI
  // ohne LCARS-Chrome, siehe src/lib/uiMode.ts). Freier String; die App
  // normalisiert unbekannte Werte auf "lcars" (normalizeUiMode).
  ui_mode: string;
  // Wird bei jeder Passwortänderung (setPassword) erhöht und im
  // Session-Cookie mitgeführt (siehe SessionPayload.sessionVersion) — ein
  // Cookie mit veraltetem Wert wird von getCurrentUser() als abgelaufen
  // behandelt, damit ein gestohlenes Cookie eine Passwortänderung nicht
  // überlebt.
  session_version: number;
}
