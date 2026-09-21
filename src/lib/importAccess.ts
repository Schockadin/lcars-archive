import { userCan, type Permission, type Role, type RoleMap } from "@/lib/permissions";

// Wer darf welche Inhaltsart per Markdown hochladen?
//
// Der Upload war bis v1.49 der Administration vorbehalten (siehe den
// Changelog-Eintrag zu 1.49), und der
// Kopfkommentar von src/lib/markdownImport.ts stützte seine Unbedenklichkeit
// genau darauf: Die *Edits-Objekte überschreiben das geparste Frontmatter
// vollständig — einschließlich des EIGENTÜMERS. Das ist harmlos, solange nur
// Administration die Actions erreicht, und wäre es nicht mehr, sobald jede
// eingeloggte Person sie erreicht.
//
// Deshalb hier eine eigene Schranke, und zwar dieselbe wie beim normalen
// Anlegen desselben Inhalts — der Import soll ein bequemerer Weg zum selben
// Ziel sein, kein zweiter Weg an den Regeln vorbei:
//
//   Datenbank-Eintrag  jede eingeloggte Person (wie archiveEntryAction, die
//                      ebenfalls nur die Session prüft)
//   Charakter          content.create (wie der Anlege-Assistent; Gast-Konten
//                      dürfen keine anlegen)
//   Missionslog        content.create — zusätzlich muss die angegebene
//                      Autoren-Figur dem Aufrufer gehören (siehe
//                      ownsCharacterSlug in src/lib/characters.ts)
//   Mission            missions.manage (wie /user/missions/new)
//
// Zwei Dinge erzwingen die Actions (src/app/_shared/import/actions.ts)
// zusätzlich für alle außer der Administration: der Eigentümer ist der
// Aufrufer selbst (ownerSlug aus der Datei wird verworfen), und ein Logbuch
// lässt sich nur einer eigenen Figur zuschreiben. Diese Datei sagt nur, WER
// WAS hochladen darf — die beiden Korrekturen stehen dort, weil sie den
// Aufrufer brauchen.

export type ImportContentType =
  | "archive"
  | "mission"
  | "character"
  | "mission_log";

export const IMPORT_CONTENT_TYPES: readonly ImportContentType[] = [
  "archive",
  "mission",
  "character",
  "mission_log",
];

// null = keine besondere Berechtigung nötig, die Session genügt.
const IMPORT_PERMISSION: Record<ImportContentType, Permission | null> = {
  archive: null,
  character: "content.create",
  mission_log: "content.create",
  mission: "missions.manage",
};

// Dieselbe strukturelle Form, die auch userCan verlangt — kein volles
// User-Objekt, damit dieses Modul DB- und "server-only"-frei bleibt und sich
// wie permissions.ts direkt unit-testen lässt.
export interface ImporterRoles {
  role: Role;
  additional_roles: Role[];
  permission_overrides: Record<string, boolean>;
}

export function mayImport(
  user: ImporterRoles,
  roleMap: RoleMap,
  contentType: ImportContentType,
): boolean {
  // Die Administration darf alle vier Arten. Nicht abkürzend gemeint,
  // sondern notwendig: Das admin-Preset enthält weder content.create noch
  // missions.manage (siehe DEFAULT_ROLE_PRESETS) — ohne diese Zeile stünde
  // einem reinen Admin-Konto unter /admin/import nur noch der
  // Datenbank-Eintrag zur Wahl, und genau dort ist der Umzug beliebiger
  // Vault-Inhalte der Zweck der Seite.
  if (userCan(user, "admin.access", roleMap)) return true;

  const needed = IMPORT_PERMISSION[contentType];
  return needed === null || userCan(user, needed, roleMap);
}

// Die Arten, die diese Person hochladen darf — steuert die Auswahlliste im
// Panel. Leer kann sie nicht werden: Datenbank-Einträge darf jede eingeloggte
// Person anlegen.
export function allowedImportTypes(
  user: ImporterRoles,
  roleMap: RoleMap,
): ImportContentType[] {
  return IMPORT_CONTENT_TYPES.filter((type) => mayImport(user, roleMap, type));
}
