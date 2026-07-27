// Granulares RBAC — reine, React-/DB-freie Logik (kein "server-only"), damit sie
// in Server-, Client-Komponenten UND Tests nutzbar ist (gleiches Muster wie
// campaignFormat.ts / recentActivityFormat.ts).
//
// Modell: Es gibt Rollen (System-Rollen admin, gm, player, viewer, guest plus
// beliebige, über /admin/permissions angelegte eigene Rollen). Ein User kann
// MEHRERE Rollen gleichzeitig haben (users.role als Primärrolle +
// users.additional_roles). Die effektiven Rechte sind die VEREINIGUNG der
// Rechte-Sets aller zugewiesenen Rollen, auf die anschließend individuelle
// Overrides (gezielt gewähren/entziehen) angewendet werden.
//
// Die System-Presets sind bewusst ADDITIV/ORTHOGONAL: keine Rolle wiederholt die
// Spezial-Rechte einer anderen. Wer mehrere Funktionen braucht, bekommt mehrere
// Rollen (z.B. Seiteninhaber = admin + gm + player).
//
// Rollen sind DB-gestützt (Tabelle roles, siehe src/lib/roles.ts): welche Rechte
// ein Rollen-Schlüssel gewährt, kann in /admin/permissions bearbeitet werden.
// Die aktuelle Rollen-Map wird pro Anfrage aus der DB geladen (getRoleMap in
// src/lib/roles.ts, React-cache-dedupliziert) und den Auflösungs-Funktionen
// EXPLIZIT als letztes Argument übergeben. userCan/userPermissions verlangen die
// Map daher zwingend (kein prozessweites Modul-Global mehr — das wäre mit dem
// Streaming/Cache-Components-Modell unvereinbar). rolePermissions/
// resolvePermissions fallen ohne Map auf die eingebauten DEFAULT_ROLE_PRESETS
// zurück (für Tests und rein-clientseitige Nutzung mit bereits aufgelösten
// Rechten).

import type { User } from "@/types/db";

export type Role = User["role"];

// Rollen-Schlüssel → gewährte Rechte.
export type RoleMap = Record<string, Permission[]>;

// Alle bekannten Rechte (Funktionsbereiche, keine Einzelaktionen).
export const PERMISSIONS = [
  "admin.access", // Zugang zum Admin-Bereich (DB, Scripts, Logs, Import)
  "users.manage", // Nutzerkonten anlegen/bearbeiten/Rollen+Rechte/deaktivieren/löschen
  "users.browse", // /users-Übersicht ansehen + User abonnieren
  "gm.access", // Spielleitungs-Bereich (Leitung-Menü, Dialog-Oversight)
  "characters.assign", // Charaktere Spieler:innen zuweisen
  "characters.assignable", // darf selbst einen Charakter anlegen/zugewiesen bekommen
  "campaign.manage", // Ingame-Jahr / Kampagnen-Einstellungen setzen
  "missions.manage", // Missionen anlegen/bearbeiten/löschen (auch fremde)
  "content.create", // eigene Charaktere/Mission-Logs/Gespräche/Archiv-Einträge anlegen
  "content.view_gm", // gm-sichtbare Inhalte sehen
  "content.view_all", // auch private Inhalte sehen (Admin-Bypass)
  "content.moderate", // fremde Inhalte löschen/Owner ändern/Papierkorb/Bilder verwalten
  "dialogues.moderate", // fremde Dialog-Nachrichten/Metadaten/Owner bearbeiten, Dialoge löschen
  "content.autolink_tools", // Autolink/Delink/Format auf fremde Inhalte + „Alle verlinken“
  "content.follow", // bookmarken/abonnieren (Basis für alle eingeloggten User)
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Menschlich lesbare Labels/Beschreibungen (Admin-Rechte-Editor).
export const PERMISSION_LABELS: Record<Permission, { label: string; description: string }> = {
  "admin.access": { label: "Admin-Bereich", description: "Zugang zu DB, Scripts, Logs, Import." },
  "users.manage": { label: "Nutzerverwaltung", description: "Konten, Rollen und Rechte verwalten." },
  "users.browse": { label: "User-Übersicht", description: "User-Liste ansehen und abonnieren." },
  "gm.access": { label: "Spielleitung", description: "Leitungs-Bereich und Gesprächs-Übersicht." },
  "characters.assign": { label: "Charaktere zuweisen", description: "Charaktere Spieler:innen zuordnen." },
  "characters.assignable": { label: "Eigener Charakter", description: "Darf einen Charakter anlegen/zugewiesen bekommen." },
  "campaign.manage": { label: "Kampagne verwalten", description: "Ingame-Jahr und Kampagnen-Einstellungen setzen." },
  "missions.manage": { label: "Missionen verwalten", description: "Missionen anlegen/bearbeiten/löschen (auch fremde)." },
  "content.create": { label: "Inhalte anlegen", description: "Eigene Charaktere, Berichte, Gespräche, Archiv-Einträge." },
  "content.view_gm": { label: "GM-Inhalte sehen", description: "Als „GM“ markierte Inhalte einsehen." },
  "content.view_all": { label: "Alle Inhalte sehen", description: "Auch private Inhalte einsehen." },
  "content.moderate": { label: "Inhalte moderieren", description: "Fremde Inhalte löschen, Owner ändern, Papierkorb/Bilder." },
  "dialogues.moderate": { label: "Gespräche moderieren", description: "Fremde Nachrichten/Metadaten bearbeiten, Gespräche löschen." },
  "content.autolink_tools": { label: "Verlinkungs-Werkzeuge", description: "Autolinking/Entlinken auf fremde Inhalte, „Alle verlinken“." },
  "content.follow": { label: "Folgen/Bookmarken", description: "Inhalte abonnieren und mit Lesezeichen versehen." },
};

// System-Rollen (fest verdrahtete Schlüssel) → ADDITIVE, minimal überlappende
// Rechte-Sets. Diese Defaults dienen dreifach: (a) Seed für die roles-Tabelle,
// (b) Fallback, falls die DB (noch) keinen Eintrag für eine System-Rolle hat,
// (c) die Map, die in Tests / vor dem ersten DB-Laden gilt.
// Gemeinsamer Nenner bewusst klein gehalten: content.follow für alle
// eingeloggten User; users.browse für alle Nicht-Gast-Rollen.
export const DEFAULT_ROLE_PRESETS: RoleMap = {
  guest: ["content.follow"],
  viewer: ["content.follow", "users.browse"],
  player: ["content.follow", "users.browse", "content.create", "characters.assignable"],
  gm: [
    "content.follow",
    "users.browse",
    "gm.access",
    "characters.assign",
    "campaign.manage",
    "missions.manage",
    "content.view_gm",
    "content.autolink_tools",
  ],
  admin: [
    "content.follow",
    "users.browse",
    "admin.access",
    "users.manage",
    "content.view_all",
    "content.moderate",
    "dialogues.moderate",
  ],
};

// Rückwärtskompatibler Alias (Tests/ältere Importe). Zeigt bewusst auf die
// eingebauten Defaults, nicht auf die (mutierbare) aktive Map.
export const ROLE_PRESETS: RoleMap = DEFAULT_ROLE_PRESETS;

// System-Rollen (Schlüssel + Anzeige-Labels). Eigene Rollen holen Label/Rechte
// aus der DB; hier stehen nur die eingebauten.
export const SYSTEM_ROLES: Role[] = ["admin", "gm", "player", "viewer", "guest"];

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administration",
  gm: "Spielleitung",
  player: "Spieler",
  viewer: "Beobachter",
  guest: "Gast",
};

