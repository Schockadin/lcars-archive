import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  createCharacter,
  updateOwnCharacterContent,
  setCharacterVisibility,
  assignCharacterToUser,
  getPublicCharactersForUser,
  getCharactersForParticipantPicker,
} from "@/lib/characters";
import { insertUser, insertCharacter } from "./helpers";

function baseCharacterInput(overrides: Partial<Parameters<typeof createCharacter>[0]> = {}) {
  return {
    name: "Desmond Hobbes",
    status: "active" as const,
    portrait: null,
    rank: null,
    species: [],
    homeworld: null,
    aliases: [],
    age: null,
    generation: [],
    factions: [],
    ships: [],
    division: null,
    tags: [],
    bodyMarkdown: "",
    ownerUserId: 0,
    ...overrides,
  };
}

describe("createCharacter", () => {
  it("creates a character owned by the given user with a public default visibility", async () => {
    const user = await insertUser();

    const result = await createCharacter(
      baseCharacterInput({ ownerUserId: user.id }),
    );

    expect(result.slug).toBeTruthy();
    const [row] = await sql<{ player_id: number; visibility: string }[]>`
      SELECT player_id, visibility FROM characters WHERE id = ${result.id}
    `;
    expect(row.player_id).toBe(user.id);
    expect(row.visibility).toBe("public");
  });

  it("de-duplicates slugs for characters with the same name", async () => {
    const user = await insertUser();

    const first = await createCharacter(
      baseCharacterInput({ ownerUserId: user.id, name: "Frederick Helben" }),
    );
    const second = await createCharacter(
      baseCharacterInput({ ownerUserId: user.id, name: "Frederick Helben" }),
    );

    expect(first.slug).not.toBe(second.slug);
    expect(second.slug).toBe(`${first.slug}-2`);
  });

  it("stores metadata affiliation as null when no faction/ship/division is given", async () => {
    const user = await insertUser();
    const result = await createCharacter(
      baseCharacterInput({ ownerUserId: user.id }),
    );

    const [row] = await sql<{ metadata: { affiliation: unknown } }[]>`
      SELECT metadata FROM characters WHERE id = ${result.id}
    `;
    expect(row.metadata.affiliation).toBeNull();
  });
});

describe("updateOwnCharacterContent", () => {
  it("updates a character when the requesting user is the owner", async () => {
    const owner = await insertUser();
    const character = await insertCharacter({ playerId: owner.id });

    const result = await updateOwnCharacterContent(
      owner.id,
      character.id,
      baseCharacterInput({ name: "Neuer Name" }),
    );

    expect(result?.slug).toBe(character.slug);
    const [row] = await sql<{ name: string }[]>`
      SELECT name FROM characters WHERE id = ${character.id}
    `;
    expect(row.name).toBe("Neuer Name");
  });

  it("returns null and changes nothing when the requesting user is not the owner", async () => {
    const owner = await insertUser();
    const intruder = await insertUser();
    const character = await insertCharacter({
      playerId: owner.id,
      name: "Ursprünglicher Name",
    });

    const result = await updateOwnCharacterContent(
      intruder.id,
      character.id,
      baseCharacterInput({ name: "Gehackter Name" }),
    );

    expect(result).toBeNull();
    const [row] = await sql<{ name: string }[]>`
      SELECT name FROM characters WHERE id = ${character.id}
    `;
    expect(row.name).toBe("Ursprünglicher Name");
  });
});

describe("setCharacterVisibility", () => {
  it("lets the owner change visibility", async () => {
    const owner = await insertUser();
    const character = await insertCharacter({
      playerId: owner.id,
      visibility: "public",
    });

    const result = await setCharacterVisibility(owner.id, character.id, "private");

    expect(result?.slug).toBe(character.slug);
    const [row] = await sql<{ visibility: string }[]>`
      SELECT visibility FROM characters WHERE id = ${character.id}
    `;
    expect(row.visibility).toBe("private");
  });

  it("does not let a non-owner change visibility", async () => {
    const owner = await insertUser();
    const intruder = await insertUser();
    const character = await insertCharacter({
      playerId: owner.id,
      visibility: "public",
    });

    const result = await setCharacterVisibility(
      intruder.id,
      character.id,
      "private",
    );

    expect(result).toBeNull();
    const [row] = await sql<{ visibility: string }[]>`
      SELECT visibility FROM characters WHERE id = ${character.id}
    `;
    expect(row.visibility).toBe("public");
  });
});

describe("assignCharacterToUser", () => {
  it("assigns a character to a user", async () => {
    const user = await insertUser();
    const character = await insertCharacter({ playerId: null });

    const result = await assignCharacterToUser(character.id, user.id);

    expect(result?.player_id).toBe(user.id);
  });

  it("unassigns a character when userId is null", async () => {
    const user = await insertUser();
    const character = await insertCharacter({ playerId: user.id });

    const result = await assignCharacterToUser(character.id, null);

    expect(result?.player_id).toBeNull();
  });
});

describe("getPublicCharactersForUser", () => {
  it("only returns the user's public characters, not their private/gm ones", async () => {
    const user = await insertUser();
    const pub = await insertCharacter({ playerId: user.id, visibility: "public" });
    await insertCharacter({ playerId: user.id, visibility: "private" });
    await insertCharacter({ playerId: user.id, visibility: "gm" });

    const result = await getPublicCharactersForUser(user.id);

    expect(result.map((c) => c.slug)).toEqual([pub.slug]);
  });

  it("returns an empty array for a user with no public characters", async () => {
    const user = await insertUser();
    await insertCharacter({ playerId: user.id, visibility: "private" });

    const result = await getPublicCharactersForUser(user.id);

    expect(result).toEqual([]);
  });
});

describe("getCharactersForParticipantPicker", () => {
  it("includes status so the picker can hide inactive characters by default", async () => {
    const user = await insertUser();
    const active = await insertCharacter({ playerId: user.id, status: "active" });
    const retired = await insertCharacter({ playerId: user.id, status: "retired" });

    const result = await getCharactersForParticipantPicker();

    const byId = new Map(result.map((c) => [c.id, c]));
    expect(byId.get(active.id)?.status).toBe("active");
    expect(byId.get(retired.id)?.status).toBe("retired");
  });
});
