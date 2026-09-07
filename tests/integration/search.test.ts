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

describe("searchFull – Gesprochenes", () => {
  it("findet eine Nachricht in einem offenen Gespräch und nennt den Sprecher", async () => {
    // Der Eintrag eines Gesprächs ist meist ein leerer Rahmen: der Inhalt
    // steckt in dialogue_messages. Bis v1.29.41 war er damit unauffindbar.
    const user = await insertUser();
    const kira = await insertCharacter({ name: "Kira", visibility: "public" });
    const [entry] = await sql<{ id: number }[]>`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, visibility, dialogue_open, owner_user_id)
      VALUES ('kantine', 'Abend in der Kantine', 'dialogue', '', '{}', '{}', NULL, 'public', TRUE, ${user.id})
      RETURNING id
    `;
    await sql`
      INSERT INTO dialogue_messages (archive_entry_id, character_id, author_user_id, content, source_md)
      VALUES (${entry.id}, ${kira.id}, ${user.id}, '<p>Einen Raktajino, heiß.</p>', 'Einen Raktajino, heiß.')
    `;

    const result = await searchFull("Raktajino");

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("dialogue_message");
    expect(result[0].label).toContain("Kira");
    expect(result[0].label).toContain("Abend in der Kantine");
    // Offene Gespräche liegen unter /dialogues, nicht /archive.
    expect(result[0].href).toContain("/dialogues/kantine");
    expect(result[0].snippet).toContain("Raktajino");
  });

  it("zeigt je Gespräch höchstens eine Nachricht", async () => {
    // Ein langes Gespräch mit zwanzig Treffern würde sonst die ganze Liste
    // füllen — die beste Nachricht steht für das Gespräch.
    const user = await insertUser();
    const [entry] = await sql<{ id: number }[]>`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, visibility, dialogue_open, owner_user_id)
      VALUES ('lang', 'Langes Gespräch', 'dialogue', '', '{}', '{}', NULL, 'public', TRUE, ${user.id})
      RETURNING id
    `;
    for (const text of ["Warpkern eins", "Warpkern zwei", "Warpkern drei"]) {
      await sql`
        INSERT INTO dialogue_messages (archive_entry_id, author_user_id, content, source_md)
        VALUES (${entry.id}, ${user.id}, ${`<p>${text}</p>`}, ${text})
      `;
    }

    const result = await searchFull("Warpkern");
    expect(result.filter((r) => r.type === "dialogue_message")).toHaveLength(1);
  });

  it("übergeht gelöschte Nachrichten und nicht öffentliche Gespräche", async () => {
    const user = await insertUser();
    const [offen] = await sql<{ id: number }[]>`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, visibility, dialogue_open, owner_user_id)
      VALUES ('geheim', 'Geheimes Gespräch', 'dialogue', '', '{}', '{}', NULL, 'private', TRUE, ${user.id})
      RETURNING id
    `;
    const [sichtbar] = await sql<{ id: number }[]>`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, visibility, dialogue_open, owner_user_id)
      VALUES ('offen', 'Offenes Gespräch', 'dialogue', '', '{}', '{}', NULL, 'public', TRUE, ${user.id})
      RETURNING id
    `;
    await sql`
      INSERT INTO dialogue_messages (archive_entry_id, author_user_id, content, source_md)
      VALUES (${offen.id}, ${user.id}, '<p>Tarnvorrichtung aktiv.</p>', 'Tarnvorrichtung aktiv.')
    `;
    await sql`
      INSERT INTO dialogue_messages (archive_entry_id, author_user_id, content, source_md, deleted_at)
      VALUES (${sichtbar.id}, ${user.id}, '<p>Tarnvorrichtung defekt.</p>', 'Tarnvorrichtung defekt.', NOW())
    `;

    // Eine Nachricht erbt die Sichtbarkeit ihres Gesprächs; die gelöschte
    // fällt ohnehin weg.
    expect(await searchFull("Tarnvorrichtung")).toHaveLength(0);
  });
});
