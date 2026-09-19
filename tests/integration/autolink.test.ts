import { describe, it, expect } from "vitest";
import {
  applyAutolinks,
  autoLinkMarkdown,
  getAutolinkTargets,
  renderContentHtml,
  resolveAllWikilinks,
  resolvePublicWikilinks,
  type AutolinkTarget,
} from "@/lib/autolink";
import { createArchiveEntry } from "@/lib/archive";
import sql from "@/lib/db";
import { insertCharacter, insertMission, insertUser } from "./helpers";

describe("applyAutolinks", () => {
  const targets: AutolinkTarget[] = [
    {
      type: "character",
      slug: "desmond-hobbes",
      href: "/characters/desmond-hobbes",
      canonical: "Desmond Hobbes",
      phrases: ["Desmond Hobbes", "Desmond"],
    },
    {
      type: "mission",
      slug: "die-mission",
      href: "/missions/die-mission",
      canonical: "Die Mission",
      phrases: ["Die Mission"],
    },
  ];

  it("wraps a matched phrase in a wikilink to its canonical name", () => {
    const result = applyAutolinks("Ein Treffen mit Desmond Hobbes.", targets);

    expect(result.sourceMd).toBe("Ein Treffen mit [[Desmond Hobbes]].");
    expect(result.matches).toEqual([
      {
        type: "character",
        canonical: "Desmond Hobbes",
        href: "/characters/desmond-hobbes",
        matchedText: "Desmond Hobbes",
      },
    ]);
  });

  it("uses the alias form when the matched alias differs from the canonical name", () => {
    const result = applyAutolinks("Wir trafen Desmond gestern.", targets);

    expect(result.sourceMd).toBe("Wir trafen [[Desmond Hobbes|Desmond]] gestern.");
  });

  it("does not link phrases inside code blocks, images, or existing links", () => {
    const md =
      "`Desmond Hobbes` und ![Desmond Hobbes](bild.png) und [Desmond Hobbes](/x) bleiben unverändert.";
    const result = applyAutolinks(md, targets);

    expect(result.sourceMd).toBe(md);
    expect(result.matches).toEqual([]);
  });

  it("returns the text unchanged when there are no targets", () => {
    const result = applyAutolinks("Kein Ziel hier.", []);
    expect(result).toEqual({ sourceMd: "Kein Ziel hier.", matches: [] });
  });
});

describe("getAutolinkTargets", () => {
  it("only includes public characters and public non-dialogue archive entries, plus all missions", async () => {
    const publicChar = await insertCharacter({ name: "Öffentlich" });
    await insertCharacter({ name: "Privat", isDraft: true });
    const mission = await insertMission({ title: "Eine Mission" });

    const targets = await getAutolinkTargets();

    const slugs = targets.map((t) => t.slug);
    expect(slugs).toContain(publicChar.slug);
    expect(slugs).toContain(mission.slug);
    expect(targets.find((t) => t.canonical === "Privat")).toBeUndefined();
  });

  // Aliase eines Datenbank-Eintrags sind wie die eines Charakters weitere
  // Namen, unter denen der Eintrag im Fließtext erkannt werden soll.
  it("matches an archive entry under its metadata aliases", async () => {
    const user = await insertUser();
    const entry = await createArchiveEntry({
      title: "Deep Space 12",
      category: "location",
      tags: [],
      summary: null,
      aliases: ["DS12"],
      attributeValues: {},
      referenceValues: {},
      bodyMarkdown: "",
      ownerUserId: user.id,
      isDraft: false,
    });

    const targets = await getAutolinkTargets();
    const target = targets.find((t) => t.slug === entry.slug);

    expect(target?.phrases).toEqual(["Deep Space 12", "DS12"]);
    expect(applyAutolinks("Zurück auf DS12.", targets).sourceMd).toBe(
      "Zurück auf [[Deep Space 12|DS12]].",
    );
  });

  it("excludes the given target from the result", async () => {
    const character = await insertCharacter({ name: "Ausgeschlossen" });

    const targets = await getAutolinkTargets({
      type: "character",
      slug: character.slug,
    });

    expect(targets.find((t) => t.slug === character.slug)).toBeUndefined();
  });
});

