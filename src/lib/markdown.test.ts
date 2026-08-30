import { describe, it, expect } from "vitest";
import { markdownToHtml } from "./markdown";

describe("markdownToHtml", () => {
  it("strips a javascript: URL from a link instead of rendering it live", async () => {
    const html = await markdownToHtml("[click me](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('<a href="">click me</a>');
  });

  it("strips a javascript: URL from an image src", async () => {
    const html = await markdownToHtml("![alt](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('src=""');
  });

  it("still allows ordinary http(s) links through unchanged", async () => {
    const html = await markdownToHtml("[Beispiel](https://example.com)");
    expect(html).toContain('href="https://example.com"');
  });

  it("still resolves wikilinks to the internal wikilink:// scheme", async () => {
    const html = await markdownToHtml("[[Zielartikel]]");
    expect(html).toContain('href="wikilink://Zielartikel"');
  });

  it("still lets rehype-slug assign heading ids (not clobber-prefixed)", async () => {
    const html = await markdownToHtml("# Ein Titel");
    expect(html).toContain('id="ein-titel"');
  });

  // Block-Konstrukte: sichern, dass die Pipeline (remark-Plugins für deutsche
  // Anführungszeichen, Wikilinks und Timeline-Anker greifen alle in den Baum
  // ein) die gewöhnliche Markdown-Blockstruktur unangetastet lässt — Absätze,
  // Listen und Tabellen entstehen als eigene Elemente.
  it("renders blank-line-separated blocks as separate paragraphs", async () => {
    const html = await markdownToHtml("Erster Absatz.\n\nZweiter Absatz.");
    expect(html).toContain("<p>Erster Absatz.</p>");
    expect(html).toContain("<p>Zweiter Absatz.</p>");
  });

  it("renders unordered lists as ul/li", async () => {
    const html = await markdownToHtml("- eins\n- zwei");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>eins</li>");
    expect(html).toContain("<li>zwei</li>");
  });

  it("renders ordered lists as ol/li", async () => {
    const html = await markdownToHtml("1. eins\n2. zwei");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>eins</li>");
  });

  it("renders nested lists as a ul inside the parent li", async () => {
    const html = await markdownToHtml("- oben\n  - darunter");
    expect(html).toMatch(/<li>oben\n<ul>\n<li>darunter<\/li>/);
  });

  it("renders GFM tables", async () => {
    const html = await markdownToHtml("| A | B |\n| - | - |\n| 1 | 2 |");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<td>1</td>");
  });
});
