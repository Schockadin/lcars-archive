import { describe, expect, it } from "vitest";
import { EMPTY_CHARACTER_STATS } from "@/lib/characterStats";
import {
  CHARACTER_JSON_FORMAT,
  CHARACTER_JSON_VERSION,
  createCharacterJsonFile,
  parseCharacterJsonFile,
} from "./characterJson";

const character = {
  name: "T'Vel",
  status: "active" as const,
  rank: "Lieutenant",
  species: ["Vulkanier"],
  homeworld: "Vulkan",
  aliases: ["T'Vel"],
  age: 32,
  dateOfBirth: "2394-03-12",
  generation: [1],
  factions: ["Sternenflotte"],
  ships: ["USS Example"],
  division: "Wissenschaft",
  tags: ["Technomage"],
  bodyMarkdown: "Eine Biografie.",
};

describe("character JSON transfer format", () => {
  it("exportiert und liest alle unterstützten Charakterdaten versioniert", () => {
    const file = createCharacterJsonFile({
      character,
      stats: {
        ...EMPTY_CHARACTER_STATS,
        characterRole: "Technomage",
        attributes: { ...EMPTY_CHARACTER_STATS.attributes, reason: 10 },
        technomage: {
          ...EMPTY_CHARACTER_STATS.technomage,
          primarySchool: "defence",
          weakSchools: ["elements", "conjuration", "movement"],
        },
      },
      exportedAt: new Date("2026-10-30T12:00:00.000Z"),
    });

    expect(file.format).toBe(CHARACTER_JSON_FORMAT);
    expect(file.version).toBe(CHARACTER_JSON_VERSION);
    expect(parseCharacterJsonFile(JSON.stringify(file))).toEqual({
      character: { ...character, stats: file.character.stats },
    });
  });

  it("weist unbekannte Versionen und ungültige Wertebereiche zurück", () => {
    const file = createCharacterJsonFile({ character, stats: EMPTY_CHARACTER_STATS });
    expect(parseCharacterJsonFile(JSON.stringify({ ...file, version: 2 }))).toMatchObject({
      error: expect.stringContaining("Version"),
    });

    const invalidStats = {
      ...file,
      character: {
        ...file.character,
        stats: {
          ...file.character.stats,
          attributes: { ...file.character.stats.attributes, reason: 99 },
        },
      },
    };
    expect(parseCharacterJsonFile(JSON.stringify(invalidStats))).toHaveProperty("error");
  });
});
