import { describe, it, expect } from "vitest";
import {
  applyAutolinks,
  getAutolinkTargets,
  renderContentHtml,
  resolveAllWikilinks,
  type AutolinkTarget,
} from "@/lib/autolink";
import { insertCharacter, insertMission } from "./helpers";

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
    const publicChar = await insertCharacter({ name: "Öffentlich", visibility: "public" });
    await insertCharacter({ name: "Privat", visibility: "private" });
    const mission = await insertMission({ title: "Eine Mission" });

    const targets = await getAutolinkTargets();

    const slugs = targets.map((t) => t.slug);
    expect(slugs).toContain(publicChar.slug);
    expect(slugs).toContain(mission.slug);
    expect(targets.find((t) => t.canonical === "Privat")).toBeUndefined();
  });

  it("excludes the given target from the result", async () => {
    const character = await insertCharacter({ name: "Ausgeschlossen", visibility: "public" });

    const targets = await getAutolinkTargets({
      type: "character",
      slug: character.slug,
    });

    expect(targets.find((t) => t.slug === character.slug)).toBeUndefined();
  });
});

describe("resolveAllWikilinks", () => {
  it("resolves a wikilink anchor to the target's real href", async () => {
    const character = await insertCharacter({ name: "Ziel Person", visibility: "public" });
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
});

describe("renderContentHtml", () => {
  it("renders markdown to HTML and resolves any [[wikilinks]] against the DB", async () => {
    const character = await insertCharacter({ name: "Verlinkte Person", visibility: "public" });

    const html = await renderContentHtml("Ein Verweis auf [[Verlinkte Person]].");

    expect(html).toContain(`href="/characters/${character.slug}"`);
  });
});
