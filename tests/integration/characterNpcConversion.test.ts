import { describe, expect, it } from "vitest";
import sql from "@/lib/db";
import {
  convertOwnedCharacterToNpc,
  restoreOwnedCharacterFromNpc,
} from "@/lib/characterNpcConversion";
import { getCharactersForUser, getOwnCharacterForEdit } from "@/lib/characters";
import { insertCharacter, insertUser } from "./helpers";

describe("Charaktere reversibel in NPCs umwandeln", () => {
  it("übernimmt Akte und Biografie, blendet den Charakter aus und stellt ihn wieder her", async () => {
    const owner = await insertUser();
    const character = await insertCharacter({
      name: "Mira Venn",
      playerId: owner.id,
      status: "retired",
    });
    await sql`
      UPDATE characters
      SET source_md = 'Ehemalige Chefingenieurin.',
          metadata = ${sql.json({
            rank: "Commander",
            species: ["Vulkanierin"],
            homeworld: "Vulkan",
            age: 81,
            dateOfBirth: null,
            affiliation: {
              factions: ["Sternenflotte"],
              ships: ["USS Enterprise"],
              division: "Technik",
            },
            aliases: ["Mira"],
            generation: [1],
            tags: ["legacy"],
          })}
      WHERE id = ${character.id}
    `;

    const converted = await convertOwnedCharacterToNpc(owner.id, character.id);
    expect(converted.status).toBe("converted");
    if (converted.status !== "converted") throw new Error("Conversion fehlte");

    const [npc] = await sql<
      {
        category: string;
        title: string;
        content: string;
        tags: string[];
        owner_user_id: number;
      }[]
    >`
      SELECT category, title, content, tags, owner_user_id
      FROM archive_entries
      WHERE slug = ${converted.npcSlug}
    `;
    expect(npc).toMatchObject({
      category: "npc",
      title: "Mira Venn",
      tags: ["legacy"],
      owner_user_id: owner.id,
    });
    expect(npc.content).toContain("Commander");
    expect(npc.content).toContain("Ehemalige Chefingenieurin.");
    expect(
      (await getCharactersForUser(owner.id)).some(
        (entry) => entry.id === character.id,
      ),
    ).toBe(false);
    expect(
      (await getOwnCharacterForEdit(owner.id, character.id))?.npcSlug,
    ).toBe(converted.npcSlug);

    const restored = await restoreOwnedCharacterFromNpc(owner.id, character.id);
    expect(restored).toMatchObject({
      status: "restored",
      characterSlug: character.slug,
      npcSlug: converted.npcSlug,
    });
    const [characterRow] = await sql<{ status: string }[]>`
      SELECT status FROM characters WHERE id = ${character.id}
    `;
    const [npcRow] = await sql<{ deleted_at: Date | null }[]>`
      SELECT deleted_at FROM archive_entries WHERE slug = ${converted.npcSlug}
    `;
    expect(characterRow.status).toBe("retired");
    expect(npcRow.deleted_at).not.toBeNull();
    expect(
      (await getCharactersForUser(owner.id)).some(
        (entry) => entry.id === character.id,
      ),
    ).toBe(true);
    expect(
      (await getOwnCharacterForEdit(owner.id, character.id))?.npcSlug,
    ).toBeNull();
  });

  it("verhindert fremde und aktive Charaktere sowie doppelte Umwandlung", async () => {
    const owner = await insertUser();
    const otherUser = await insertUser();
    const inactive = await insertCharacter({
      playerId: owner.id,
      status: "deceased",
    });
    const active = await insertCharacter({
      playerId: owner.id,
      status: "active",
    });

    expect(await convertOwnedCharacterToNpc(otherUser.id, inactive.id)).toEqual(
      { status: "not-found" },
    );
    expect(await convertOwnedCharacterToNpc(owner.id, active.id)).toEqual({
      status: "active",
    });

    const converted = await convertOwnedCharacterToNpc(owner.id, inactive.id);
    expect(converted.status).toBe("converted");
    expect(await convertOwnedCharacterToNpc(owner.id, inactive.id)).toEqual({
      status: "already-converted",
    });
  });
});
