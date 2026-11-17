import { describe, expect, it } from "vitest";
import { splitPrivate, stripStoredContentLinkPreviews } from "./publicContent";

describe("public content boundaries", () => {
  it("excludes the first private marker and everything after it", () => {
    expect(splitPrivate("Public.\n<!-- private -->\nSecret.\n<!-- private -->\nMore.")).toBe("Public.");
  });

  it("removes legacy machine previews even for missing or renamed routes", () => {
    const html = '<a href="/missions/old" data-preview="Secret" title="Secret" class="link">Mission</a>';
    expect(stripStoredContentLinkPreviews(html)).toBe(
      '<a href="/missions/old" class="link">Mission</a>',
    );
  });

  it("handles attribute casing, spacing and legacy quote forms", () => {
    const html = "<A TITLE = 'Secret' HREF='/archive/old' DATA-PREVIEW = Secret>Entry</A>";
    expect(stripStoredContentLinkPreviews(html)).toBe(
      "<A HREF='/archive/old'>Entry</A>",
    );
  });

  it("preserves ordinary link titles without generated previews", () => {
    const html = '<a href="/tutorial" title="Tutorial">Help</a>';
    expect(stripStoredContentLinkPreviews(html)).toBe(html);
  });
});
