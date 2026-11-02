import type { Character } from "@/types/character";
import type { CharacterStats } from "@/types/characterStats";
import { parseStatsPayload } from "@/lib/characterStatsPayload";

export const CHARACTER_JSON_FORMAT = "lcars-archive.character";
export const CHARACTER_JSON_VERSION = 1;
export const MAX_CHARACTER_JSON_BYTES = 900_000;

export interface CharacterJsonData {
  name: string;
  status: Character["status"];
  rank: string | null;
  species: string[];
  homeworld: string | null;
  aliases: string[];
  age: number | null;
  dateOfBirth: string | null;
  generation: number[];
  factions: string[];
  ships: string[];
  division: string | null;
  tags: string[];
  bodyMarkdown: string;
  stats: CharacterStats;
}

export interface CharacterJsonFile {
  format: typeof CHARACTER_JSON_FORMAT;
  version: typeof CHARACTER_JSON_VERSION;
  exportedAt: string;
  character: CharacterJsonData;
}

export type CharacterJsonParseResult =
  | { character: CharacterJsonData }
  | { error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" || value.length > maxLength) return null;
  return value.trim();
}

function readOptionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null) return null;
  return readText(value, maxLength) ?? undefined;
}

function readTextList(value: unknown, maxItems = 100): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const result: string[] = [];
  for (const item of value) {
    const text = readText(item, 1_000);
    if (text === null || !text) return null;
    result.push(text);
  }
  return result;
}

function readNumberList(value: unknown, maxItems = 100): number[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  if (value.some((item) => !Number.isSafeInteger(item) || item < -999_999 || item > 999_999)) {
    return null;
  }
  return value as number[];
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

export function createCharacterJsonFile(input: {
  character: Omit<CharacterJsonData, "stats">;
  stats: CharacterStats;
  exportedAt?: Date;
}): CharacterJsonFile {
  return {
    format: CHARACTER_JSON_FORMAT,
    version: CHARACTER_JSON_VERSION,
    exportedAt: (input.exportedAt ?? new Date()).toISOString(),
    character: { ...input.character, stats: input.stats },
  };
}

export function parseCharacterJsonFile(raw: string): CharacterJsonParseResult {
  if (new TextEncoder().encode(raw).byteLength > MAX_CHARACTER_JSON_BYTES) {
    return { error: "Die JSON-Datei ist zu groß (maximal 900 KB)." };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { error: "Die Datei enthält kein gültiges JSON." };
  }

  if (!isRecord(value) || value.format !== CHARACTER_JSON_FORMAT || value.version !== CHARACTER_JSON_VERSION) {
    return { error: "Das Dateiformat oder die Version wird nicht unterstützt." };
  }

  const source = value.character;
  if (!isRecord(source)) return { error: "Die Charakterdaten fehlen." };

  const name = readText(source.name, 500);
  if (!name) return { error: "Der Charaktername fehlt oder ist ungültig." };
  if (!["active", "retired", "deceased"].includes(String(source.status))) {
    return { error: "Der Charakterstatus ist ungültig." };
  }

  const rank = readOptionalText(source.rank, 1_000);
  const homeworld = readOptionalText(source.homeworld, 1_000);
  const division = readOptionalText(source.division, 1_000);
  if (rank === undefined || homeworld === undefined || division === undefined) {
    return { error: "Ein Feld der Personalakte enthält ungültige Textdaten." };
  }

  const species = readTextList(source.species);
  const aliases = readTextList(source.aliases);
  const generation = readNumberList(source.generation);
  const factions = readTextList(source.factions);
  const ships = readTextList(source.ships);
  const tags = readTextList(source.tags);
  if (!species || !aliases || !generation || !factions || !ships || !tags) {
    return { error: "Eine Liste in der Personalakte enthält ungültige Daten." };
  }

  const age = source.age === null ? null : source.age;
  if (age !== null && (
    typeof age !== "number" ||
    !Number.isSafeInteger(age) ||
    age < 0 ||
    age > 999_999
  )) {
    return { error: "Das Alter ist ungültig." };
  }
  const dateOfBirth = readOptionalText(source.dateOfBirth, 10);
  if (dateOfBirth === undefined || (dateOfBirth !== null && !validDate(dateOfBirth))) {
    return { error: "Das Geburtsdatum ist ungültig." };
  }

  if (typeof source.bodyMarkdown !== "string" || source.bodyMarkdown.length > MAX_CHARACTER_JSON_BYTES) {
    return { error: "Die Biografie fehlt oder ist zu lang." };
  }
  if (!isRecord(source.stats)) return { error: "Die Charakterwerte fehlen." };
  const stats = parseStatsPayload(source.stats);
  if ("error" in stats) return stats;
  // Das Format enthält den vollständigen, normalisierten STA-Bogen. Wenn ein
  // Feld beim toleranten Lesen verworfen oder verändert würde, soll der
  // Import lieber scheitern, statt unbemerkt einen Teil der Sicherung zu verlieren.
  if (stableJson(stats.stats) !== stableJson(source.stats)) {
    return { error: "Die Charakterwerte enthalten ungültige oder unbekannte Daten." };
  }

  return {
    character: {
      name,
      status: source.status as Character["status"],
      rank,
      species,
      homeworld,
      aliases,
      age,
      dateOfBirth,
      generation,
      factions,
      ships,
      division,
      tags,
      bodyMarkdown: source.bodyMarkdown,
      stats: stats.stats,
    },
  };
}
