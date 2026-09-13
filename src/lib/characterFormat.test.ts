import { describe, it, expect } from "vitest";
import { normalizeCharacterMetadata } from "@/lib/characterFormat";
import type { CharacterMetadata } from "@/types/character";

// Regression: Eine Akte aus dem Vault-Ingest (oder aus der Zeit vor einem
// Feld) hat den Schlüssel gar nicht in metadata. Die Anzeige ruft darauf aber
// .length bzw. .join auf — vorher stürzte die eigene Charakterseite deshalb
// mit „Cannot read properties of undefined (reading 'length')" ab.
describe("normalizeCharakterMetadata", () => {
  it("füllt fehlende Listen mit leeren Listen auf", () => {
    const metadata = normalizeCharacterMetadata({} as CharacterMetadata);

    expect(metadata.species).toEqual([]);
    expect(metadata.aliases).toEqual([]);
    expect(metadata.tags).toEqual([]);
    expect(metadata.generation).toEqual([]);
  });

  it("macht aus fehlenden Einzelwerten null statt undefined", () => {
    const metadata = normalizeCharacterMetadata({} as CharacterMetadata);

    expect(metadata.rank).toBeNull();
    expect(metadata.homeworld).toBeNull();
    expect(metadata.age).toBeNull();
    expect(metadata.dateOfBirth).toBeNull();
    expect(metadata.affiliation).toBeNull();
    expect(metadata.player).toBeNull();
  });

  it("verträgt fehlende metadata ganz", () => {
    expect(normalizeCharacterMetadata(null).species).toEqual([]);
    expect(normalizeCharacterMetadata(undefined).tags).toEqual([]);
  });

  it("lässt gepflegte Werte unangetastet — auch unbekannte Schlüssel", () => {
    const raw = {
      rank: "Lieutenant",
      species: ["Andorianer"],
      aliases: ["Ran"],
      tags: ["Brücke"],
      generation: [2],
      homeworld: "Andoria",
      age: 34,
      dateOfBirth: "2361-04-02",
      affiliation: { factions: ["Sternenflotte"], ships: [], division: null },
      player: "Sh’Ranor",
      // Werte und Portrait-Ausschnitt hängen ebenfalls in metadata und dürfen
      // beim Auffüllen nicht verloren gehen.
      stats: { creationLocked: true },
    } as unknown as CharacterMetadata;

    expect(normalizeCharacterMetadata(raw)).toEqual(raw);
  });

  it("wirft kaputte Listen weg, statt sie durchzureichen", () => {
    const raw = { species: "Andorianer" } as unknown as CharacterMetadata;
    expect(normalizeCharacterMetadata(raw).species).toEqual([]);
  });
});
