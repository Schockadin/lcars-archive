import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  cacheTag: () => {},
  cacheLife: () => {},
  revalidateTag: () => {},
  revalidatePath: () => {},
}));
const state = vi.hoisted(() => ({
  viewer: null as import("@/lib/visibility").Viewer | null,
}));
vi.mock("@/lib/visibility", async (original) => ({
  ...(await original<typeof import("@/lib/visibility")>()),
  getViewer: async () => state.viewer,
}));
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  connection: async () => {},
}));

import sql from "@/lib/db";
import { loadExportableContent } from "@/lib/contentExport";
import { makeViewer } from "@/lib/visibility";
import { getCharacterBioMarkdown } from "@/lib/characters";
import { getMissionById, getMissionBySlug } from "@/lib/missions";
import { GET as listCharacters } from "@/app/api/characters/route";
import { GET as getCharacter } from "@/app/api/characters/[slug]/route";
import { insertCharacter, insertMission, insertUser } from "./helpers";

describe("öffentliche Content-Projektionen", () => {
  it("gibt weder Rohtext, Frontmatter noch freie Metadaten über Character-APIs aus", async () => {
    state.viewer = null;
    const character = await insertCharacter();
    await sql`UPDATE characters SET source_md = 'Öffentlich. <!-- private --> Geheimnis',
      frontmatter = '{"gm":"Geheimnis"}', bio = '<p>Öffentlich.</p>',
      metadata = '{"stats":{"secret":1},"gm":"Geheimnis","species":["Mensch"]}'
      WHERE id = ${character.id}`;

    const listResponse = await listCharacters();
    const detailResponse = await getCharacter(
      new Request("https://example.test"),
      {
        params: Promise.resolve({ slug: character.slug }),
      },
    );
    expect(listResponse.status).toBe(200);
    expect(detailResponse.status).toBe(200);
    const list = await listResponse.json();
    const detail = await detailResponse.json();
    for (const value of [list[0], detail]) {
      expect(value.bio).toBe("<p>Öffentlich.</p>");
      expect(value.metadata.species).toEqual(["Mensch"]);
      expect(value).not.toHaveProperty("source_md");
      expect(value).not.toHaveProperty("frontmatter");
      expect(value.metadata).not.toHaveProperty("stats");
      expect(JSON.stringify(value)).not.toContain("Geheimnis");
    }
    expect(await getCharacterBioMarkdown(character.id)).toBe("Öffentlich.");
  });

  it("verweigert Mission-Entwurfs-Exporte anonym und mit Spielerrechten, erlaubt die Spielleitung", async () => {
    const user = await insertUser();
    const mission = await insertMission();
    await sql`UPDATE missions SET is_draft = TRUE WHERE id = ${mission.id}`;
    for (const viewer of [null, makeViewer(user.id, ["player"])]) {
      state.viewer = viewer;
      expect(await loadExportableContent("mission", mission.slug)).toBeNull();
    }
    state.viewer = makeViewer(user.id, ["gm"]);
    expect(await loadExportableContent("mission", mission.slug)).not.toBeNull();
  });

  it("schneidet private Notizen in jedem Content-Export ab", async () => {
    state.viewer = null;
    const character = await insertCharacter();
    const mission = await insertMission();
    const source = "Freigegebener Text.\n\n<!-- private -->\nGM-Geheimnis";
    await sql`UPDATE characters SET source_md = ${source} WHERE id = ${character.id}`;
    await sql`UPDATE missions SET source_md = ${source} WHERE id = ${mission.id}`;
    expect((await getMissionBySlug(mission.slug))?.sourceMarkdown).toBe(
      "Freigegebener Text.",
    );
    // Der autorisierte Editor arbeitet weiterhin mit dem vollständigen Original.
    expect((await getMissionById(mission.id))?.sourceMarkdown).toBe(source);
    await sql`INSERT INTO mission_logs (slug, title, mission_id, author_id, content, source_md)
      VALUES ('sicherer-log', 'Bericht', ${mission.id}, ${character.id}, '<p>Freigegeben.</p>', ${source})`;
    await sql`INSERT INTO archive_entries (slug, title, category, content, source_md)
      VALUES ('sicheres-archiv', 'Archiv', 'location', '<p>Freigegeben.</p>', ${source})`;
    for (const [type, slug] of [
      ["character", character.slug],
      ["mission", mission.slug],
      ["mission_log", "sicherer-log"],
      ["archive_entry", "sicheres-archiv"],
    ] as const) {
      const content = await loadExportableContent(type, slug);
      expect(content?.bodyMarkdown).toBe("Freigegebener Text.");
    }
  });

  it("verweigert veröffentlichte Log-Exporte einer Entwurfsmission", async () => {
    const mission = await insertMission();
    const user = await insertUser();
    await sql`UPDATE missions SET is_draft = TRUE WHERE id = ${mission.id}`;
    await sql`INSERT INTO mission_logs (slug, title, mission_id, content, source_md, is_draft)
      VALUES ('log-unter-entwurf', 'Bericht', ${mission.id}, '<p>Vertraulich</p>', 'Vertraulich', FALSE)`;
    for (const viewer of [null, makeViewer(user.id, ["player"])]) {
      state.viewer = viewer;
      expect(
        await loadExportableContent("mission_log", "log-unter-entwurf"),
      ).toBeNull();
    }
    state.viewer = makeViewer(user.id, ["gm"]);
    expect(
      await loadExportableContent("mission_log", "log-unter-entwurf"),
    ).not.toBeNull();
  });
});
