import { describe, it, expect } from "vitest";
import { DEFAULT_ROLE_PRESETS, type RoleMap } from "./permissions";
import {
  mayImport,
  allowedImportTypes,
  IMPORT_CONTENT_TYPES,
  type ImporterRoles,
} from "./importAccess";

const roleMap: RoleMap = DEFAULT_ROLE_PRESETS;

function person(
  role: ImporterRoles["role"],
  overrides: Partial<ImporterRoles> = {},
): ImporterRoles {
  return {
    role,
    additional_roles: [],
    permission_overrides: {},
    ...overrides,
  };
}

// Der Kern dieser Datei: Der Import darf nirgends mehr erlauben als das
// normale Anlege-Formular derselben Inhaltsart. Die Gegenprobe steht daneben
// in den Actions (tests/integration/userImport.test.ts) — hier nur die
// Matrix selbst.
describe("mayImport", () => {
  it("lässt jede eingeloggte Person Datenbank-Einträge hochladen", () => {
    // Wie archiveEntryAction, die ebenfalls nur die Session prüft — auch ein
    // Gast-Konto darf Einträge anlegen.
    for (const role of ["guest", "viewer", "player", "gm", "admin"] as const) {
      expect(mayImport(person(role), roleMap, "archive")).toBe(true);
    }
  });

  it("verlangt für Charakter und Logbuch content.create", () => {
    expect(mayImport(person("player"), roleMap, "character")).toBe(true);
    expect(mayImport(person("player"), roleMap, "mission_log")).toBe(true);
    // guest/viewer haben kein content.create — und dürfen über den normalen
    // Weg auch keine Charaktere anlegen.
    expect(mayImport(person("guest"), roleMap, "character")).toBe(false);
    expect(mayImport(person("viewer"), roleMap, "mission_log")).toBe(false);
  });

  it("verlangt für Missionen missions.manage", () => {
    expect(mayImport(person("gm"), roleMap, "mission")).toBe(true);
    expect(mayImport(person("player"), roleMap, "mission")).toBe(false);
  });

  // Die Ausnahme, ohne die /admin/import kaputtginge: Das admin-Preset trägt
  // weder content.create noch missions.manage — nach der Matrix allein
  // stünde einem reinen Admin-Konto nur der Datenbank-Eintrag offen.
  it("lässt die Administration alle vier Arten hochladen", () => {
    const admin = person("admin");
    expect(roleMap.admin).not.toContain("content.create");
    expect(roleMap.admin).not.toContain("missions.manage");
    for (const type of IMPORT_CONTENT_TYPES) {
      expect(mayImport(admin, roleMap, type)).toBe(true);
    }
  });

  // Die Rechte kommen aus der (DB-gestützten) Rollen-Map, nicht aus der
  // Primärrolle allein — sonst liefe die Schranke hier an der auseinander,
  // die das normale Formular anlegt.
  it("zählt Zusatzrollen und Overrides mit", () => {
    const mitZusatzrolle = person("viewer", { additional_roles: ["player"] });
    expect(mayImport(mitZusatzrolle, roleMap, "character")).toBe(true);

    const entzogen = person("player", {
      permission_overrides: { "content.create": false },
    });
    expect(mayImport(entzogen, roleMap, "character")).toBe(false);
    // Der Datenbank-Eintrag hängt an keinem Recht und bleibt trotzdem offen.
    expect(mayImport(entzogen, roleMap, "archive")).toBe(true);
  });
});

describe("allowedImportTypes", () => {
  it("gibt die Arten in der Reihenfolge der Auswahlliste", () => {
    expect(allowedImportTypes(person("admin"), roleMap)).toEqual([
      ...IMPORT_CONTENT_TYPES,
    ]);
  });

  it("lässt einem Spieler alles außer Missionen", () => {
    expect(allowedImportTypes(person("player"), roleMap)).toEqual([
      "archive",
      "character",
      "mission_log",
    ]);
  });

  // Die Liste kann nie leer werden — sonst stünde der Import-Knopf vor einer
  // Seite ohne einzige wählbare Art (siehe NewContentButtons).
  it("bleibt selbst für ein Gast-Konto nicht leer", () => {
    expect(allowedImportTypes(person("guest"), roleMap)).toEqual(["archive"]);
  });
});