describe("resolveAllWikilinks", () => {
  it("resolves a wikilink anchor to the target's real href", async () => {
    const character = await insertCharacter({ name: "Ziel Person" });
    const html = `<a href="wikilink://Ziel Person">Ziel Person</a>`;

    const result = await resolveAllWikilinks(html);

    expect(result).toBe(
      `<a href="/characters/${character.slug}" class="lcars-wikilink">Ziel Person</a>`,
    );
  });

  it("replaces an unresolvable wikilink with a missing-target placeholder", async () => {
    const html = `<a href="wikilink://Nicht Vorhanden">Nicht Vorhanden</a>`;

    const result = await resolveAllWikilinks(html);

    expect(result).toContain("lcars-wikilink--missing");
    expect(result).toContain("Nicht Vorhanden");
  });

  it("returns the input unchanged when there is no wikilink to resolve", async () => {
    const html = "<p>Ganz normaler Text.</p>";
    expect(await resolveAllWikilinks(html)).toBe(html);
  });

  it("schreibt das Ziel escaped in den Hinweis des Platzhalters", async () => {
    // Das Ziel steht in einem title-Attribut des gespeicherten HTML; ein
    // Anführungszeichen darin dürfte es nicht beenden.
    const html = `<a href="wikilink://${encodeURIComponent('a" x')}">a" x</a>`;

    const result = await resolveAllWikilinks(html);

    expect(result).toContain("Kein Eintrag gefunden: a&quot; x");
    expect(result).not.toContain('gefunden: a" x"');
  });
});

describe("renderContentHtml", () => {
  it("renders markdown to HTML and resolves any [[wikilinks]] against the DB", async () => {
    const character = await insertCharacter({ name: "Verlinkte Person" });

    const html = await renderContentHtml("Ein Verweis auf [[Verlinkte Person]].");

    expect(html).toContain(`href="/characters/${character.slug}"`);
  });
});

describe("resolveAllWikilinks und gelöschte Inhalte", () => {
  it("behandelt ein gelöschtes Ziel als nicht gefunden", async () => {
    const character = await insertCharacter({ name: "Weggeräumt" });
    await sql`UPDATE characters SET deleted_at = NOW() WHERE id = ${character.id}`;

    const result = await resolveAllWikilinks(
      `<a href="wikilink://Weggeräumt">Weggeräumt</a>`,
    );

    // Die Detailseite lädt nur mit deleted_at IS NULL — ein Link dorthin
    // liefe ins Leere.
    expect(result).toContain("lcars-wikilink--missing");
    expect(result).not.toContain(character.slug);
  });
});

describe("resolvePublicWikilinks", () => {
  it("löst öffentliche Ziele auf", async () => {
    const character = await insertCharacter({ name: "Öffentlich Bekannt" });

    const result = await resolvePublicWikilinks(
      `<a href="wikilink://Öffentlich Bekannt">Öffentlich Bekannt</a>`,
    );

    expect(result).toBe(
      `<a href="/characters/${character.slug}" class="lcars-wikilink">Öffentlich Bekannt</a>`,
    );
  });

  it("verrät keine Entwürfe — die Vorschau ist ohne Anmeldung aufrufbar", async () => {
    await insertCharacter({ name: "Geheimer Entwurf", isDraft: true });

    const result = await resolvePublicWikilinks(
      `<a href="wikilink://Geheimer Entwurf">Geheimer Entwurf</a>`,
    );

    expect(result).toContain("lcars-wikilink--missing");
  });

  it("fragt die DB gar nicht erst, wenn kein Wikilink im HTML steht", async () => {
    const html = "<p>Nichts zu tun.</p>";
    expect(await resolvePublicWikilinks(html)).toBe(html);
  });
});

