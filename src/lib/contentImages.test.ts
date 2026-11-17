import { describe, it, expect } from "vitest";
import { canManageContentImages, canViewContentImage } from "./contentImages";
import type { Viewer } from "./visibility";

// Baut einen minimalen Viewer mit exakt den angegebenen Rechten — der
// Bild-Verwaltungs-Check liest nur permissions/userId.
function viewer(userId: number, permissions: Viewer["permissions"]): Viewer {
  return { userId, role: "player", permissions };
}

describe("canViewContentImage", () => {
  it("erlaubt ein veröffentlichtes Bild, aber keinen fremden Entwurf", () => {
    expect(
      canViewContentImage("character", { isDraft: false, ownerId: 7 }, null),
    ).toBe(true);
    expect(
      canViewContentImage(
        "character",
        { isDraft: true, ownerId: 7 },
        viewer(8, []),
      ),
    ).toBe(false);
    expect(
      canViewContentImage(
        "character",
        { isDraft: true, ownerId: 7 },
        viewer(7, []),
      ),
    ).toBe(true);
  });

  it("wendet auf Missionsentwürfe das GM-Gate statt Owner-Freigabe an", () => {
    const access = { isDraft: true, ownerId: 7 };
    expect(canViewContentImage("mission", access, viewer(7, []))).toBe(false);
    expect(
      canViewContentImage("mission", access, viewer(8, ["missions.manage"])),
    ).toBe(true);
  });

  it("verlangt für Log-Bilder beide Gates einschließlich der übergeordneten Mission", () => {
    const access = { isDraft: false, ownerId: 7, parentIsDraft: true };
    expect(canViewContentImage("mission_log", access, null)).toBe(false);
    expect(canViewContentImage("mission_log", access, viewer(7, []))).toBe(
      false,
    );
    expect(
      canViewContentImage(
        "mission_log",
        access,
        viewer(8, ["missions.manage"]),
      ),
    ).toBe(true);
    expect(
      canViewContentImage(
        "mission_log",
        { ...access, isDraft: true },
        viewer(8, ["missions.manage"]),
      ),
    ).toBe(false);
  });
});

describe("canManageContentImages", () => {
  it("erlaubt dem Owner die Verwaltung bei jedem Inhaltstyp", () => {
    const owner = viewer(7, []);
    for (const type of [
      "character",
      "mission",
      "mission_log",
      "archive_entry",
      "timeline_event",
    ] as const) {
      expect(canManageContentImages(type, 7, owner)).toBe(true);
    }
  });

  it("erlaubt content.moderate bei Missionen und Datenbank-Einträgen (fremder Inhalt)", () => {
    const mod = viewer(1, ["content.moderate"]);
    expect(canManageContentImages("mission", 999, mod)).toBe(true);
    expect(canManageContentImages("archive_entry", 999, mod)).toBe(true);
    expect(canManageContentImages("timeline_event", 999, mod)).toBe(true);
  });

  it("verweigert content.moderate bei Charakteren/Missionslogs (owner-only)", () => {
    const mod = viewer(1, ["content.moderate"]);
    expect(canManageContentImages("character", 999, mod)).toBe(false);
    expect(canManageContentImages("mission_log", 999, mod)).toBe(false);
  });

  it("verweigert ohne content.moderate — die Primärrolle allein zählt nicht mehr", () => {
    // Früher hing die Freigabe an role === "admin"; ein Viewer ohne das
    // content.moderate-Recht darf fremde Bilder jetzt nicht verwalten,
    // unabhängig von seiner Rolle.
    const noModerate = viewer(1, ["content.view_all", "admin.access"]);
    expect(canManageContentImages("mission", 999, noModerate)).toBe(false);
    expect(canManageContentImages("archive_entry", 999, noModerate)).toBe(
      false,
    );
  });

  it("verweigert einem anonymen Betrachter", () => {
    expect(canManageContentImages("mission", 1, null)).toBe(false);
  });
});
