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
          portrait = 'https://images.example.test/mira-venn.png',
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
        source_md: string;
        tags: string[];
        owner_user_id: number;
      }[]
    >`
      SELECT category, title, content, source_md, tags, owner_user_id
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
    expect(npc.source_md).toContain(
      "![Profilbild](<https://images.example.test/mira-venn.png>)",
    );
    expect(npc.content).toContain("https://images.example.test/mira-venn.png");
    const [npcCard] = await sql<{ portrait: string | null }[]>`
      SELECT c.portrait
      FROM archive_entries a
      JOIN character_npc_conversions conversion
        ON conversion.archive_entry_id = a.id
      JOIN characters c ON c.id = conversion.character_id
      WHERE a.slug = ${converted.npcSlug}
    `;
    expect(npcCard.portrait).toBe("https://images.example.test/mira-venn.png");
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
    const [characterRow] = await sql<{
      status: string;
      portrait: string | null;
    }[]>`
      SELECT status, portrait FROM characters WHERE id = ${character.id}
    `;
    const [npcRow] = await sql<{ deleted_at: Date | null }[]>`
      SELECT deleted_at FROM archive_entries WHERE slug = ${converted.npcSlug}
    `;
    expect(characterRow.status).toBe("retired");
    expect(characterRow.portrait).toBe("https://images.example.test/mira-venn.png");
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

  it("ignoriert nichttextuelle Alt-Metadaten bei der NPC-Umwandlung", async () => {
    const owner = await insertUser();
    const character = await insertCharacter({
      name: "T'Raal",
      playerId: owner.id,
      status: "retired",
    });
    await sql`
      UPDATE characters
      SET metadata = ${sql.json({
        rank: 4,
        homeworld: { name: "Vulcan" },
        dateOfBirth: 2380,
        affiliation: {
          factions: [],
          ships: [],
          division: 12,
        },
      })}
      WHERE id = ${character.id}
    `;

    const converted = await convertOwnedCharacterToNpc(owner.id, character.id);
    expect(converted.status).toBe("converted");
    if (converted.status !== "converted") throw new Error("Conversion fehlte");

    const [npc] = await sql<{ source_md: string }[]>`
      SELECT source_md FROM archive_entries WHERE slug = ${converted.npcSlug}
    `;
    expect(npc.source_md).toContain("- **Status:** Inaktiv");
    expect(npc.source_md).not.toContain("- **Rang:**");
    expect(npc.source_md).not.toContain("- **Heimatwelt:**");
    expect(npc.source_md).not.toContain("- **Geburtsdatum:**");
    expect(npc.source_md).not.toContain("- **Division:**");
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
