import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  previewArchiveMarkdown,
  commitArchiveMarkdown,
  previewMissionMarkdown,
  commitMissionMarkdown,
  previewCharacterMarkdown,
  commitCharacterMarkdown,
  previewMissionLogMarkdown,
  commitMissionLogMarkdown,
  type ArchiveImportEdits,
  type MissionImportEdits,
  type CharacterImportEdits,
  type MissionLogImportEdits,
} from "@/lib/markdownImport";
import { insertUser, insertMission, insertCharacter } from "./helpers";

function archiveMd(overrides: Record<string, string> = {}, body = "Inhalt.") {
  const fm = {
    type: "archive",
    slug: "test-npc",
    title: "Ein NPC",
    category: "npc",
    ...overrides,
  };
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

// commit* nimmt seit der editierbaren Vorschau (MarkdownImportPanel.tsx) ein
// *Edits-Objekt entgegen, das gegenüber dem geparsten Frontmatter gewinnt —
// diese Helfer bauen die "unverändert übernommen"-Variante, damit die
// bestehenden Tests weiterhin genau das committen, was auch im Frontmatter
// steht (siehe archiveMd/missionMd/characterMd oben/unten).
function archiveEdits(overrides: Partial<ArchiveImportEdits> = {}, body = "Inhalt."): ArchiveImportEdits {
  return {
    slug: "test-npc",
    title: "Ein NPC",
    tags: [],
    summary: null,
    bodyMarkdown: body,
    ownerSlug: null,
    attributeValues: {},
    referenceValues: {},
    ...overrides,
  };
}

describe("previewArchiveMarkdown", () => {
  it("parses a valid archive frontmatter without writing to the DB", async () => {
    const result = await previewArchiveMarkdown("npc.md", archiveMd());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kind).toBe("archive");
    expect(result.slug).toBe("test-npc");
    expect(result.title).toBe("Ein NPC");
    expect(result.category).toBe("npc");
    expect(result.slugTaken).toBe(false);

    const rows = await sql`SELECT id FROM archive_entries WHERE slug = 'test-npc'`;
    expect(rows).toHaveLength(0);
  });

  it("reports an error for missing type: archive", async () => {
    const result = await previewArchiveMarkdown("x.md", archiveMd({ type: "mission" }));
    expect(result.ok).toBe(false);
  });

  it("reports an error for a missing/invalid category (no folder fallback for uploads)", async () => {
    const result = await previewArchiveMarkdown("x.md", archiveMd({ category: "bogus" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Kategorie/);
  });

  it("flags an already-taken slug", async () => {
    await commitArchiveMarkdown("npc.md", archiveMd(), archiveEdits());

    const result = await previewArchiveMarkdown("npc.md", archiveMd());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slugTaken).toBe(true);
    expect(result.warnings.some((w) => w.includes("bereits vergeben"))).toBe(true);
  });
});

describe("commitArchiveMarkdown", () => {
  it("creates an archive entry with source_md and frontmatter populated", async () => {
    const result = await commitArchiveMarkdown(
      "npc.md",
      archiveMd({}, "Ein Text."),
      archiveEdits({}, "Ein Text."),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [row] = await sql<
      { title: string; category: string; source_md: string; frontmatter: Record<string, unknown> }[]
    >`SELECT title, category, source_md, frontmatter FROM archive_entries WHERE id = ${result.id}`;
    expect(row.title).toBe("Ein NPC");
    expect(row.category).toBe("npc");
    expect(row.source_md).toBe("Ein Text.");
    expect(row.frontmatter.slug).toBe("test-npc");
  });

  it("rejects a slug that already exists instead of overwriting it", async () => {
    const first = await commitArchiveMarkdown(
      "npc.md",
      archiveMd({ title: "Original" }),
      archiveEdits({ title: "Original" }),
    );
    expect(first.ok).toBe(true);

    const second = await commitArchiveMarkdown(
      "npc-2.md",
      archiveMd({ title: "Ueberschrieben" }),
      archiveEdits({ title: "Ueberschrieben" }),
    );
    expect(second.ok).toBe(false);

    const [row] = await sql<{ title: string }[]>`
      SELECT title FROM archive_entries WHERE slug = 'test-npc'
    `;
    expect(row.title).toBe("Original");
  });

  it("resolves a related_npcs reference to an already-existing archive entry", async () => {
    await commitArchiveMarkdown(
      "target.md",
      archiveMd({ slug: "target-npc", title: "Ziel-NPC" }),
      archiveEdits({ slug: "target-npc", title: "Ziel-NPC" }),
    );

    const result = await commitArchiveMarkdown(
      "source.md",
      archiveMd({
        slug: "source-location",
        title: "Ein Ort",
        category: "location",
        related_npcs: "target-npc",
      }),
      archiveEdits({
        slug: "source-location",
        title: "Ein Ort",
        referenceValues: { related_npcs: "target-npc" },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [link] = await sql<{ label: string; target_id: number }[]>`
      SELECT al.label, al.target_id FROM archive_links al WHERE al.source_id = ${result.id}
    `;
    expect(link.label).toBe("NPC");

    const [target] = await sql<{ id: number }[]>`
      SELECT id FROM archive_entries WHERE slug = 'target-npc'
    `;
    expect(link.target_id).toBe(target.id);
  });

  it("returns a warning instead of failing when a reference cannot be resolved", async () => {
    const result = await commitArchiveMarkdown(
      "x.md",
      archiveMd({ related_npcs: "does-not-exist" }),
      archiveEdits({ referenceValues: { related_npcs: "does-not-exist" } }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.some((w) => w.includes("does-not-exist"))).toBe(true);
  });
});

function missionMd(overrides: Record<string, string> = {}, body = "Beschreibung.") {
  const fm = {
    type: "mission",
    slug: "test-mission",
    title: "Test-Mission",
    ...overrides,
  };
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

function missionEdits(overrides: Partial<MissionImportEdits> = {}, body = "Beschreibung."): MissionImportEdits {
  return {
    slug: "test-mission",
    title: "Test-Mission",
    status: "active",
    startedAt: null,
    endedAt: null,
    tags: [],
    bodyMarkdown: body,
    ownerSlug: null,
    ...overrides,
  };
}

describe("commitMissionMarkdown", () => {
  it("creates a mission defaulting status to active", async () => {
    const result = await commitMissionMarkdown("m.md", missionMd(), missionEdits());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [row] = await sql<{ status: string; metadata: { body: string } }[]>`
      SELECT status, metadata FROM missions WHERE id = ${result.id}
    `;
    expect(row.status).toBe("active");
    expect(row.metadata.body).toContain("Beschreibung");
  });

  it("rejects an invalid status", async () => {
    const result = await previewMissionMarkdown("m.md", missionMd({ status: "bogus" }));
    expect(result.ok).toBe(false);
  });

  it("rejects a slug that already exists", async () => {
    await commitMissionMarkdown("m.md", missionMd(), missionEdits());
    const second = await commitMissionMarkdown(
      "m2.md",
      missionMd({ title: "Anders" }),
      missionEdits({ title: "Anders" }),
    );
    expect(second.ok).toBe(false);
  });
});

function characterMd(overrides: Record<string, string> = {}, body = "Biografie.") {
  const fm = {
    type: "character",
    slug: "test-char",
    name: "Test Charakter",
    ...overrides,
  };
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

function characterEdits(overrides: Partial<CharacterImportEdits> = {}, body = "Biografie."): CharacterImportEdits {
  return {
    slug: "test-char",
    name: "Test Charakter",
    status: "active",
    bodyMarkdown: body,
    portrait: null,
    rank: null,
    species: [],
    homeworld: null,
    age: null,
    affiliationFactions: [],
    affiliationShips: [],
    affiliationDivision: null,
    player: null,
    aliases: [],
    generation: [],
    tags: [],
    ...overrides,
  };
}

describe("commitCharacterMarkdown", () => {
  it("creates a character without assigning player_id (matches CLI ingest)", async () => {
    const result = await commitCharacterMarkdown("c.md", characterMd(), characterEdits());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [row] = await sql<{ player_id: number | null; status: string }[]>`
      SELECT player_id, status FROM characters WHERE id = ${result.id}
    `;
    expect(row.player_id).toBeNull();
    expect(row.status).toBe("active");
  });

  it("rejects an invalid status", async () => {
    const result = await previewCharacterMarkdown("c.md", characterMd({ status: "bogus" }));
    expect(result.ok).toBe(false);
  });

  it("rejects a slug that already exists", async () => {
    await commitCharacterMarkdown("c.md", characterMd(), characterEdits());
    const second = await commitCharacterMarkdown(
      "c2.md",
      characterMd({ name: "Anders" }),
      characterEdits({ name: "Anders" }),
    );
    expect(second.ok).toBe(false);
  });
});

function missionLogMd(overrides: Record<string, string> = {}, body = "Logtext.") {
  const fm = {
    type: "mission-log",
    title: "Ein Logeintrag",
    ...overrides,
  };
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

describe("previewMissionLogMarkdown", () => {
  it("resolves mission and author when both slugs exist", async () => {
    const mission = await insertMission({ title: "Testmission" });
    const character = await insertCharacter({ name: "Testcharakter" });

    const result = await previewMissionLogMarkdown(
      "log.md",
      missionLogMd({ mission: mission.slug, author: character.slug, session_nr: "3" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.missionTitle).toBe("Testmission");
    expect(result.authorName).toBe("Testcharakter");
    expect(result.sessionNr).toBe(3);
    expect(result.warnings).toEqual([]);
  });

  // Anders als scripts/ingest/missionLogs.ts (hartes Scheitern): unauflösbare
  // Mission/Autor brechen die Vorschau NICHT ab, damit die Administration sie
  // in der Carousel-Vorschau manuell nachwählen kann (siehe Kopfkommentar in
  // markdownImport.ts).
  it("does not fail when mission/author cannot be resolved, but reports warnings", async () => {
    const result = await previewMissionLogMarkdown(
      "log.md",
      missionLogMd({ mission: "does-not-exist", author: "does-not-exist-either" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.missionTitle).toBeNull();
    expect(result.authorName).toBeNull();
    expect(result.warnings.length).toBe(2);
  });

  it("reports an error for a missing title", async () => {
    const result = await previewMissionLogMarkdown("log.md", missionLogMd({ title: "" }));
    expect(result.ok).toBe(false);
  });
});

describe("commitMissionLogMarkdown", () => {
  function editsFor(
    mission: { slug: string },
    author: { slug: string },
    overrides: Partial<MissionLogImportEdits> = {},
  ): MissionLogImportEdits {
    return {
      title: "Ein Logeintrag",
      missionSlug: mission.slug,
      authorSlug: author.slug,
      logDate: null,
      sessionNr: 1,
      tags: [],
      bodyMarkdown: "Logtext.",
      ownerSlug: null,
      ...overrides,
    };
  }

  it("creates a mission log with a deterministic author-mission-session slug", async () => {
    const mission = await insertMission();
    const character = await insertCharacter();

    const result = await commitMissionLogMarkdown(
      "log.md",
      missionLogMd(),
      editsFor(mission, character, { sessionNr: 5 }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slug).toBe(`${character.slug}-${mission.slug}-5`);

    const [row] = await sql<{ mission_id: number; author_id: number; title: string }[]>`
      SELECT mission_id, author_id, title FROM mission_logs WHERE id = ${result.id}
    `;
    expect(row.mission_id).toBe(mission.id);
    expect(row.author_id).toBe(character.id);
    expect(row.title).toBe("Ein Logeintrag");
  });

  it("falls back to the author's player as owner when no ownerSlug is given", async () => {
    const player = await insertUser();
    const mission = await insertMission();
    const character = await insertCharacter({ playerId: player.id });

    const result = await commitMissionLogMarkdown(
      "log.md",
      missionLogMd(),
      editsFor(mission, character),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [row] = await sql<{ owner_user_id: number | null }[]>`
      SELECT owner_user_id FROM mission_logs WHERE id = ${result.id}
    `;
    expect(row.owner_user_id).toBe(player.id);
  });

  it("rejects an unresolvable mission slug", async () => {
    const character = await insertCharacter();
    const result = await commitMissionLogMarkdown(
      "log.md",
      missionLogMd(),
      editsFor({ slug: "does-not-exist" }, character),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an unresolvable author slug", async () => {
    const mission = await insertMission();
    const result = await commitMissionLogMarkdown(
      "log.md",
      missionLogMd(),
      editsFor(mission, { slug: "does-not-exist" }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a non-positive session number", async () => {
    const mission = await insertMission();
    const character = await insertCharacter();
    const result = await commitMissionLogMarkdown(
      "log.md",
      missionLogMd(),
      editsFor(mission, character, { sessionNr: 0 }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a duplicate author-mission-session combination", async () => {
    const mission = await insertMission();
    const character = await insertCharacter();
    const edits = editsFor(mission, character, { sessionNr: 7 });

    const first = await commitMissionLogMarkdown("log.md", missionLogMd(), edits);
    expect(first.ok).toBe(true);

    const second = await commitMissionLogMarkdown("log2.md", missionLogMd(), edits);
    expect(second.ok).toBe(false);
  });
});
