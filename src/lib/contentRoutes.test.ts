import { describe, it, expect } from "vitest";
import {
  CHRONOLOGY_PATH,
  archiveEditHref,
  archiveListHref,
  archiveHref,
  characterEditHref,
  characterHref,
  characterLogsHref,
  characterSheetHref,
  dialogueHref,
  contentEditHref,
  missionEditHref,
  missionLogEditHref,
  MISSION_PATH,
  RESERVED_CHRONOLOGY_SEGMENTS,
  chronologyCategoryHref,
  missionHref,
  missionLogHref,
} from "./contentRoutes";
import { TIMELINE_SCOPES } from "./timelineTypes";

describe("contentRoutes", () => {
  it("legt die Missionsseiten unter die Chronologie", () => {
    expect(MISSION_PATH).toBe(`${CHRONOLOGY_PATH}/mission`);
    expect(missionHref("erste-mission")).toBe(
      "/chronologie/mission/erste-mission",
    );
    expect(missionLogHref("erste-mission", "log-1")).toBe(
      "/chronologie/mission/erste-mission/log-1",
    );
  });

  it("kennt die Leseseiten aller vier Inhaltsarten", () => {
    expect(characterHref("tuvok")).toBe("/characters/tuvok");
    expect(characterLogsHref("Tuvok")).toBe("/chronologie?scope=all&category=log&person=Tuvok");
    expect(characterSheetHref("tuvok")).toBe("/characters/tuvok/sheet");
    expect(archiveHref("erster-kontakt")).toBe("/archive/erster-kontakt");
    // Offene Gespräche liegen NICHT unter /archive.
    expect(dialogueHref("plausch")).toBe("/dialogues/plausch");
  });

  it("adressiert die Bearbeitungsseiten über die ID, nicht den Slug", () => {
    // Der Slug wandert mit dem Titel; die Bearbeitungsseite soll bleiben.
    expect(characterEditHref(7)).toBe("/user/characters/7");
    expect(missionEditHref(7)).toBe("/user/missions/7/edit");
    expect(missionLogEditHref(7)).toBe("/user/mission-logs/7/edit");
    expect(archiveEditHref(7)).toBe("/user/archive/7/edit");
  });

  it("führt aus einem Eintrag zurück in seine Kategorie-Liste", () => {
    // Der Zurück-Link der Eintragsseite — wie „‹ Missionen" auf der
    // Missionsseite zeigt er auf die Liste, aus der der Eintrag stammt.
    expect(archiveListHref("person")).toBe("/archive?cat=person");
    expect(archiveListHref(null)).toBe("/archive");
    expect(archiveListHref()).toBe("/archive");
  });

  it("führt den Bearbeiten-Stift jedes Inhaltstyps auf dessen Editor", () => {
    // Der Stift auf den Leseseiten (ActionsMenu.tsx) springt seit v1.34 für
    // ALLE vier Typen in den vollen Editor — vorher klappten drei davon nur
    // einen Inline-Editor für den Fließtext auf.
    expect(contentEditHref("character", 7)).toBe(characterEditHref(7));
    expect(contentEditHref("mission", 7)).toBe(missionEditHref(7));
    expect(contentEditHref("missionLog", 7)).toBe(missionLogEditHref(7));
    expect(contentEditHref("archiveEntry", 7)).toBe(archiveEditHref(7));
  });

  it("fällt ohne Kategorie auf die ungefilterte Chronologie zurück", () => {
    expect(chronologyCategoryHref("mission")).toBe("/chronologie/mission");
    expect(chronologyCategoryHref(null)).toBe(CHRONOLOGY_PATH);
    expect(chronologyCategoryHref()).toBe(CHRONOLOGY_PATH);
  });

  it("hält die gesperrten Segmente deckungsgleich mit den Umfängen", () => {
    // RESERVED_CHRONOLOGY_SEGMENTS steht in contentRoutes.ts als Literal, damit
    // das Modul ohne Abhängigkeiten auch aus den Ingest-Skripten importierbar
    // bleibt — dieser Test ersetzt die fehlende Ableitung.
    expect([...RESERVED_CHRONOLOGY_SEGMENTS].sort()).toEqual(
      TIMELINE_SCOPES.map((scope) => scope.key as string).sort(),
    );
  });
});
