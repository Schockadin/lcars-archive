import { describe, it, expect } from "vitest";
import {
  CHRONOLOGY_PATH,
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
