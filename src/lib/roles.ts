import "server-only";
import { cache } from "react";
import { cacheTag, cacheLife, revalidateTag } from "next/cache";
import sql from "@/lib/db";
import {
  DEFAULT_ROLE_PRESETS,
  PERMISSIONS,
  ROLE_LABELS,
  SYSTEM_ROLES,
  type Permission,
  type RoleMap,
} from "@/lib/permissions";

// DB-gestützte Rollen (Tabelle roles). Neben den fünf System-Rollen (admin, gm,
// player, viewer, guest) können über /admin/permissions beliebige eigene Rollen
// angelegt werden. Welche Rechte ein Rollen-Schlüssel gewährt, ist damit zur
// Laufzeit editierbar; die eingebauten DEFAULT_ROLE_PRESETS dienen nur noch als
// Seed/Fallback (siehe permissions.ts).

export interface RoleRow {
  key: string;
  label: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  sort_order: number;
}

const ROLES_TAG = "roles";

// Beschreibung/Sortierung der System-Rollen für den Self-Heal-Seed (Rechte
// kommen aus DEFAULT_ROLE_PRESETS, Label aus ROLE_LABELS).
const SYSTEM_ROLE_META: Record<
  string,
  { description: string; sort: number }
> = {
  admin: { description: "Verwaltung und Moderation der gesamten Anwendung.", sort: 10 },
  gm: { description: "Spielleitungs-Werkzeuge (Kampagne, Missionen, Gespräche).", sort: 20 },
  player: { description: "Eigene Inhalte anlegen und einen Charakter führen.", sort: 30 },
  viewer: { description: "Inhalte ansehen und Personen/Inhalten folgen.", sort: 40 },
  guest: { description: "Basiszugang (nur Folgen/Bookmarken).", sort: 50 },
  "db-admin": {
    description: "Datenbank-Bereich: SQL-Abfragen, Backups und Tabellen-Explorer.",
    sort: 15,
  },
};

function onlyKnownPermissions(values: string[]): Permission[] {
  const known = new Set(PERMISSIONS as readonly string[]);
  return values.filter((v): v is Permission => known.has(v));
}

// Roh-Zeilen der roles-Tabelle, quer über Anfragen gecacht (kampagnen-weit
// identisch für alle), invalidiert von jeder Rollen-Mutation. Fällt bei
// DB-Fehler NICHT hart aus — der Aufrufer (getRoleMap) hat einen Code-Fallback.
async function getRoleRows(): Promise<RoleRow[]> {
  "use cache";
  cacheTag(ROLES_TAG);
  cacheLife("max");
  const rows = await sql<RoleRow[]>`
      SELECT key, label, description, permissions, is_system, sort_order
      FROM roles
      ORDER BY sort_order ASC, key ASC
    `;
  return rows;
}

// Effektive Rollen-Map (Schlüssel → Rechte). Merged die DB-Zeilen ÜBER die
// eingebauten Defaults: eine bearbeitete System-Rolle ersetzt ihren Default,
// fehlende System-Rollen bleiben über den Default abgedeckt, eigene Rollen
// kommen hinzu. React-cache-dedupliziert pro Anfrage — Server-Aufrufer holen
// die Map hierüber und reichen sie explizit an userCan/userPermissions durch
// (kein Modul-Global mehr, siehe permissions.ts).
function mapFromRows(rows: RoleRow[]): RoleMap {
  const map: RoleMap = { ...DEFAULT_ROLE_PRESETS };
  for (const r of rows) {
    map[r.key] = onlyKnownPermissions(r.permissions);
  }
  return map;
}

export const getRoleMap = cache(async (): Promise<RoleMap> => {
  let rows: RoleRow[] = [];
  try {
    rows = await getRoleRows();
  } catch {
    rows = [];
  }
  return mapFromRows(rows);
});

// Uncached, seiteneffektfreie Variante für Kontexte OHNE Next-Request — z.B.
// Standalone-Cron-Skripte (scripts/*.ts), in denen unstable_cache/React cache
// nicht greifen. Fragt die roles-Tabelle direkt ab und merged wie getRoleMap
// über die Code-Defaults (Fallback bei DB-Fehler).
export async function buildRoleMap(): Promise<RoleMap> {
  let rows: RoleRow[] = [];
  try {
    rows = await sql<RoleRow[]>`
      SELECT key, label, description, permissions, is_system, sort_order
      FROM roles
      ORDER BY sort_order ASC, key ASC
    `;
  } catch {
    rows = [];
  }
  return mapFromRows(rows);
}

// Rollen-Schlüssel → Anzeige-Label (DB-Labels über System-Labels), z.B. für die
// User-Bearbeitungsseite. Ebenfalls über getRoleMap-Ladepfad frisch.
export const getRoleLabelMap = cache(
  async (): Promise<Record<string, string>> => {
    let rows: RoleRow[] = [];
    try {
      rows = await getRoleRows();
    } catch {
      rows = [];
    }
    const labels: Record<string, string> = { ...ROLE_LABELS };
    for (const r of rows) labels[r.key] = r.label;
    return labels;
  },
);