// Der Fehler: Ein von Hand getipptes [[Ziel]] gehört für applyAutolinks zu den
// geschützten Bereichen und steht deshalb nie in dessen matches — es blieb
// beim Speichern MIT dem Haken „Automatisch verlinken" als toter
// <a href="wikilink://Ziel"> stehen. Ohne den Haken lief derselbe Text über
// renderContentHtml und wurde korrekt aufgelöst.
describe("autoLinkMarkdown und von Hand gesetzte Wikilinks", () => {
  it("löst ein [[Ziel]] auf, das sonst nirgends im Text steht", async () => {
    const character = await insertCharacter({ name: "Handverlinkt" });

    const { sourceMd, html } = await autoLinkMarkdown(
      "Ein Verweis auf [[Handverlinkt]].",
    );

    // Der Quelltext bleibt, wie er getippt wurde — nur das HTML wird aufgelöst.
    expect(sourceMd).toBe("Ein Verweis auf [[Handverlinkt]].");
    expect(html).toContain(`href="/characters/${character.slug}"`);
    expect(html).toContain("lcars-wikilink");
    expect(html).not.toContain("wikilink://");
  });

  it("löst auch den Alias-Fall [[Ziel|Text]] auf", async () => {
    const character = await insertCharacter({ name: "Handverlinkt" });

    const { html } = await autoLinkMarkdown(
      "Ein Verweis auf [[Handverlinkt|die Person]].",
    );

    expect(html).toContain(`href="/characters/${character.slug}"`);
    expect(html).toContain(">die Person</a>");
  });

  it("löst ein [[Ziel]] auf, das nur als Slug geschrieben ist", async () => {
    const character = await insertCharacter({
      name: "Slug Person",
      slug: "slug-person",
    });

    const { html } = await autoLinkMarkdown("Siehe [[slug-person]].");

    expect(html).toContain(`href="/characters/${character.slug}"`);
  });

  it("löst ein [[Ziel]] auf, das ein Zweitname des Eintrags ist", async () => {
    const author = await insertUser();
    // Im Fließtext verlinkt das Autolinking den Zweitnamen längst — in
    // Klammern gesetzt galt derselbe Name bisher als „nicht gefunden".
    const entry = await createArchiveEntry({
      title: "Klingonen",
      category: "other",
      tags: [],
      summary: null,
      aliases: ["Klingonisches Reich"],
      attributeValues: {},
      referenceValues: {},
      bodyMarkdown: "Ein Volk.",
      ownerUserId: author.id,
      isDraft: false,
    });

    const { html } = await autoLinkMarkdown(
      "Das [[Klingonisches Reich]] schweigt.",
    );

    expect(html).toContain(`href="/archive/${entry.slug}"`);
    expect(html).not.toContain("lcars-wikilink--missing");
  });

  it("markiert ein unauffindbares Ziel als nicht gefunden statt als toten Link", async () => {
    const { html } = await autoLinkMarkdown("Bericht über [[Gibt Es Nicht]].");

    expect(html).toContain("lcars-wikilink--missing");
    expect(html).not.toContain("wikilink://");
  });

  it("verlinkt daneben weiterhin freie Erwähnungen automatisch", async () => {
    const character = await insertCharacter({ name: "Doppelt Genannt" });

    const { sourceMd, html } = await autoLinkMarkdown(
      "[[Doppelt Genannt]] kam, Doppelt Genannt ging.",
    );

    // Die freie Erwähnung wird zur Marke, die bereits gesetzte bleibt, wie
    // sie ist — und beide führen auf dieselbe Seite.
    expect(sourceMd).toBe(
      "[[Doppelt Genannt]] kam, [[Doppelt Genannt]] ging.",
    );
    expect(
      html.match(new RegExp(`href="/characters/${character.slug}"`, "g")),
    ).toHaveLength(2);
  });
});
