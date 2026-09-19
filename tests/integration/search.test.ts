import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import { searchFull, searchLive, buildSnippet, stripMarkdown } from "@/lib/search";
import { createDialogue } from "@/lib/dialoguesCore";
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
    await insertCharacter({ name: "Desmond Hobbes" });
    await insertCharacter({ name: "Frederick Helben", isDraft: true });
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
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, dialogue_open, owner_user_id)
      VALUES ('offener-dialog', 'Raumschiff-Dialog', 'dialogue', '', '{}', '{}', NULL, TRUE, ${user.id})
    `;
    await sql`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, dialogue_open, owner_user_id)
      VALUES ('ein-artikel', 'Ein Artikel', 'location', 'Enthält das Wort Raumschiff im Text.', '{}', '{}', NULL, FALSE, ${user.id})
    `;

    const result = await searchFull("Raumschiff", null);

    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("ein-artikel");
    expect(result[0].snippet).toContain("Raumschiff");
  });

  it("annotates results the given user has already bookmarked", async () => {
    const character = await insertCharacter({
      name: "Bookmarked Character",
      });
    const user = await insertUser();
    await sql`
      INSERT INTO content_follows (user_id, target_type, target_slug, bookmarked_at)
      VALUES (${user.id}, 'character', ${character.slug}, NOW())
    `;

    const result = await searchFull("Bookmarked", { userId: user.id, isGm: false });

    expect(result[0].saved).toBe(true);
  });

  it("does not mark results as saved for an anonymous search (no userId)", async () => {
    await insertCharacter({ name: "Anonymous Search Target" });

    const result = await searchFull("Anonymous Search Target", null);

    expect(result[0].saved).toBeUndefined();
  });
});

describe("searchFull – Gesprochenes", () => {
  it("findet eine Nachricht in einem offenen Gespräch und nennt den Sprecher", async () => {
    // Der Eintrag eines Gesprächs ist meist ein leerer Rahmen: der Inhalt
    // steckt in dialogue_messages. Bis v1.29.41 war er damit unauffindbar.
    const user = await insertUser();
    const kira = await insertCharacter({ name: "Kira" });
    const [entry] = await sql<{ id: number }[]>`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, dialogue_open, owner_user_id)
      VALUES ('kantine', 'Abend in der Kantine', 'dialogue', '', '{}', '{}', NULL, TRUE, ${user.id})
      RETURNING id
    `;
    await sql`
      INSERT INTO dialogue_messages (archive_entry_id, character_id, author_user_id, content, source_md)
      VALUES (${entry.id}, ${kira.id}, ${user.id}, '<p>Einen Raktajino, heiß.</p>', 'Einen Raktajino, heiß.')
    `;

    // Aus Sicht der Spielleitung: Ein LAUFENDES Gespräch gehört nur seinen
    // Teilnehmenden, und dieses hier hat keine eingetragenen (metadata '{}').
    // Geprüft wird die Darstellung des Treffers, nicht die Schranke davor —
    // die hat ihre eigenen Fälle weiter unten.
    const result = await searchFull("Raktajino", { userId: user.id, isGm: true });

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
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, dialogue_open, owner_user_id)
      VALUES ('lang', 'Langes Gespräch', 'dialogue', '', '{}', '{}', NULL, TRUE, ${user.id})
      RETURNING id
    `;
    for (const text of ["Warpkern eins", "Warpkern zwei", "Warpkern drei"]) {
      await sql`
        INSERT INTO dialogue_messages (archive_entry_id, author_user_id, content, source_md)
        VALUES (${entry.id}, ${user.id}, ${`<p>${text}</p>`}, ${text})
      `;
    }

    const result = await searchFull("Warpkern", { userId: user.id, isGm: true });
    expect(result.filter((r) => r.type === "dialogue_message")).toHaveLength(1);
  });

  it("übergeht gelöschte Nachrichten und Gespräche im Entwurf", async () => {
    const user = await insertUser();
    const [offen] = await sql<{ id: number }[]>`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, dialogue_open, is_draft, owner_user_id)
      VALUES ('geheim', 'Geheimes Gespräch', 'dialogue', '', '{}', '{}', NULL, TRUE, TRUE, ${user.id})
      RETURNING id
    `;
    const [sichtbar] = await sql<{ id: number }[]>`
      INSERT INTO archive_entries (slug, title, category, content, tags, metadata, source_md, dialogue_open, owner_user_id)
      VALUES ('offen', 'Offenes Gespräch', 'dialogue', '', '{}', '{}', NULL, TRUE, ${user.id})
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

    // Eine Nachricht erbt den Zustand ihres Gesprächs — ein Entwurf taucht
    // in der Suche nicht auf; die gelöschte fällt ohnehin weg. Gefragt wird
    // als Spielleitung, damit hier wirklich Entwurf und Löschung greifen und
    // nicht schon die Teilnehmer-Schranke für laufende Gespräche.
    expect(
      await searchFull("Tarnvorrichtung", { userId: user.id, isGm: true }),
    ).toHaveLength(0);
  });
});


// Ein laufendes Gespräch gehört seinen Teilnehmenden: /dialogues/[slug]
// antwortet allen anderen mit forbidden(). Die Volltextsuche ist dagegen ohne
// Anmeldung erreichbar — sie muss dieselbe Schranke ziehen, sonst liegt der
// Wortlaut eines laufenden Gesprächs für jede Person offen, die danach sucht.
describe("searchFull und laufende Gespräche", () => {
  const GEHEIM = "Zinnoberkiesel";

  async function laufendesGespraech() {
    const a = await insertUser();
    const b = await insertUser();
    const fremde = await insertUser();
    const charA = await insertCharacter({ playerId: a.id, name: "Alpha Eins" });
    const charB = await insertCharacter({ playerId: b.id, name: "Beta Zwei" });

    const dialogue = await createDialogue({
      title: "Vertrauliche Besprechung",
      ownSpeaker: { kind: "character", id: charA.id },
      partners: [{ kind: "character", id: charB.id }],
      authorUserId: a.id,
      setting: null,
      locationSlug: null,
      logDate: null,
      tags: [],
      bodyMarkdown: `Das Geheimwort lautet ${GEHEIM}.`,
      subscribeSelf: true,
    });

    return { a, b, fremde, dialogue };
  }

  it("verschweigt den Wortlaut gegenüber nicht angemeldeten Personen", async () => {
    await laufendesGespraech();

    expect(await searchFull(GEHEIM, null)).toEqual([]);
  });

  it("verschweigt ihn auch gegenüber angemeldeten Unbeteiligten", async () => {
    const { fremde } = await laufendesGespraech();

    expect(
      await searchFull(GEHEIM, { userId: fremde.id, isGm: false }),
    ).toEqual([]);
  });

  it("zeigt ihn beiden Teilnehmenden", async () => {
    const { a, b } = await laufendesGespraech();

    for (const teilnehmer of [a, b]) {
      const treffer = await searchFull(GEHEIM, {
        userId: teilnehmer.id,
        isGm: false,
      });
      expect(treffer).toHaveLength(1);
      expect(treffer[0].snippet).toContain(GEHEIM);
    }
  });

  // Die Spielleitung darf jedes Gespräch öffnen (gm.access, siehe das
  // forbidden()-Gate) — für sie ändert sich durch die Schranke nichts.
  it("zeigt ihn der Spielleitung", async () => {
    const { fremde } = await laufendesGespraech();

    const treffer = await searchFull(GEHEIM, {
      userId: fremde.id,
      isGm: true,
    });

    expect(treffer).toHaveLength(1);
  });

  // Nach dem Abschluss ist das Gespräch ein gewöhnlicher, öffentlich lesbarer
  // Eintrag — dann darf die Suche seinen Verlauf auch zeigen.
  it("zeigt ihn nach dem Abschluss des Gesprächs allen", async () => {
    const { dialogue } = await laufendesGespraech();
    await sql`
      UPDATE archive_entries SET dialogue_open = false WHERE slug = ${dialogue.slug}
    `;

    const treffer = await searchFull(GEHEIM, null);

    expect(treffer).toHaveLength(1);
  });
});
