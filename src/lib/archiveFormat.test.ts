import { describe, it, expect } from "vitest";
import {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  ARCHIVE_CATEGORIES,
  isArchiveCategory,
  archiveTitle,
} from "./archiveFormat";

describe("CATEGORY_CONFIG / CATEGORY_ORDER", () => {
  it("has a config entry for every category in CATEGORY_ORDER", () => {
    for (const category of CATEGORY_ORDER) {
      expect(CATEGORY_CONFIG[category]).toBeDefined();
      expect(CATEGORY_CONFIG[category].label).toBeTruthy();
      expect(CATEGORY_CONFIG[category].plural).toBeTruthy();
      expect(CATEGORY_CONFIG[category].color).toBeTruthy();
    }
  });

  it("ARCHIVE_CATEGORIES matches CATEGORY_ORDER", () => {
    expect(ARCHIVE_CATEGORIES).toEqual(CATEGORY_ORDER);
  });

  it("includes the dialogue category", () => {
    expect(CATEGORY_ORDER).toContain("dialogue");
  });
});

describe("isArchiveCategory", () => {
  it("returns true for a known category", () => {
    expect(isArchiveCategory("person")).toBe(true);
  });

  it("returns false for an unknown string", () => {
    expect(isArchiveCategory("not-a-category")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isArchiveCategory("")).toBe(false);
  });
});

describe("archiveTitle", () => {
  it("uses the entry's own title for non-dialogue categories", () => {
    expect(
      archiveTitle({
        category: "location",
        title: "Deep Space 9",
        metadata: { setting: null },
      }),
    ).toBe("Deep Space 9");
  });

  it("uses the dialogue's own title", () => {
    expect(
      archiveTitle({
        category: "dialogue",
        title: "Streit in der Messe",
        metadata: { setting: "Ops" },
      }),
    ).toBe("Streit in der Messe");
  });

  it("falls back to 'Gespräch auf <setting>' for dialogues without an own title", () => {
    expect(
      archiveTitle({
        category: "dialogue",
        title: "   ",
        metadata: { setting: "Ops" },
      }),
    ).toBe("Gespräch auf Ops");
  });

  it("falls back to plain 'Gespräch' for dialogues without title or setting", () => {
    expect(
      archiveTitle({
        category: "dialogue",
        title: "",
        metadata: { setting: null },
      }),
    ).toBe("Gespräch");
  });
});