// Rückwärtskompatibler Alias (nur System-Rollen).
export const ALL_ROLES: Role[] = SYSTEM_ROLES;

export function isSystemRole(key: string): boolean {
  return (SYSTEM_ROLES as readonly string[]).includes(key);
}

// Anzeige-Label einer Rolle: bevorzugt aus der übergebenen (DB-)Label-Map, dann
// die eingebauten System-Labels, sonst der Schlüssel selbst.
export function roleLabel(
  key: string,
  labels?: Record<string, string>,
): string {
  return labels?.[key] ?? ROLE_LABELS[key] ?? key;
}

export type PermissionOverrides = Partial<Record<Permission, boolean>>;

function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

// Rechte, die allein aus den Rollen folgen (ohne Overrides) — Basis für die
// „geerbt vs. überschrieben“-Anzeige im Rechte-Editor. Ohne roleMap gelten die
// eingebauten DEFAULT_ROLE_PRESETS; Server-/Client-Code reicht die serverseitig
// aus der DB aufgelöste Map explizit durch.
export function rolePermissions(
  roles: Role[],
  roleMap: RoleMap = DEFAULT_ROLE_PRESETS,
): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    const preset = roleMap[role];
    if (!preset) continue; // unbekannte Rolle wird ignoriert
    for (const p of preset) if (isPermission(p)) set.add(p);
  }
  return set;
}

// Effektive Rechte: Vereinigung der Rollen-Rechte, danach Overrides anwenden
// (true = zusätzlich gewähren, false = entziehen).
export function resolvePermissions(
  roles: Role[],
  overrides: PermissionOverrides | null | undefined,
  roleMap: RoleMap = DEFAULT_ROLE_PRESETS,
): Set<Permission> {
  const set = rolePermissions(roles, roleMap);
  if (overrides) {
    for (const [key, granted] of Object.entries(overrides)) {
      if (!isPermission(key)) continue;
      if (granted) set.add(key);
      else set.delete(key);
    }
  }
  return set;
}

export function hasPermission(
  perms: Set<Permission>,
  permission: Permission,
): boolean {
  return perms.has(permission);
}

// Effektive Rollen eines Users (Primärrolle + Zusatzrollen, dedupliziert).
export function effectiveRolesOf(user: {
  role: Role;
  additional_roles: Role[];
}): Role[] {
  return Array.from(new Set<Role>([user.role, ...(user.additional_roles ?? [])]));
}

// Effektive Rechte eines vollen User-Objekts — bequemer Helfer für Server-
// Komponenten/Actions, die ohnehin einen User geladen haben. roleMap ist hier
// PFLICHT: Server-Aufrufer reichen die frisch geladene DB-Rollen-Map
// (getRoleMap) durch, damit bearbeitete System-/eigene Rollen greifen.
export function userPermissions(
  user: {
    role: Role;
    additional_roles: Role[];
    permission_overrides: Record<string, boolean>;
  },
  roleMap: RoleMap,
): Set<Permission> {
  return resolvePermissions(
    effectiveRolesOf(user),
    user.permission_overrides,
    roleMap,
  );
}

export function userCan(
  user: {
    role: Role;
    additional_roles: Role[];
    permission_overrides: Record<string, boolean>;
  },
  permission: Permission,
  roleMap: RoleMap,
): boolean {
  return userPermissions(user, roleMap).has(permission);
}
