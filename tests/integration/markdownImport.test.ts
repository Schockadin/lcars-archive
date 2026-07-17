import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  previewArchiveMarkdown,
  commitArchiveMarkdown,
  previewMissionMarkdown,
  commitMissionMarkdown,
  previewCharacterMarkdown,
  commitCharacterMarkdown,
} from "@/lib/markdownImport";

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
    await commitArchiveMarkdown("npc.md", archiveMd());

    const result = await previewArchiveMarkdown("npc.md", archiveMd());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slugTaken).toBe(true);
    expect(result.warnings.some((w) => w.includes("bereits vergeben"))).toBe(true);
  });
});

describe("commitArchiveMarkdown", () => {
  it("creates an archive entry with source_md and frontmatter populated", async () => {
    const result = await commitArchiveMarkdown("npc.md", archiveMd({}, "Ein Text."));
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
    const first = await commitArchiveMarkdown("npc.md", archiveMd({ title: "Original" }));
    expect(first.ok).toBe(true);

    const second = await commitArchiveMarkdown(
      "npc-2.md",
      archiveMd({ title: "Ueberschrieben" }),
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
    );

    const result = await commitArchiveMarkdown(
      "source.md",
      archiveMd({
        slug: "source-location",
        title: "Ein Ort",
        category: "location",
        related_npcs: "target-npc",
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

describe("commitMissionMarkdown", () => {
  it("creates a mission defaulting status to active", async () => {
    const result = await commitMissionMarkdown("m.md", missionMd());
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
    await commitMissionMarkdown("m.md", missionMd());
    const second = await commitMissionMarkdown("m2.md", missionMd({ title: "Anders" }));
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

describe("commitCharacterMarkdown", () => {
  it("creates a character without assigning player_id (matches CLI ingest)", async () => {
    const result = await commitCharacterMarkdown("c.md", characterMd());
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
    await commitCharacterMarkdown("c.md", characterMd());
    const second = await commitCharacterMarkdown("c2.md", characterMd({ name: "Anders" }));
    expect(second.ok).toBe(false);
  });
});
