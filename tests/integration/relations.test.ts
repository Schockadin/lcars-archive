import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import { getRelationsOf } from "@/lib/relations";
import { insertCharacter, insertNpcEntry } from "./helpers";

// Die dritte Beziehungsquelle: Verlinkungen zwischen Charakteren und NPCs.
// Anders als Missionen und Gespräche hängt sie an Wikilinks im Fließtext und
// an den Verweisfeldern — beides wird hier gegen die echte Datenbank geprüft,
// weil genau die Abfragen (jsonb-Verweise, archive_links) die fehleranfällige
// Stelle sind. Die reine Auswertung steckt in src/lib/relations.test.ts.

async function setSourceMd(
  table: "characters" | "archive_entries",
  slug: string,
  md: string,
): Promise<void> {
  if (table === "characters") {
    await sql`UPDATE characters SET source_md = ${md} WHERE slug = ${slug}`;
  } else {
    await sql`UPDATE archive_entries SET source_md = ${md} WHERE slug = ${slug}`;
  }
}

async function setCharacterRefs(
  entrySlug: string,
  refs: { slug: string; name: string }[],
): Promise<void> {
  await sql`
    UPDATE archive_entries
    SET metadata = jsonb_set(metadata, '{characters}', ${sql.json(refs as unknown as ReturnType<typeof JSON.parse>)})
    WHERE slug = ${entrySlug}
  `;
}

describe("getRelationsOf — Verlinkungen", () => {
  it("verbindet eine Figur mit dem NPC, den sie im Text verlinkt", async () => {
    const character = await insertCharacter({ slug: "tuvok", name: "Tuvok" });
    const npc = await insertNpcEntry({ slug: "sareth", title: "Wirtin Sareth" });
    await setSourceMd(
      "characters",
      character.slug,
      "Kennt [[Wirtin Sareth]] seit Jahren.",
    );

    const relations = await getRelationsOf(character.slug);

    expect(relations).toHaveLength(1);
    expect(relations[0]).toMatchObject({
      slug: npc.slug,
      name: "Wirtin Sareth",
      kind: "npc",
      href: "/archive/sareth",
      sharedMissions: 0,
      sharedDialogues: 0,
      sharedLinks: 1,
    });
  });

  it("zählt eine gegenseitige Verlinkung doppelt", async () => {
    await insertCharacter({ slug: "tuvok", name: "Tuvok" });
    await insertNpcEntry({ slug: "sareth", title: "Wirtin Sareth" });
    await setSourceMd("characters", "tuvok", "Über [[Wirtin Sareth]].");
    await setSourceMd("archive_entries", "sareth", "Bedient [[Tuvok]] gern.");

    const [relation] = await getRelationsOf("tuvok");

    expect(relation.sharedLinks).toBe(2);
  });

  it("nimmt auch den Verweis aus dem Verweisfeld eines NPC-Eintrags", async () => {
    await insertCharacter({ slug: "tuvok", name: "Tuvok" });
    await insertNpcEntry({ slug: "sareth", title: "Wirtin Sareth" });
    await setCharacterRefs("sareth", [{ slug: "tuvok", name: "Tuvok" }]);

    const [relation] = await getRelationsOf("tuvok");

    expect(relation).toMatchObject({ slug: "sareth", sharedLinks: 1 });
  });

  it("verschweigt einen NPC, der noch ein Entwurf ist", async () => {
    // Seit v1.34 gibt es keine Zwischenstufe mehr: Ein Entwurf ist für
    // niemanden ein Knoten — auch nicht für die Spielleitung.
    await insertCharacter({ slug: "tuvok", name: "Tuvok" });
    await insertNpcEntry({
      slug: "sareth",
      title: "Wirtin Sareth",
      isDraft: true,
    });
    await setSourceMd("characters", "tuvok", "Über [[Wirtin Sareth]].");

    expect(await getRelationsOf("tuvok")).toEqual([]);
  });

  it("verlinkt sich nicht selbst und nicht ins Leere", async () => {
    await insertCharacter({ slug: "tuvok", name: "Tuvok" });
    await setSourceMd(
      "characters",
      "tuvok",
      "[[Tuvok]] denkt an [[Die lange Nacht]].",
    );

    expect(await getRelationsOf("tuvok")).toEqual([]);
  });
});
