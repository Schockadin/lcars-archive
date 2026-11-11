import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSql } = vi.hoisted(() => ({ mockSql: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: mockSql }));

const { renderContentHtml, resolveAllWikilinks, resolvePublicWikilinks } =
  await import("@/lib/autolink");
const { markdownToHtml } = await import("@/lib/markdown");

beforeEach(() => {
  mockSql.mockImplementation((strings: TemplateStringsArray) => {
    const query = strings.join(" ");
    if (query.includes("FROM characters")) {
      return Promise.resolve([
        { slug: "t-mok", name: "T'Mok", aliases: null },
      ]);
    }
    return Promise.resolve([]);
  });
});

describe("Wikilinks mit Apostroph im Ziel", () => {
  it.each([
    "T&#x27;Mok",
    "T&#39;Mok",
    "T&apos;Mok",
    "T&amp;#x27;Mok",
    "T&amp;apos;Mok",
  ])(
    "löst das gespeicherte HTML-Ziel %s über den Charakter-Slug auf",
    async (encodedName) => {
      const html = `<a href="wikilink://${encodedName}">T'Mok</a>`;

      const resolved = await resolveAllWikilinks(html);
      expect(resolved).toContain('href="/characters/t-mok"');
      expect(resolved).not.toContain("lcars-wikilink--missing");
    },
  );

  it("löst [[T'Mok]] in der öffentlichen Vorschau auf", async () => {
    const html = await resolvePublicWikilinks(
      await markdownToHtml("[[T'Mok]]"),
    );

    expect(html).toContain('href="/characters/t-mok"');
    expect(html).not.toContain("lcars-wikilink--missing");
  });

  it("löst [[T'Mok]] beim Rendern des gespeicherten Inhalts auf", async () => {
    const html = await renderContentHtml("[[T'Mok]]");

    expect(html).toContain('href="/characters/t-mok"');
    expect(html).not.toContain("lcars-wikilink--missing");
  });
});