// Legt fehlende System-Rollen an (idempotent) — so erscheint /admin/permissions
// auch auf einer DB ohne separaten SQL-Seed vollständig; bereits bearbeitete
// Rechte bleiben durch ON CONFLICT DO NOTHING unangetastet. Bewusst OHNE
// revalidateTag: diese Funktion läuft (via listRolesForAdmin) auch im Render der
// Admin-Seite, wo revalidateTag verboten ist — und getRoleMap deckt fehlende
// System-Rollen ohnehin über die Code-Defaults ab, die Auflösung bleibt also
// auch mit noch stalem Cache korrekt. Ein günstiger COUNT vermeidet die fünf
// No-op-Inserts, sobald alle System-Rollen existieren.
export async function ensureSystemRoles(): Promise<void> {
  const [{ count }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM roles
    WHERE is_system = TRUE AND key = ANY(${SYSTEM_ROLES})
  `;
  if (count >= SYSTEM_ROLES.length) return;
  for (const key of SYSTEM_ROLES) {
    const meta = SYSTEM_ROLE_META[key];
    await sql`
      INSERT INTO roles (key, label, description, permissions, is_system, sort_order)
      VALUES (
        ${key},
        ${ROLE_LABELS[key] ?? key},
        ${meta?.description ?? ""},
        ${DEFAULT_ROLE_PRESETS[key] ?? []},
        TRUE,
        ${meta?.sort ?? 100}
      )
      ON CONFLICT (key) DO NOTHING
    `;
  }
}

// Alle Rollen für den Editor (/admin/permissions) — heilt vorab fehlende
// System-Rollen und liest dann ungecacht (frisch nach möglicher Mutation).
export async function listRolesForAdmin(): Promise<RoleRow[]> {
  await ensureSystemRoles();
  return sql<RoleRow[]>`
    SELECT key, label, description, permissions, is_system, sort_order
    FROM roles
    ORDER BY is_system DESC, sort_order ASC, key ASC
  `;
}

export async function getRoleByKey(key: string): Promise<RoleRow | null> {
  const rows = await sql<RoleRow[]>`
    SELECT key, label, description, permissions, is_system, sort_order
    FROM roles WHERE key = ${key} LIMIT 1
  `;
  return rows[0] ?? null;
}

export class RoleKeyTakenError extends Error {}

// Legt eine eigene Rolle an (is_system immer false). Wirft RoleKeyTakenError
// bei Schlüssel-Kollision.
export async function createRole(input: {
  key: string;
  label: string;
  description: string;
  permissions: string[];
}): Promise<void> {
  const permissions = onlyKnownPermissions(input.permissions);
  // Neue eigene Rollen hinter die System-Rollen einsortieren.
  const [{ max }] = await sql<{ max: number }[]>`
    SELECT COALESCE(MAX(sort_order), 100) AS max FROM roles
  `;
  try {
    await sql`
      INSERT INTO roles (key, label, description, permissions, is_system, sort_order)
      VALUES (
        ${input.key}, ${input.label}, ${input.description},
        ${permissions}, FALSE, ${max + 10}
      )
    `;
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      throw new RoleKeyTakenError("Rollen-Schlüssel wird bereits verwendet.");
    }
    throw err;
  }
  revalidateTag(ROLES_TAG, { expire: 0 });
}

// Aktualisiert Label/Beschreibung/Rechte einer Rolle (Schlüssel + is_system
// bleiben unangetastet — auch System-Rollen sind hierüber inhaltlich editierbar).
export async function updateRole(
  key: string,
  input: { label: string; description: string; permissions: string[] },
): Promise<void> {
  const permissions = onlyKnownPermissions(input.permissions);
  await sql`
    UPDATE roles
    SET label = ${input.label},
        description = ${input.description},
        permissions = ${permissions},
        updated_at = NOW()
    WHERE key = ${key}
  `;
  revalidateTag(ROLES_TAG, { expire: 0 });
}

export class RoleInUseError extends Error {}
export class SystemRoleError extends Error {}

// Löscht eine eigene Rolle. System-Rollen sind unlöschbar; eine noch
// zugewiesene Rolle (Primär- oder Zusatzrolle irgendeines Users) wird
// abgelehnt, damit keine verwaisten Schlüssel zurückbleiben.
export async function deleteRole(key: string): Promise<void> {
  const role = await getRoleByKey(key);
  if (!role) return;
  if (role.is_system) {
    throw new SystemRoleError("System-Rollen können nicht gelöscht werden.");
  }
  const [{ count }] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM users
    WHERE role = ${key} OR ${key} = ANY(additional_roles)
  `;
  if (count > 0) {
    throw new RoleInUseError(
      "Die Rolle ist noch zugewiesen und kann daher nicht gelöscht werden.",
    );
  }
  await sql`DELETE FROM roles WHERE key = ${key}`;
  revalidateTag(ROLES_TAG, { expire: 0 });
}
