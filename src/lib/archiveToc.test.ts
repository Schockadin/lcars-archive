import { describe, expect, it } from "vitest";
import { ARCHIVE_REFERENCES_ID, buildArchiveToc } from "./archiveToc";

describe("buildArchiveToc", () => {
  it("adds anchors for h2 and h3 headings and always finishes with references", () => {
    const result = buildArchiveToc(
      "<h2>Über die <em>Station</em></h2><h3>Geschichte</h3>",
    );

    expect(result.headings).toEqual([
      { id: "archive-uber-die-station", text: "Über die Station" },
      { id: "archive-geschichte", text: "Geschichte" },
      { id: ARCHIVE_REFERENCES_ID, text: "Verweise" },
    ]);
    expect(result.html).toContain('id="archive-uber-die-station"');
    expect(result.html).toContain('id="archive-geschichte"');
  });

  it("keeps unique existing ids and disambiguates duplicate headings", () => {
    const result = buildArchiveToc(
      '<h2 id="intro">Einleitung</h2><h2 id="intro">Einleitung</h2>',
    );

    expect(result.headings.slice(0, 2)).toEqual([
      { id: "intro", text: "Einleitung" },
      { id: "intro-2", text: "Einleitung" },
    ]);
    expect(result.html).toContain('<h2 id="intro-2">');
  });

  it("includes the references jump target even when the entry has no headings", () => {
    const result = buildArchiveToc("<p>Nur Fließtext</p>");

    expect(result.headings).toEqual([
      { id: ARCHIVE_REFERENCES_ID, text: "Verweise" },
    ]);
    expect(result.html).toBe("<p>Nur Fließtext</p>");
  });
});
