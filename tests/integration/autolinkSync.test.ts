import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import { runAutolinkSync } from "@/lib/autolinkSync";
import { insertCharacter, insertMission, insertNpcEntry } from "./helpers";

// Nachziehen der Verlinkungen nach einer Umbenennung (siehe
// src/lib/autolinkSync.ts). Braucht die Datenbank, weil der Lauf alle
// Inhalte mit Markdown-Quelltext lädt und die geänderten zurückschreibt —
// die reine Textarbeit ist separat geprüft (src/lib/autolinkRename.test.ts).

async function missionWithText(title: string, sourceMd: string) {
  const mission = await insertMission({ title });
  await sql`
    UPDATE missions SET source_md = ${sourceMd} WHERE id = ${mission.id}
  `;
  return mission;
}

async function missionSource(id: number): Promise<string | null> {
  const [row] = await sql<{ source_md: string | null }[]>`
    SELECT source_md FROM missions WHERE id = ${id}
  `;
  return row?.source_md ?? null;
}

async function missionBody(id: number): Promise<string> {
  const [row] = await sql<{ body: string | null }[]>`
    SELECT metadata->>'body' AS body FROM missions WHERE id = ${id}
  `;
  return row?.body ?? "";
}

describe("runAutolinkSync", () => {
  it("verlinkt den neuen Namen in einem fremden Text", async () => {
    const npc = await insertNpcEntry({ title: "Wirtin Sareth" });
    const mission = await missionWithText(
      "Hafenrunde",
      "Am Tresen wartete Wirtin Sareth auf uns.",
    );

    const result = await runAutolinkSync({
      type: "archive",
      slug: npc.slug,
      previousName: "Sareth",
      previousAliases: [],
      name: "Wirtin Sareth",
      aliases: [],
    });

    expect(result.changed).toBe(1);
    expect(result.links).toBe(1);
    expect(await missionSource(mission.id)).toBe(
      "Am Tresen wartete [[Wirtin Sareth]] auf uns.",
    );
    // Der gespeicherte HTML-Stand trägt den fertigen Link, nicht das rohe
    // wikilink://-Schema.
    expect(await missionBody(mission.id)).toContain(`href="/archive/${npc.slug}"`);
  });

  it("zieht einen bestehenden Link auf den alten Namen mit", async () => {
    const npc = await insertNpcEntry({ title: "Wirtin Sareth" });
    const mission = await missionWithText(
      "Altes Logbuch",
      "Wir trafen [[Sareth]] im Hafen.",
    );

    const result = await runAutolinkSync({
      type: "archive",
      slug: npc.slug,
      previousName: "Sareth",
      previousAliases: [],
      name: "Wirtin Sareth",
      aliases: [],
    });

    expect(result.retargeted).toBe(1);
    expect(await missionSource(mission.id)).toBe(
      "Wir trafen [[Wirtin Sareth|Sareth]] im Hafen.",
    );
    expect(await missionBody(mission.id)).toContain(`href="/archive/${npc.slug}"`);
  });

  it("verlinkt einen neuen Alias, ohne den bisherigen Namen nachzuverlinken", async () => {
    const character = await insertCharacter({ name: "Tuvok" });
    const mission = await missionWithText(
      "Doppelte Nennung",
      "Tuvok schwieg. Der Sicherheitschef schwieg mit.",
    );

    const result = await runAutolinkSync({
      type: "character",
      slug: character.slug,
      previousName: "Tuvok",
      previousAliases: [],
      name: "Tuvok",
      aliases: ["Der Sicherheitschef"],
    });

    expect(result.changed).toBe(1);
    expect(await missionSource(mission.id)).toBe(
      "Tuvok schwieg. [[Tuvok|Der Sicherheitschef]] schwieg mit.",
    );
  });

  it("lässt den umbenannten Inhalt selbst unangetastet", async () => {
    const mission = await missionWithText(
      "Der lange Weg",
      "Der lange Weg beginnt hier.",
    );

    const result = await runAutolinkSync({
      type: "mission",
      slug: mission.slug,
      previousName: "Der Weg",
      previousAliases: [],
      name: "Der lange Weg",
      aliases: [],
    });

    expect(result.changed).toBe(0);
    expect(await missionSource(mission.id)).toBe("Der lange Weg beginnt hier.");
  });

  it("rührt nichts an, wenn Name und Aliase gleich bleiben", async () => {
    await insertNpcEntry({ title: "Wirtin Sareth" });
    const mission = await missionWithText(
      "Unberührt",
      "Wirtin Sareth stand am Tresen.",
    );

    const result = await runAutolinkSync({
      type: "archive",
      slug: "egal",
      previousName: "Wirtin Sareth",
      previousAliases: ["Die Wirtin"],
      name: "Wirtin Sareth",
      aliases: ["Die Wirtin"],
    });

    expect(result).toEqual({ changed: 0, links: 0, retargeted: 0 });
    expect(await missionSource(mission.id)).toBe("Wirtin Sareth stand am Tresen.");
  });

  it("verlinkt nicht auf einen Entwurf, schreibt aber alte Links um", async () => {
    const npc = await insertNpcEntry({ title: "Wirtin Sareth", isDraft: true });
    const mission = await missionWithText(
      "Entwurfslage",
      "Wirtin Sareth kennt [[Sareth]] gut.",
    );

    const result = await runAutolinkSync({
      type: "archive",
      slug: npc.slug,
      previousName: "Sareth",
      previousAliases: [],
      name: "Wirtin Sareth",
      aliases: [],
    });

    expect(result.retargeted).toBe(1);
    expect(result.links).toBe(0);
    expect(await missionSource(mission.id)).toBe(
      "Wirtin Sareth kennt [[Wirtin Sareth|Sareth]] gut.",
    );
  });
});
