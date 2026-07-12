import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import { searchFull, searchLive, buildSnippet, stripMarkdown } from "@/lib/search";
import { insertUser, insertCharacter, insertMission } from "./helpers";

describe("stripMarkdown", () => {
  it("strips code blocks, images, wikilinks, links and heading markers", () => {
    const md =
      "# Titel\n\n```\ncode block\n```\n\n`inline` und ![alt](bild.png) und [[Ziel|Alias]] und [Text](url) Ende.";
    expect(stripMarkdown(md)).toBe("Titel inline und alt und Alias und Text Ende.");
  });
});

describe("buildSnippet", () => {
  it("returns a centered excerpt around the first match", () => {
    const text = "Ein langer Text ".repeat(5) + "GESUCHT" + " weiterer Text".repeat(5);
    const result = buildSnippet(text, "GESUCHT", 10);
    expect(result).toContain("GESUCHT");
    expect(result?.startsWith("…")).toBe(true);
  });

  it("returns undefined when the query is not found", () => {
    expect(buildSnippet("Ein Text ohne Treffer", "xyz")).toBeUndefined();
  });
});

describe("searchLive", () => {
  it("matches public characters/missions by title, case-insensitively", async () => {
    await insertCharacter({ name: "Desmond Hobbes", visibility: "public" });
    await insertCharacter({ name: "Frederick Helben", visibility: "private" });
    await insertMission({ title: "Die Desmond-Mission" });

    const result = await searchLive("desmond");

    expect(result.map((r) => r.label).sort()).toEqual(
      ["Desmond Hobbes", "Die Desmond-Mission"].sort(),
    );
  });
});

describe("searchFull", () => {
  it("excludes open dialogues but matches other public archive entries by content", async () => {
    const user = await insertUser();
    await sql`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, visibility, dialogue_open, owner_user_id)
      VALUES ('offener-dialog', 'Raumschiff-Dialog', 'dialogue', '', '{}', '{}', NULL, 'public', TRUE, ${user.id})
    `;
    await sql`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, visibility, dialogue_open, owner_user_id)
      VALUES ('ein-artikel', 'Ein Artikel', 'location', 'Enthält das Wort Raumschiff im Text.', '{}', '{}', NULL, 'public', FALSE, ${user.id})
    `;

    const result = await searchFull("Raumschiff");

    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("ein-artikel");
    expect(result[0].snippet).toContain("Raumschiff");
  });

  it("annotates results the given user has already bookmarked", async () => {
    const character = await insertCharacter({
      name: "Bookmarked Character",
      visibility: "public",
    });
    const user = await insertUser();
    await sql`
      INSERT INTO content_follows (user_id, target_type, target_slug, bookmarked_at)
      VALUES (${user.id}, 'character', ${character.slug}, NOW())
    `;

    const result = await searchFull("Bookmarked", user.id);

    expect(result[0].saved).toBe(true);
  });

  it("does not mark results as saved for an anonymous search (no userId)", async () => {
    await insertCharacter({ name: "Anonymous Search Target", visibility: "public" });

    const result = await searchFull("Anonymous Search Target");

    expect(result[0].saved).toBeUndefined();
  });
});
