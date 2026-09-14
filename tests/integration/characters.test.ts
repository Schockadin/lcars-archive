import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  createCharacter,
  updateOwnCharacterContent,
  setCharacterDraft,
  assignCharacterToUser,
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
    isDraft: false,
    ...overrides,
  };
}

describe("createCharacter", () => {
  it("creates a character owned by the given user, published by default", async () => {
    const user = await insertUser();

    const result = await createCharacter(
      baseCharacterInput({ ownerUserId: user.id }),
    );

    expect(result.slug).toBeTruthy();
    const [row] = await sql<{ player_id: number; is_draft: boolean }[]>`
      SELECT player_id, is_draft FROM characters WHERE id = ${result.id}
    `;
    expect(row.player_id).toBe(user.id);
    expect(row.is_draft).toBe(false);
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

describe("setCharacterDraft", () => {
  it("lets the owner pull a character back to a draft", async () => {
    const owner = await insertUser();
    const character = await insertCharacter({ playerId: owner.id });

    const result = await setCharacterDraft(owner.id, character.id, true);

    expect(result?.slug).toBe(character.slug);
    const [row] = await sql<{ is_draft: boolean }[]>`
      SELECT is_draft FROM characters WHERE id = ${character.id}
    `;
    expect(row.is_draft).toBe(true);
  });

  it("does not let a non-owner change the state", async () => {
    const owner = await insertUser();
    const intruder = await insertUser();
    const character = await insertCharacter({ playerId: owner.id });

    const result = await setCharacterDraft(intruder.id, character.id, true);

    expect(result).toBeNull();
    const [row] = await sql<{ is_draft: boolean }[]>`
      SELECT is_draft FROM characters WHERE id = ${character.id}
    `;
    expect(row.is_draft).toBe(false);
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
