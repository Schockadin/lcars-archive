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
});
